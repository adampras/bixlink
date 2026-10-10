ALTER TABLE public.bix_presale_orders
  ADD COLUMN IF NOT EXISTS strategy text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS dividend_daily_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS genesis_serial bigserial;

CREATE OR REPLACE FUNCTION public.bix_presale_config()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('enabled', false, 'sponsorPct', 10, 'poolCap', 2100000,
    'packages', jsonb_build_array(
      jsonb_build_object('usd',500,'bix',800,'releaseDays',180),
      jsonb_build_object('usd',1000,'bix',1650,'releaseDays',180),
      jsonb_build_object('usd',5000,'bix',8500,'releaseDays',270),
      jsonb_build_object('usd',10000,'bix',17500,'releaseDays',365)),
    'strategies', jsonb_build_object('enabled', false, 'hybridBixPct', 50, 'hybridDailyPct', 0.3, 'dividendDailyPct', 0.2, 'founderBonusApy', 20))
  || COALESCE((SELECT value FROM public.app_settings WHERE key = 'presale'), '{}'::jsonb)
$function$;

CREATE OR REPLACE FUNCTION public.bix_presale_save(p_config jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p jsonb; s jsonb := COALESCE(p_config->'strategies', public.bix_presale_config()->'strategies');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF jsonb_typeof(p_config->'packages') <> 'array' THEN RAISE EXCEPTION 'Packages required'; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(p_config->'packages') LOOP
    IF (p->>'usd')::numeric <= 0 OR (p->>'bix')::numeric <= 0 OR (p->>'releaseDays')::int < 1 THEN RAISE EXCEPTION 'Invalid package values'; END IF;
  END LOOP;
  IF (p_config->>'poolCap')::numeric > 10500000 OR (p_config->>'poolCap')::numeric < 0 THEN RAISE EXCEPTION 'Pool cap must be within the 10,500,000 BIX allocation'; END IF;
  IF (p_config->>'sponsorPct')::numeric < 0 OR (p_config->>'sponsorPct')::numeric > 10 THEN RAISE EXCEPTION 'Sponsor must be 0–10%%'; END IF;
  IF (s->>'hybridBixPct')::numeric NOT BETWEEN 10 AND 90 THEN RAISE EXCEPTION 'Hybrid BIX share must be 10–90%%'; END IF;
  IF (s->>'hybridDailyPct')::numeric NOT BETWEEN 0 AND 1 OR (s->>'dividendDailyPct')::numeric NOT BETWEEN 0 AND 1 THEN RAISE EXCEPTION 'Daily rates must be 0–1%%'; END IF;
  IF (s->>'founderBonusApy')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Founder bonus must be 0–100%%'; END IF;
  INSERT INTO public.app_settings (key, value) VALUES ('presale', jsonb_build_object('enabled', COALESCE((p_config->>'enabled')::boolean,false), 'sponsorPct', (p_config->>'sponsorPct')::numeric, 'poolCap', (p_config->>'poolCap')::numeric, 'packages', p_config->'packages',
    'strategies', jsonb_build_object('enabled', COALESCE((s->>'enabled')::boolean,false), 'hybridBixPct', (s->>'hybridBixPct')::numeric, 'hybridDailyPct', (s->>'hybridDailyPct')::numeric, 'dividendDailyPct', (s->>'dividendDailyPct')::numeric, 'founderBonusApy', (s->>'founderBonusApy')::numeric)))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN public.bix_presale_config();
END $function$;

CREATE OR REPLACE FUNCTION public.bix_presale_buy_strategy(p_usd numeric, p_strategy text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb; v_s jsonb; v_pkg jsonb; v_full numeric; v_bix numeric; v_bonus numeric := 0; v_daily numeric := 0;
  v_days int; v_sponsor uuid; v_sbix numeric := 0; v_used numeric; v_id uuid; v_serial bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_strategy NOT IN ('standard','hybrid','dividend','founder') THEN RAISE EXCEPTION 'Unknown strategy'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_presale'));
  v_cfg := public.bix_presale_config(); v_s := v_cfg->'strategies';
  IF NOT COALESCE((v_cfg->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Presale is closed'; END IF;
  IF p_strategy <> 'standard' AND NOT COALESCE((v_s->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Strategies are not open yet'; END IF;
  SELECT p INTO v_pkg FROM jsonb_array_elements(v_cfg->'packages') p WHERE (p->>'usd')::numeric = p_usd LIMIT 1;
  IF v_pkg IS NULL THEN RAISE EXCEPTION 'Unknown presale package'; END IF;
  v_full := (v_pkg->>'bix')::numeric; v_days := GREATEST(1, (v_pkg->>'releaseDays')::int); v_bix := v_full;
  IF p_strategy = 'hybrid' THEN
    v_bix := round(v_full * (v_s->>'hybridBixPct')::numeric / 100, 2);
    v_daily := round(p_usd * (100 - (v_s->>'hybridBixPct')::numeric) / 100 * (v_s->>'hybridDailyPct')::numeric / 100, 6);
  ELSIF p_strategy = 'dividend' THEN
    v_daily := round(p_usd * (v_s->>'dividendDailyPct')::numeric / 100, 6);
  ELSIF p_strategy = 'founder' THEN
    v_bonus := round(v_full * (v_s->>'founderBonusApy')::numeric / 100 * v_days / 365, 2);
    v_bix := v_full + v_bonus;
  END IF;
  IF public.bix_wallet_balance(v_uid) < p_usd THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
  SELECT referred_by INTO v_sponsor FROM public.referral_codes WHERE user_id = v_uid;
  IF v_sponsor IS NOT NULL AND v_sponsor <> v_uid THEN v_sbix := round((v_bix - v_bonus) * COALESCE((v_cfg->>'sponsorPct')::numeric, 10) / 100, 6); ELSE v_sponsor := NULL; END IF;
  SELECT COALESCE(SUM(bix_amount + sponsor_bix), 0) INTO v_used FROM public.bix_presale_orders WHERE status = 'locked';
  IF v_used + v_bix + v_sbix > COALESCE((v_cfg->>'poolCap')::numeric, 0) THEN RAISE EXCEPTION 'Presale pool is full'; END IF;
  INSERT INTO public.bix_presale_orders (user_id, package_usd, bix_amount, release_days, sponsor_id, sponsor_bix, strategy, dividend_daily_usd, bonus_bix)
  VALUES (v_uid, p_usd, v_bix, v_days, v_sponsor, v_sbix, p_strategy, v_daily, v_bonus) RETURNING id, genesis_serial INTO v_id, v_serial;
  RETURN jsonb_build_object('id', v_id, 'bix', v_bix, 'serial', v_serial, 'dailyUsd', v_daily);
END $function$;
REVOKE ALL ON FUNCTION public.bix_presale_buy_strategy(numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_buy_strategy(numeric, text) TO authenticated;

-- Settled USDT dividend: whole elapsed days only, capped at the release period.
CREATE OR REPLACE FUNCTION public.bix_presale_dividend(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(dividend_daily_usd * LEAST(release_days, floor(extract(epoch FROM now() - created_at) / 86400))), 0)
  FROM public.bix_presale_orders WHERE user_id = p_user AND status = 'locked' AND dividend_daily_usd > 0
$function$;
REVOKE ALL ON FUNCTION public.bix_presale_dividend(uuid) FROM public, anon;

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
    + public.bix_presale_dividend(p_user)
  ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.bix_presale_status()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb := public.bix_presale_config(); v_used numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE(SUM(bix_amount + sponsor_bix), 0) INTO v_used FROM public.bix_presale_orders WHERE status = 'locked';
  RETURN jsonb_build_object('config', v_cfg, 'poolUsed', v_used, 'serverNow', now(),
    'balanceUsd', public.bix_wallet_balance(v_uid),
    'dividendEarned', public.bix_presale_dividend(v_uid),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'package_usd',package_usd,'bix_amount',bix_amount,'release_days',release_days,'status',status,'created_at',created_at,'strategy',strategy,'dividend_daily_usd',dividend_daily_usd,'bonus_bix',bonus_bix,'serial',genesis_serial) ORDER BY created_at DESC) FROM public.bix_presale_orders WHERE user_id = v_uid), '[]'::jsonb),
    'sponsorRewards', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'bix',sponsor_bix,'release_days',release_days,'status',status,'created_at',created_at) ORDER BY created_at DESC) FROM public.bix_presale_orders WHERE sponsor_id = v_uid AND sponsor_bix > 0), '[]'::jsonb));
END $function$;