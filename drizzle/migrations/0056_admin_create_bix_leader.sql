ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'local';

CREATE OR REPLACE FUNCTION public.admin_create_bix_leader(p_code text, p_virtual numeric, p_require boolean, p_scope text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF p_scope NOT IN ('local','global') THEN RAISE EXCEPTION 'Invalid scope'; END IF;
  IF p_virtual NOT IN (100,500,1000,5000,10000) THEN RAISE EXCEPTION 'Seed must be 100, 500, 1000, 5000 or 10000'; END IF;
  SELECT user_id INTO v_user FROM public.referral_codes WHERE upper(code) = upper(trim(p_code));
  IF v_user IS NULL THEN SELECT user_id INTO v_user FROM public.profiles WHERE lower(username) = lower(trim(p_code)); END IF;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  INSERT INTO public.bix_leaders (user_id, status, virtual_usd, require_turnover, turnover_multiple, scope)
  VALUES (v_user, 'pending', 0, true, 3, p_scope)
  ON CONFLICT (user_id) DO UPDATE SET scope = EXCLUDED.scope;
  PERFORM public.admin_review_bix_leader(v_user, 'approved', p_virtual, COALESCE(p_require, true));
  RETURN v_user;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_bix_leader(text, numeric, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_bix_leader(text, numeric, boolean, text) TO authenticated;