CREATE TABLE public.bix_owner_deposit_wallets (
  owner_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  network text NOT NULL DEFAULT 'BEP20',
  asset text NOT NULL DEFAULT 'USDT',
  address text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_owner_deposit_wallets TO authenticated;
GRANT ALL ON public.bix_owner_deposit_wallets TO service_role;
ALTER TABLE public.bix_owner_deposit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner1 wallet read" ON public.bix_owner_deposit_wallets FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_bix_admin());

CREATE TABLE public.bix_owner_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id uuid NOT NULL UNIQUE,
  owner_id uuid,
  member_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  wallet_code text,
  network text,
  address text,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bix_owner_revenue_owner_idx ON public.bix_owner_revenue(owner_id, created_at DESC);
GRANT SELECT ON public.bix_owner_revenue TO authenticated;
GRANT ALL ON public.bix_owner_revenue TO service_role;
ALTER TABLE public.bix_owner_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner1 revenue read" ON public.bix_owner_revenue FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_bix_admin());

-- Nearest Owner 2–5 (reviewer) above a member in the sponsor chain; cycle-safe.
CREATE OR REPLACE FUNCTION public.bix_deposit_owner(p_user uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := p_user; seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  LOOP
    SELECT referred_by INTO cur FROM public.referral_codes WHERE user_id = cur;
    i := i + 1;
    EXIT WHEN cur IS NULL OR cur = ANY(seen) OR i > 60;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = cur AND role = 'reviewer') THEN RETURN cur; END IF;
    seen := seen || cur;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_my_deposit_wallets()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label, 'network', w.network, 'asset', w.asset, 'address', w.address, 'enabled', true)), '[]'::jsonb)
  FROM public.bix_owner_deposit_wallets w
  WHERE auth.uid() IS NOT NULL AND w.owner_id = public.bix_deposit_owner(auth.uid()) AND w.enabled AND w.address <> '';
$$;
REVOKE ALL ON FUNCTION public.bix_my_deposit_wallets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_my_deposit_wallets() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_owner_wallet_save(p_label text, p_network text, p_asset text, p_address text, p_enabled boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'reviewer') THEN RAISE EXCEPTION 'Owner 2 access required'; END IF;
  IF p_network NOT IN ('BEP20','TRC20','ERC20') OR p_asset NOT IN ('USDT','USDC') OR length(coalesce(p_label,'')) > 40 THEN RAISE EXCEPTION 'Invalid wallet'; END IF;
  IF p_enabled AND ((p_network = 'TRC20' AND p_address !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$') OR (p_network <> 'TRC20' AND p_address !~ '^0x[0-9a-fA-F]{40}$')) THEN RAISE EXCEPTION 'Address does not match network'; END IF;
  c := 'OWN-' || upper(substr(replace(auth.uid()::text,'-',''),1,6));
  INSERT INTO public.bix_owner_deposit_wallets(owner_id, code, label, network, asset, address, enabled, updated_at)
  VALUES (auth.uid(), c, coalesce(p_label,''), p_network, p_asset, coalesce(p_address,''), p_enabled, now())
  ON CONFLICT (owner_id) DO UPDATE SET label = EXCLUDED.label, network = EXCLUDED.network, asset = EXCLUDED.asset, address = EXCLUDED.address, enabled = EXCLUDED.enabled, updated_at = now();
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.bix_owner_wallet_save(text,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_owner_wallet_save(text,text,text,text,boolean) TO authenticated;

-- Every approved real deposit is recorded once; owner = Owner 2–5 whose wallet received it, NULL = Owner 1 wallets.
CREATE OR REPLACE FUNCTION public.bix_record_owner_revenue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'approved' AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.bix_owner_revenue(tx_id, owner_id, member_id, amount_usd, wallet_code, network, address, tx_hash, created_at)
    VALUES (NEW.id, (SELECT owner_id FROM public.bix_owner_deposit_wallets WHERE lower(address) = lower(NEW.address) AND address <> '' LIMIT 1),
      NEW.user_id, NEW.amount_usd, NEW.wallet_code, NEW.network, NEW.address, NEW.tx_hash, coalesce(NEW.reviewed_at, now()))
    ON CONFLICT (tx_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bix_owner_revenue_trg AFTER INSERT OR UPDATE OF status ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.bix_record_owner_revenue();

INSERT INTO public.bix_owner_revenue(tx_id, owner_id, member_id, amount_usd, wallet_code, network, address, tx_hash, created_at)
SELECT t.id, NULL, t.user_id, t.amount_usd, t.wallet_code, t.network, t.address, t.tx_hash, coalesce(t.reviewed_at, t.created_at)
FROM public.wallet_transactions t
WHERE t.type = 'deposit' AND t.status = 'approved' AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = t.user_id)
ON CONFLICT (tx_id) DO NOTHING;