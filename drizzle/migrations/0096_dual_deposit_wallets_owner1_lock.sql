ALTER TABLE public.bix_owner_deposit_wallets
  ADD COLUMN IF NOT EXISTS unique_code text,
  ADD COLUMN IF NOT EXISTS unique_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unique_network text NOT NULL DEFAULT 'BEP20',
  ADD COLUMN IF NOT EXISTS unique_asset text NOT NULL DEFAULT 'USDT',
  ADD COLUMN IF NOT EXISTS unique_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unique_enabled boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS bix_owner_deposit_wallets_unique_code_key ON public.bix_owner_deposit_wallets(unique_code) WHERE unique_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.bix_deposit_owner1_lock (
  user_id uuid PRIMARY KEY,
  locked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_deposit_owner1_lock TO authenticated;
GRANT ALL ON public.bix_deposit_owner1_lock TO service_role;
ALTER TABLE public.bix_deposit_owner1_lock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner1 reads deposit locks" ON public.bix_deposit_owner1_lock FOR SELECT TO authenticated USING (public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_deposit_owner(p_user uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := p_user; seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  -- Members moved from Owner 1's network keep Owner 1 deposit wallets (they or any locked ancestor).
  LOOP
    IF EXISTS (SELECT 1 FROM public.bix_deposit_owner1_lock WHERE user_id = cur) THEN RETURN NULL; END IF;
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
  WITH o AS (
    SELECT w.* FROM public.bix_owner_deposit_wallets w
    WHERE auth.uid() IS NOT NULL AND w.owner_id = COALESCE(
      (SELECT ur.user_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'reviewer' LIMIT 1),
      public.bix_deposit_owner(auth.uid()))
  ), rows AS (
    SELECT jsonb_build_object('code', code, 'label', label, 'network', network, 'asset', asset, 'address', address, 'enabled', true, 'mode', 'flex') j FROM o WHERE enabled AND address <> ''
    UNION ALL
    SELECT jsonb_build_object('code', unique_code, 'label', unique_label, 'network', unique_network, 'asset', unique_asset, 'address', unique_address, 'enabled', true, 'mode', 'unique') FROM o WHERE unique_enabled AND unique_address <> '' AND unique_code IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(j), '[]'::jsonb) FROM rows;
$$;
REVOKE ALL ON FUNCTION public.bix_my_deposit_wallets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_my_deposit_wallets() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_owner_wallet_save_unique(p_label text, p_network text, p_asset text, p_address text, p_enabled boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'reviewer') THEN RAISE EXCEPTION 'Owner 2 access required'; END IF;
  IF p_network NOT IN ('BEP20','TRC20','ERC20') OR p_asset NOT IN ('USDT','USDC') OR length(coalesce(p_label,'')) > 40 THEN RAISE EXCEPTION 'Invalid wallet'; END IF;
  IF p_enabled AND ((p_network = 'TRC20' AND p_address !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$') OR (p_network <> 'TRC20' AND p_address !~ '^0x[0-9a-fA-F]{40}$')) THEN RAISE EXCEPTION 'Address does not match network'; END IF;
  c := 'UNQ-' || upper(substr(replace(auth.uid()::text,'-',''),1,6));
  INSERT INTO public.bix_owner_deposit_wallets(owner_id, code, label, network, asset, address, enabled, updated_at, unique_code, unique_label, unique_network, unique_asset, unique_address, unique_enabled)
  VALUES (auth.uid(), 'OWN-' || upper(substr(replace(auth.uid()::text,'-',''),1,6)), '', 'BEP20', 'USDT', '', false, now(), c, coalesce(p_label,''), p_network, p_asset, coalesce(p_address,''), p_enabled)
  ON CONFLICT (owner_id) DO UPDATE SET unique_code = c, unique_label = EXCLUDED.unique_label, unique_network = EXCLUDED.unique_network, unique_asset = EXCLUDED.unique_asset, unique_address = EXCLUDED.unique_address, unique_enabled = EXCLUDED.unique_enabled, updated_at = now();
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.bix_owner_wallet_save_unique(text,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_owner_wallet_save_unique(text,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_owner1(p_code text, p_lock boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  SELECT user_id INTO u FROM public.referral_codes WHERE upper(code) = upper(trim(p_code));
  IF u IS NULL THEN SELECT user_id INTO u FROM public.profiles WHERE lower(username) = lower(trim(p_code)); END IF;
  IF u IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF p_lock THEN INSERT INTO public.bix_deposit_owner1_lock(user_id, locked_by) VALUES (u, auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  ELSE DELETE FROM public.bix_deposit_owner1_lock WHERE user_id = u; END IF;
  RETURN jsonb_build_object('user_id', u, 'locked', p_lock);
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_lock_owner1(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_deposit_lock_owner1(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_bix_admin() THEN COALESCE(jsonb_agg(jsonb_build_object('code', r.code, 'username', p.username, 'created_at', l.created_at) ORDER BY l.created_at DESC), '[]'::jsonb) ELSE '[]'::jsonb END
  FROM public.bix_deposit_owner1_lock l LEFT JOIN public.referral_codes r ON r.user_id = l.user_id LEFT JOIN public.profiles p ON p.user_id = l.user_id;
$$;
REVOKE ALL ON FUNCTION public.bix_deposit_lock_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_deposit_lock_list() TO authenticated;