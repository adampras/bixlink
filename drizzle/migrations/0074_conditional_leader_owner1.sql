CREATE OR REPLACE FUNCTION public.admin_create_bix_leader(p_code text, p_virtual numeric, p_require boolean, p_scope text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user uuid; v_exists boolean;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF p_scope NOT IN ('local','global') THEN RAISE EXCEPTION 'Invalid scope'; END IF;
  SELECT user_id INTO v_user FROM public.referral_codes WHERE upper(code) = upper(trim(p_code));
  IF v_user IS NULL THEN SELECT user_id INTO v_user FROM public.profiles WHERE lower(username) = lower(trim(p_code)); END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_user AND status = 'approved') INTO v_exists;
  IF NOT v_exists AND p_virtual NOT IN (100,500,1000,5000) THEN RAISE EXCEPTION 'New conditional leader accounts are limited to 100, 500, 1000 or 5000'; END IF;
  IF v_exists AND p_virtual NOT IN (100,500,1000,5000,10000) THEN RAISE EXCEPTION 'Seed must be 100, 500, 1000, 5000 or 10000'; END IF;
  INSERT INTO public.bix_leaders (user_id, status, virtual_usd, require_turnover, turnover_multiple, scope)
  VALUES (v_user, 'pending', 0, true, 5, p_scope)
  ON CONFLICT (user_id) DO UPDATE SET scope = EXCLUDED.scope;
  PERFORM public.admin_review_bix_leader(v_user, 'approved', p_virtual, COALESCE(p_require, true));
  RETURN v_user;
END $function$;

-- True when the caller is Owner 1 or belongs to a network with no Owner 2–5 (reviewer) in their sponsor chain.
CREATE OR REPLACE FUNCTION public.bix_in_owner1_network()
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_cur uuid := auth.uid(); v_i int := 0;
BEGIN
  IF v_cur IS NULL THEN RETURN false; END IF;
  IF public.is_bix_admin() THEN RETURN true; END IF;
  WHILE v_cur IS NOT NULL AND v_i < 200 LOOP
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_cur AND role = 'reviewer') THEN RETURN false; END IF;
    SELECT referred_by INTO v_cur FROM public.referral_codes WHERE user_id = v_cur;
    v_i := v_i + 1;
  END LOOP;
  RETURN true;
END $function$;
REVOKE ALL ON FUNCTION public.bix_in_owner1_network() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_in_owner1_network() TO authenticated;