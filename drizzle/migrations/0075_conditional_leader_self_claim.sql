CREATE OR REPLACE FUNCTION public.bix_claim_conditional_leader(p_package text, p_days integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); v_price numeric; v_pool numeric; v_used numeric; v_count int; v_stake uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT public.bix_in_owner1_network() THEN RAISE EXCEPTION 'Not available for your network'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_user) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_user) THEN RAISE EXCEPTION 'Conditional leader account already claimed'; END IF;
  SELECT price_usd INTO v_price FROM public.packages WHERE id = p_package AND enabled AND NOT retired AND clone_of IS NULL;
  IF v_price IS NULL OR v_price > 5000 THEN RAISE EXCEPTION 'Package not available (max $5,000)'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_leader_pool'));
  SELECT count(*) INTO v_count FROM public.bix_leaders WHERE status = 'approved';
  IF v_count >= 100 THEN RAISE EXCEPTION 'Leader limit (100) reached'; END IF;
  SELECT COALESCE((value ->> 'poolUsd')::numeric, 1000000) INTO v_pool FROM public.app_settings WHERE key = 'leader_pool';
  v_pool := COALESCE(v_pool, 1000000);
  SELECT COALESCE(sum(virtual_usd),0) INTO v_used FROM public.bix_leaders WHERE status = 'approved';
  IF v_used + v_price > v_pool THEN RAISE EXCEPTION 'Leader pool is full'; END IF;
  INSERT INTO public.bix_leaders(user_id, status, virtual_usd, require_turnover, turnover_multiple, scope, reviewed_at)
  VALUES (v_user, 'approved', v_price, true, 5, 'global', now());
  v_stake := public.request_bix_duration_stake_mode(p_package, p_days, 'usdt');
  RETURN jsonb_build_object('stake_id', v_stake, 'package', p_package, 'value_usd', v_price, 'target_usd', v_price * 5, 'days', p_days);
END $$;
REVOKE ALL ON FUNCTION public.bix_claim_conditional_leader(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_claim_conditional_leader(text, integer) TO authenticated;