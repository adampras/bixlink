ALTER TABLE public.bix_deposit_owner1_lock ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.bix_deposit_owner(p_user uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := p_user; nxt uuid; seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  LOOP
    IF EXISTS (SELECT 1 FROM public.bix_deposit_owner1_lock WHERE user_id = cur AND active) THEN RETURN NULL; END IF;
    IF EXISTS (SELECT 1 FROM public.bix_design_whitelist WHERE user_id = cur) THEN RETURN NULL; END IF;
    SELECT referred_by INTO nxt FROM public.referral_codes WHERE user_id = cur;
    IF nxt IS NOT NULL AND public.bix_quota_overflow(nxt, cur) THEN RETURN NULL; END IF;
    cur := nxt;
    i := i + 1;
    EXIT WHEN cur IS NULL OR cur = ANY(seen) OR i > 60;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = cur AND role = 'reviewer') THEN RETURN cur; END IF;
    seen := seen || cur;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_owner1(p_code text, p_lock boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  u := public.bix_resolve_member(p_code);
  IF u IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF p_lock THEN INSERT INTO public.bix_deposit_owner1_lock(user_id, locked_by, active) VALUES (u, auth.uid(), true) ON CONFLICT (user_id) DO UPDATE SET active = true;
  ELSE DELETE FROM public.bix_deposit_owner1_lock WHERE user_id = u; END IF;
  RETURN jsonb_build_object('user_id', u, 'locked', p_lock);
END $$;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_switch(p_code text, p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  u := public.bix_resolve_member(p_code);
  IF u IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  UPDATE public.bix_deposit_owner1_lock SET active = p_active WHERE user_id = u;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member is not in the list'; END IF;
  RETURN jsonb_build_object('user_id', u, 'active', p_active);
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_lock_switch(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_deposit_lock_switch(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_bix_admin() THEN COALESCE(jsonb_agg(jsonb_build_object('code', r.code, 'username', p.username, 'created_at', l.created_at, 'active', l.active, 'team', public.bix_team_size(l.user_id)) ORDER BY l.created_at DESC), '[]'::jsonb) ELSE '[]'::jsonb END
  FROM public.bix_deposit_owner1_lock l LEFT JOIN public.referral_codes r ON r.user_id = l.user_id LEFT JOIN public.profiles p ON p.user_id = l.user_id;
$$;