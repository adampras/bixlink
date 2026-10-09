CREATE TABLE public.bix_nft_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stake_id uuid NOT NULL UNIQUE REFERENCES public.stakes(id),
  serial bigserial,
  package_id text NOT NULL,
  tier text NOT NULL,
  value_usd numeric NOT NULL,
  lock_days integer NOT NULL,
  status text NOT NULL DEFAULT 'minted',
  sale_price_usd numeric,
  sale_bix numeric,
  sale_requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bix_nft_status_chk CHECK (status IN ('minted','redeemable','sale_pending','sold','burned')),
  CONSTRAINT bix_nft_tier_chk CHECK (tier IN ('COMMON','RARE','EPIC','LEGENDARY','MYTHIC'))
);
GRANT SELECT ON public.bix_nft_cards TO authenticated;
GRANT ALL ON public.bix_nft_cards TO service_role;
ALTER TABLE public.bix_nft_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner reads NFT cards" ON public.bix_nft_cards FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_nft_tier(p_usd numeric, p_days integer) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN s >= 8 THEN 'MYTHIC' WHEN s >= 6 THEN 'LEGENDARY' WHEN s >= 4 THEN 'EPIC' WHEN s >= 2 THEN 'RARE' ELSE 'COMMON' END
  FROM (SELECT (CASE WHEN p_usd >= 10000 THEN 4 WHEN p_usd >= 3000 THEN 3 WHEN p_usd >= 500 THEN 2 WHEN p_usd >= 100 THEN 1 ELSE 0 END)
             + (CASE WHEN p_days >= 360 THEN 4 WHEN p_days >= 180 THEN 3 WHEN p_days >= 90 THEN 2 WHEN p_days >= 60 THEN 1 ELSE 0 END) AS s) x
$$;

CREATE OR REPLACE FUNCTION public.bix_mint_stake_nft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.bix_nft_cards (user_id, stake_id, package_id, tier, value_usd, lock_days)
    VALUES (NEW.user_id, NEW.id, NEW.package_id, public.bix_nft_tier(NEW.amount_usd, NEW.lock_days), NEW.amount_usd, NEW.lock_days)
    ON CONFLICT (stake_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bix_mint_stake_nft AFTER INSERT OR UPDATE OF status ON public.stakes FOR EACH ROW EXECUTE FUNCTION public.bix_mint_stake_nft();

INSERT INTO public.bix_nft_cards (user_id, stake_id, package_id, tier, value_usd, lock_days)
SELECT user_id, id, package_id, public.bix_nft_tier(amount_usd, lock_days), amount_usd, lock_days FROM public.stakes WHERE status IN ('active','completed')
ON CONFLICT (stake_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bix_unstake(p_stake uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE s public.stakes%ROWTYPE; v_days numeric; v_pct numeric; v_refund numeric; v_nft boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vusdt' || auth.uid()::text));
  SELECT * INTO s FROM public.stakes WHERE id = p_stake AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stake not found'; END IF;
  IF s.status NOT IN ('active','completed') THEN RAISE EXCEPTION 'This stake cannot be unstaked'; END IF;
  v_days := EXTRACT(EPOCH FROM (now() - COALESCE(s.activated_at, s.created_at))) / 86400;
  v_pct := public.bix_unstake_penalty(v_days, s.lock_days);
  v_refund := round(s.amount_usd * (1 - v_pct/100), 2);
  IF v_days >= s.lock_days AND EXISTS (SELECT 1 FROM public.bix_nft_cards WHERE stake_id = s.id AND status = 'minted') THEN
    -- Contract completed: principal is returned as the NFT card value instead of USDT.
    UPDATE public.bix_nft_cards SET status = 'redeemable' WHERE stake_id = s.id;
    v_refund := 0; v_nft := true;
  ELSE
    UPDATE public.bix_nft_cards SET status = 'burned' WHERE stake_id = s.id AND status = 'minted';
  END IF;
  UPDATE public.stakes SET status='unstaked', unstaked_at=now(), penalty_pct=v_pct, refund_usd=v_refund WHERE id = s.id;
  RETURN jsonb_build_object('penalty_pct', v_pct, 'refund_usd', v_refund, 'nft', v_nft);
END $function$;

CREATE OR REPLACE FUNCTION public.bix_nft_sell(p_card uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bix_nft_cards%ROWTYPE; v_price numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.bix_nft_cards WHERE id = p_card AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NFT card not found'; END IF;
  IF c.status <> 'redeemable' THEN RAISE EXCEPTION 'This card can be sold only after its contract is completed'; END IF;
  v_price := COALESCE(NULLIF((SELECT value->>'priceUsd' FROM public.app_settings WHERE key = 'bix_market'), '')::numeric, 0.84291);
  IF v_price <= 0 THEN RAISE EXCEPTION 'BIX price unavailable'; END IF;
  UPDATE public.bix_nft_cards SET status = 'sale_pending', sale_price_usd = v_price, sale_bix = round(c.value_usd / v_price, 6), sale_requested_at = now() WHERE id = c.id;
  RETURN jsonb_build_object('price_usd', v_price, 'bix', round(c.value_usd / v_price, 6));
END $$;

CREATE OR REPLACE FUNCTION public.bix_nft_review(p_card uuid, p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bix_nft_cards%ROWTYPE; v_owner uuid; v_balance numeric; v_alloc uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  SELECT * INTO c FROM public.bix_nft_cards WHERE id = p_card AND status = 'sale_pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale already reviewed or unavailable'; END IF;
  IF p_approve THEN
    PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
    SELECT owner_id, balance_bix INTO v_owner, v_balance FROM public.owner_bix_vault WHERE owner_id = auth.uid() FOR UPDATE;
    IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner reserve unavailable'; END IF;
    IF v_balance < c.sale_bix THEN RAISE EXCEPTION 'Insufficient owner BIX reserve'; END IF;
    UPDATE public.owner_bix_vault SET balance_bix = balance_bix - c.sale_bix, updated_at = now() WHERE owner_id = v_owner;
    INSERT INTO public.bix_allocations (user_id, amount_bix, note, created_by) VALUES (c.user_id, c.sale_bix, 'NFT buyback #' || c.serial, auth.uid());
    UPDATE public.bix_nft_cards SET status = 'sold', reviewed_at = now(), reviewed_by = auth.uid() WHERE id = c.id;
  ELSE
    UPDATE public.bix_nft_cards SET status = 'redeemable', sale_price_usd = NULL, sale_bix = NULL, sale_requested_at = NULL, reviewed_at = now(), reviewed_by = auth.uid() WHERE id = c.id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.bix_nft_sell(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.bix_nft_review(uuid, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.bix_mint_stake_nft() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bix_nft_sell(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bix_nft_review(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bix_nft_tier(numeric, integer) TO authenticated;