CREATE OR REPLACE FUNCTION public.bix_loan_quota(p_sponsor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb := '[]'::jsonb; v_is_loan boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_sponsor AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_sponsor AND support_kind = 'loan' AND status = 'approved') INTO v_is_loan;
  SELECT jsonb_agg(jsonb_build_object('price', q.price, 'max', q.mx, 'used', (
    SELECT count(*) FROM public.bix_leaders l JOIN public.referral_codes rc ON rc.user_id = l.user_id
    WHERE rc.referred_by = p_sponsor AND l.support_kind = 'loan' AND l.status = 'approved' AND l.virtual_usd = q.price)) ORDER BY q.price DESC)
  INTO r FROM (VALUES (1000::numeric, 1), (500::numeric, 2), (100::numeric, 10)) AS q(price, mx);
  RETURN jsonb_build_object('sponsor_is_loan', v_is_loan, 'quota', r);
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_quota(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_quota(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bix_claim_conditional_leader(p_package text, p_days integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); v_price numeric; v_pool numeric; v_used numeric; v_count int; v_stake uuid; v_sponsor uuid; v_max int; v_taken int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF COALESCE((SELECT (value ->> 'loanEnabled')::boolean FROM public.app_settings WHERE key = 'readiness'), true) = false THEN RAISE EXCEPTION 'Loan program is currently closed'; END IF;
  IF NOT public.bix_in_owner1_network() THEN RAISE EXCEPTION 'Not available for your network'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_user) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_user) THEN RAISE EXCEPTION 'Conditional leader account already claimed'; END IF;
  SELECT price_usd INTO v_price FROM public.packages WHERE id = p_package AND enabled AND NOT retired AND clone_of IS NULL;
  IF v_price IS NULL OR v_price > 1000 THEN RAISE EXCEPTION 'Package not available (max $1,000)'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_leader_pool'));
  SELECT referred_by INTO v_sponsor FROM public.referral_codes WHERE user_id = v_user;
  IF v_sponsor IS NOT NULL AND EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_sponsor AND support_kind = 'loan' AND status = 'approved') THEN
    v_max := CASE v_price WHEN 1000 THEN 1 WHEN 500 THEN 2 WHEN 100 THEN 10 ELSE NULL END;
    IF v_max IS NOT NULL THEN
      SELECT count(*) INTO v_taken FROM public.bix_leaders l JOIN public.referral_codes rc ON rc.user_id = l.user_id
        WHERE rc.referred_by = v_sponsor AND l.support_kind = 'loan' AND l.status = 'approved' AND l.virtual_usd = v_price;
      IF v_taken >= v_max THEN RAISE EXCEPTION 'Sponsor quota for the $% package is full (max % account%)', to_char(v_price,'FM9,999'), v_max, CASE WHEN v_max > 1 THEN 's' ELSE '' END; END IF;
    END IF;
  END IF;
  SELECT count(*) INTO v_count FROM public.bix_leaders WHERE status = 'approved';
  IF v_count >= 100 THEN RAISE EXCEPTION 'Leader limit (100) reached'; END IF;
  SELECT COALESCE((value ->> 'poolUsd')::numeric, 1000000) INTO v_pool FROM public.app_settings WHERE key = 'leader_pool';
  v_pool := COALESCE(v_pool, 1000000);
  SELECT COALESCE(sum(virtual_usd),0) INTO v_used FROM public.bix_leaders WHERE status = 'approved';
  IF v_used + v_price > v_pool THEN RAISE EXCEPTION 'Leader pool is full'; END IF;
  INSERT INTO public.bix_leaders(user_id, status, virtual_usd, require_turnover, turnover_multiple, scope, reviewed_at, support_kind)
  VALUES (v_user, 'approved', v_price, true, 5, 'global', now(), 'loan');
  v_stake := public.request_bix_duration_stake_mode(p_package, p_days, 'usdt');
  RETURN jsonb_build_object('stake_id', v_stake, 'package', p_package, 'value_usd', v_price, 'target_usd', v_price * 5, 'days', p_days, 'sponsor_id', v_sponsor);
END $$;
REVOKE ALL ON FUNCTION public.bix_claim_conditional_leader(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_claim_conditional_leader(text, integer) TO authenticated;