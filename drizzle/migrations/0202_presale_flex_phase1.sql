CREATE OR REPLACE FUNCTION public.bix_presale_buy_flex(p_usd numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb; v_stage jsonb; v_price numeric; v_bix numeric; v_days int := 100;
  v_sponsor uuid; v_sbix numeric := 0; v_used numeric; v_id uuid; v_serial bigint;
  v_min numeric; v_max numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_presale'));
  v_cfg := public.bix_presale_config();
  IF NOT COALESCE((v_cfg->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Presale is closed'; END IF;
  v_stage := v_cfg->'stages'->COALESCE((v_cfg->>'activeStage')::int, 0);
  IF v_stage ? 'startsAt' AND v_stage->>'startsAt' IS NOT NULL AND now() < (v_stage->>'startsAt')::timestamptz THEN RAISE EXCEPTION 'This presale phase has not opened yet'; END IF;
  IF v_stage ? 'endsAt' AND v_stage->>'endsAt' IS NOT NULL AND now() >= (v_stage->>'endsAt')::timestamptz THEN RAISE EXCEPTION 'This presale phase has closed'; END IF;
  v_price := COALESCE(NULLIF(v_stage->>'price','')::numeric, 0.25);
  v_min := COALESCE((v_cfg->>'flexMin')::numeric, 100); v_max := COALESCE((v_cfg->>'flexMax')::numeric, 1000);
  v_days := COALESCE((v_cfg->>'vestingDays')::int, 100);
  IF p_usd IS NULL OR p_usd < v_min OR p_usd > v_max THEN RAISE EXCEPTION 'Amount must be between % and % USDT', v_min, v_max; END IF;
  IF v_price <= 0 THEN RAISE EXCEPTION 'Invalid presale price'; END IF;
  v_bix := round(p_usd / v_price, 2);
  IF public.bix_wallet_balance(v_uid) < p_usd THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
  SELECT referred_by INTO v_sponsor FROM public.referral_codes WHERE user_id = v_uid;
  IF v_sponsor IS NOT NULL AND v_sponsor <> v_uid THEN v_sbix := round(v_bix * COALESCE((v_cfg->>'sponsorPct')::numeric, 10) / 100, 6); ELSE v_sponsor := NULL; END IF;
  SELECT COALESCE(SUM(bix_amount + sponsor_bix), 0) INTO v_used FROM public.bix_presale_orders WHERE status = 'locked';
  IF v_used + v_bix + v_sbix > COALESCE((v_cfg->>'poolCap')::numeric, 0) THEN RAISE EXCEPTION 'Presale pool is full'; END IF;
  INSERT INTO public.bix_presale_orders (user_id, package_usd, bix_amount, release_days, sponsor_id, sponsor_bix, strategy)
  VALUES (v_uid, p_usd, v_bix, v_days, v_sponsor, v_sbix, 'standard') RETURNING id, genesis_serial INTO v_id, v_serial;
  RETURN jsonb_build_object('id', v_id, 'bix', v_bix, 'serial', v_serial, 'dailyUsd', 0);
END $function$;
REVOKE ALL ON FUNCTION public.bix_presale_buy_flex(numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_buy_flex(numeric) TO authenticated;