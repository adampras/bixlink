CREATE TABLE public.bix_loan_devices (
  user_id uuid PRIMARY KEY,
  fingerprint text NOT NULL UNIQUE,
  device_label text NOT NULL DEFAULT '',
  ip_address text,
  user_agent text,
  last_ip text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_loan_devices TO authenticated;
GRANT ALL ON public.bix_loan_devices TO service_role;
ALTER TABLE public.bix_loan_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner device read" ON public.bix_loan_devices FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_loan_device_check(p_fp text, p_label text, p_ip text, p_ua text, p_bind boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); r public.bix_loan_devices; v_other uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_fp IS NULL OR length(p_fp) < 16 OR length(p_fp) > 128 THEN RAISE EXCEPTION 'Invalid device'; END IF;
  SELECT * INTO r FROM public.bix_loan_devices WHERE user_id = v_user;
  IF FOUND THEN
    IF r.fingerprint = p_fp THEN
      UPDATE public.bix_loan_devices SET last_ip = left(p_ip,64), last_seen_at = now() WHERE user_id = v_user;
      RETURN jsonb_build_object('bound', true, 'match', true, 'label', r.device_label);
    END IF;
    RETURN jsonb_build_object('bound', true, 'match', false, 'label', r.device_label);
  END IF;
  SELECT user_id INTO v_other FROM public.bix_loan_devices WHERE fingerprint = p_fp;
  IF v_other IS NOT NULL THEN RETURN jsonb_build_object('bound', false, 'match', false, 'taken', true); END IF;
  IF p_bind THEN
    INSERT INTO public.bix_loan_devices(user_id, fingerprint, device_label, ip_address, user_agent, last_ip)
    VALUES (v_user, p_fp, left(coalesce(p_label,''),80), left(p_ip,64), left(p_ua,300), left(p_ip,64));
    RETURN jsonb_build_object('bound', true, 'match', true, 'label', left(coalesce(p_label,''),80));
  END IF;
  RETURN jsonb_build_object('bound', false, 'match', false, 'taken', false);
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_device_check(text,text,text,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_device_check(text,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_loan_device_reset(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  DELETE FROM public.bix_loan_devices WHERE user_id = p_user;
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_device_reset(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_device_reset(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_claim_conditional_leader(p_package text, p_days integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); v_price numeric; v_pool numeric; v_used numeric; v_count int; v_stake uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF COALESCE((SELECT (value ->> 'loanEnabled')::boolean FROM public.app_settings WHERE key = 'readiness'), true) = false THEN RAISE EXCEPTION 'Loan program is currently closed'; END IF;
  IF NOT public.bix_in_owner1_network() THEN RAISE EXCEPTION 'Not available for your network'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_user) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bix_loan_devices WHERE user_id = v_user) THEN RAISE EXCEPTION 'Device verification required'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_user) THEN RAISE EXCEPTION 'Conditional leader account already claimed'; END IF;
  SELECT price_usd INTO v_price FROM public.packages WHERE id = p_package AND enabled AND NOT retired AND clone_of IS NULL;
  IF v_price IS NULL OR v_price > 1000 THEN RAISE EXCEPTION 'Package not available (max $1,000)'; END IF;
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