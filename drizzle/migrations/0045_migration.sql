CREATE TABLE IF NOT EXISTS public.bix_presale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_usd numeric NOT NULL CHECK (package_usd > 0),
  bix_amount numeric NOT NULL CHECK (bix_amount > 0),
  release_days integer NOT NULL CHECK (release_days > 0),
  sponsor_id uuid,
  sponsor_bix numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked','reversed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bix_presale_orders_user_idx ON public.bix_presale_orders(user_id);
CREATE INDEX IF NOT EXISTS bix_presale_orders_sponsor_idx ON public.bix_presale_orders(sponsor_id);
ALTER TABLE public.bix_presale_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presale own or sponsor read" ON public.bix_presale_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR sponsor_id = auth.uid() OR public.is_bix_admin());
GRANT SELECT ON public.bix_presale_orders TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_config()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('enabled', false, 'sponsorPct', 10, 'poolCap', 2100000,
    'packages', jsonb_build_array(
      jsonb_build_object('usd',500,'bix',800,'releaseDays',180),
      jsonb_build_object('usd',1000,'bix',1650,'releaseDays',180),
      jsonb_build_object('usd',5000,'bix',8500,'releaseDays',270),
      jsonb_build_object('usd',10000,'bix',17500,'releaseDays',365)))
  || COALESCE((SELECT value FROM public.app_settings WHERE key = 'presale'), '{}'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.bix_presale_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_config() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_paid(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(package_usd), 0) FROM public.bix_presale_orders WHERE user_id = p_user AND status = 'locked'
$$;
REVOKE ALL ON FUNCTION public.bix_presale_paid(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
    (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
    + public.bix_vusdt_component(p_user)
    + COALESCE((SELECT SUM(usdt_amount) FROM public.bix_usdt_network_bonuses WHERE user_id = p_user), 0)
    - public.bix_presale_paid(p_user)
  ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.bix_presale_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb := public.bix_presale_config(); v_used numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE(SUM(bix_amount + sponsor_bix), 0) INTO v_used FROM public.bix_presale_orders WHERE status = 'locked';
  RETURN jsonb_build_object('config', v_cfg, 'poolUsed', v_used, 'serverNow', now(),
    'balanceUsd', public.bix_wallet_balance(v_uid),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'package_usd',package_usd,'bix_amount',bix_amount,'release_days',release_days,'status',status,'created_at',created_at) ORDER BY created_at DESC) FROM public.bix_presale_orders WHERE user_id = v_uid), '[]'::jsonb),
    'sponsorRewards', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'bix',sponsor_bix,'release_days',release_days,'status',status,'created_at',created_at) ORDER BY created_at DESC) FROM public.bix_presale_orders WHERE sponsor_id = v_uid AND sponsor_bix > 0), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_buy(p_usd numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb; v_pkg jsonb; v_bix numeric; v_days int; v_sponsor uuid; v_sbix numeric := 0; v_used numeric; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_presale'));
  v_cfg := public.bix_presale_config();
  IF NOT COALESCE((v_cfg->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Presale is closed'; END IF;
  SELECT p INTO v_pkg FROM jsonb_array_elements(v_cfg->'packages') p WHERE (p->>'usd')::numeric = p_usd LIMIT 1;
  IF v_pkg IS NULL THEN RAISE EXCEPTION 'Unknown presale package'; END IF;
  v_bix := (v_pkg->>'bix')::numeric; v_days := GREATEST(1, (v_pkg->>'releaseDays')::int);
  IF public.bix_wallet_balance(v_uid) < p_usd THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
  SELECT referred_by INTO v_sponsor FROM public.referral_codes WHERE user_id = v_uid;
  IF v_sponsor IS NOT NULL AND v_sponsor <> v_uid THEN v_sbix := round(v_bix * COALESCE((v_cfg->>'sponsorPct')::numeric, 10) / 100, 6); ELSE v_sponsor := NULL; END IF;
  SELECT COALESCE(SUM(bix_amount + sponsor_bix), 0) INTO v_used FROM public.bix_presale_orders WHERE status = 'locked';
  IF v_used + v_bix + v_sbix > COALESCE((v_cfg->>'poolCap')::numeric, 0) THEN RAISE EXCEPTION 'Presale pool is full'; END IF;
  INSERT INTO public.bix_presale_orders (user_id, package_usd, bix_amount, release_days, sponsor_id, sponsor_bix)
  VALUES (v_uid, p_usd, v_bix, v_days, v_sponsor, v_sbix) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'bix', v_bix);
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_buy(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_buy(numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_save(p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF jsonb_typeof(p_config->'packages') <> 'array' THEN RAISE EXCEPTION 'Packages required'; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(p_config->'packages') LOOP
    IF (p->>'usd')::numeric <= 0 OR (p->>'bix')::numeric <= 0 OR (p->>'releaseDays')::int < 1 THEN RAISE EXCEPTION 'Invalid package values'; END IF;
  END LOOP;
  IF (p_config->>'poolCap')::numeric > 10500000 OR (p_config->>'poolCap')::numeric < 0 THEN RAISE EXCEPTION 'Pool cap must be within the 10,500,000 BIX allocation'; END IF;
  IF (p_config->>'sponsorPct')::numeric < 0 OR (p_config->>'sponsorPct')::numeric > 10 THEN RAISE EXCEPTION 'Sponsor must be 0–10%%'; END IF;
  INSERT INTO public.app_settings (key, value) VALUES ('presale', jsonb_build_object('enabled', COALESCE((p_config->>'enabled')::boolean,false), 'sponsorPct', (p_config->>'sponsorPct')::numeric, 'poolCap', (p_config->>'poolCap')::numeric, 'packages', p_config->'packages'))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN public.bix_presale_config();
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_save(jsonb) TO authenticated;