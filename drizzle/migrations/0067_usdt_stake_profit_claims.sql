CREATE TABLE public.bix_profit_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stake_id uuid NOT NULL REFERENCES public.stakes(id),
  profit_usd numeric NOT NULL,
  usdt_amount numeric NOT NULL,
  bix_amount numeric NOT NULL,
  price_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_profit_claims TO authenticated;
GRANT ALL ON public.bix_profit_claims TO service_role;
ALTER TABLE public.bix_profit_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profit claims" ON public.bix_profit_claims FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_claim_stake_profit() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; v_status jsonb; v_price numeric; v_split numeric; v_total numeric := 0; v_usdt numeric := 0; v_bix numeric := 0;
  v_earned numeric; v_taken numeric; v_avail numeric; v_owner uuid; v_vault numeric; v_alloc uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF EXISTS (SELECT 1 FROM bix_clone_accounts WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  v_status := public.bix_leader_status(auth.uid());
  IF NOT COALESCE((v_status->>'qualified')::boolean, true) THEN RAISE EXCEPTION 'Leader withdraw locked until turnover target is reached'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('profit'||auth.uid()::text));
  SELECT COALESCE(NULLIF((value->>'priceUsd')::numeric,0),0.84291) INTO v_price FROM app_settings WHERE key='bix_market';
  v_price := COALESCE(v_price,0.84291);
  SELECT COALESCE(NULLIF((value->>'splitUsdt')::numeric,0),70)/100 INTO v_split FROM app_settings WHERE key='referrals';
  v_split := LEAST(GREATEST(COALESCE(v_split,0.7),0),1);
  FOR r IN SELECT * FROM stakes WHERE user_id = auth.uid() AND status='active' AND activated_at IS NOT NULL LOOP
    v_earned := r.amount_usd * r.apy / 100 * LEAST(EXTRACT(EPOCH FROM (now()-r.activated_at))/86400, r.lock_days) / 365;
    SELECT COALESCE(sum(profit_usd),0) INTO v_taken FROM bix_profit_claims WHERE stake_id = r.id;
    v_avail := round(v_earned - v_taken, 6);
    IF v_avail > 0.000001 THEN
      INSERT INTO bix_profit_claims(user_id, stake_id, profit_usd, usdt_amount, bix_amount, price_usd)
        VALUES (auth.uid(), r.id, v_avail, round(v_avail*v_split,6), round(v_avail*(1-v_split)/v_price,6), v_price);
      v_total := v_total + v_avail; v_usdt := v_usdt + round(v_avail*v_split,6); v_bix := v_bix + round(v_avail*(1-v_split)/v_price,6);
    END IF;
  END LOOP;
  IF v_total < 0.01 THEN RAISE EXCEPTION 'Minimum withdraw is $0.01 profit'; END IF;
  IF v_usdt > 0 THEN
    INSERT INTO wallet_transactions(user_id, type, amount_usd, fee_usd, net_usd, status, note, reviewed_at)
      VALUES (auth.uid(), 'reward', v_usdt, 0, v_usdt, 'approved', 'Staking profit withdraw (USDT)', now());
  END IF;
  IF v_bix > 0 THEN
    SELECT owner_id, balance_bix INTO v_owner, v_vault FROM owner_bix_vault ORDER BY generated_at LIMIT 1 FOR UPDATE;
    IF v_owner IS NULL OR v_vault < v_bix THEN RAISE EXCEPTION 'Owner reserve unavailable'; END IF;
    UPDATE owner_bix_vault SET balance_bix = balance_bix - v_bix, updated_at = now() WHERE owner_id = v_owner;
    INSERT INTO bix_allocations(user_id, amount_bix, note, created_by) VALUES (auth.uid(), v_bix, 'Staking profit withdraw (BIX)', v_owner);
  END IF;
  RETURN jsonb_build_object('profit_usd', v_total, 'usdt', v_usdt, 'bix', v_bix);
END $$;
REVOKE ALL ON FUNCTION public.bix_claim_stake_profit() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_claim_stake_profit() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_profit_claimed() RETURNS TABLE(stake_id uuid, profit_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT stake_id, sum(profit_usd) FROM bix_profit_claims WHERE user_id = auth.uid() GROUP BY stake_id
$$;
GRANT EXECUTE ON FUNCTION public.bix_profit_claimed() TO authenticated;