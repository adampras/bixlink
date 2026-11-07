CREATE OR REPLACE FUNCTION public.bix_resolve_member(p_q text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q text := trim(coalesce(p_q,'')); u uuid; d text;
BEGIN
  IF q = '' THEN RETURN NULL; END IF;
  IF q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT user_id INTO u FROM public.referral_codes WHERE user_id = q::uuid; IF u IS NOT NULL THEN RETURN u; END IF;
  END IF;
  SELECT user_id INTO u FROM public.referral_codes WHERE upper(code) = upper(q) LIMIT 1; IF u IS NOT NULL THEN RETURN u; END IF;
  d := regexp_replace(q, '\D', '', 'g');
  IF d <> '' AND q ~* '^(bix)?[- ]?[0-9]+$' THEN
    SELECT user_id INTO u FROM public.referral_codes WHERE upper(code) = 'BIX-' || d LIMIT 1; IF u IS NOT NULL THEN RETURN u; END IF;
  END IF;
  SELECT user_id INTO u FROM public.profiles WHERE lower(username) = lower(ltrim(q, '@')) LIMIT 1; IF u IS NOT NULL THEN RETURN u; END IF;
  IF position('@' in q) > 1 THEN SELECT id INTO u FROM auth.users WHERE lower(email) = lower(q) LIMIT 1; END IF;
  RETURN u;
END $$;
REVOKE ALL ON FUNCTION public.bix_resolve_member(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_team_size(p_root uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE d(id, path) AS (
    SELECT user_id, ARRAY[p_root, user_id] FROM public.referral_codes WHERE referred_by = p_root AND user_id <> p_root
    UNION ALL SELECT r.user_id, d.path || r.user_id FROM public.referral_codes r JOIN d ON r.referred_by = d.id WHERE NOT r.user_id = ANY(d.path) AND array_length(d.path,1) < 80
  ) SELECT count(DISTINCT id)::int FROM d
$$;
REVOKE ALL ON FUNCTION public.bix_team_size(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_route_preview(p_q text, p_max int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid; m int := greatest(0, least(coalesce(p_max,5), 10000));
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  u := public.bix_resolve_member(p_q);
  IF u IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true,
    'code', (SELECT code FROM public.referral_codes WHERE user_id = u),
    'username', (SELECT username FROM public.profiles WHERE user_id = u),
    'name', (SELECT full_name FROM public.profiles WHERE user_id = u),
    'email', (SELECT email FROM auth.users WHERE id = u),
    'sponsor', (SELECT s.code FROM public.referral_codes r JOIN public.referral_codes s ON s.user_id = r.referred_by WHERE r.user_id = u),
    'team', public.bix_team_size(u),
    'locked', EXISTS (SELECT 1 FROM public.bix_deposit_owner1_lock WHERE user_id = u),
    'quota', (SELECT max_direct FROM public.bix_deposit_quota_routes WHERE sponsor_id = u),
    'directs', (SELECT COALESCE(jsonb_agg(jsonb_build_object('rn', d.rn, 'code', d.code, 'username', p.username, 'team', public.bix_team_size(d.user_id), 'routed', d.rn > m) ORDER BY d.rn), '[]'::jsonb)
      FROM (SELECT user_id, code, row_number() OVER (ORDER BY created_at, user_id) rn FROM public.referral_codes WHERE referred_by = u) d
      LEFT JOIN public.profiles p ON p.user_id = d.user_id));
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_route_preview(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_deposit_route_preview(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_quota_set(p_code text, p_max int, p_on boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  u := public.bix_resolve_member(p_code);
  IF u IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF p_max IS NULL OR p_max < 0 OR p_max > 10000 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  IF p_on THEN
    INSERT INTO public.bix_deposit_quota_routes(sponsor_id, max_direct, created_by) VALUES (u, p_max, auth.uid())
    ON CONFLICT (sponsor_id) DO UPDATE SET max_direct = EXCLUDED.max_direct;
  ELSE DELETE FROM public.bix_deposit_quota_routes WHERE sponsor_id = u; END IF;
  RETURN jsonb_build_object('user_id', u, 'on', p_on);
END $$;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_owner1(p_code text, p_lock boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  u := public.bix_resolve_member(p_code);
  IF u IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF p_lock THEN INSERT INTO public.bix_deposit_owner1_lock(user_id, locked_by) VALUES (u, auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  ELSE DELETE FROM public.bix_deposit_owner1_lock WHERE user_id = u; END IF;
  RETURN jsonb_build_object('user_id', u, 'locked', p_lock);
END $$;

CREATE OR REPLACE FUNCTION public.bix_deposit_lock_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_bix_admin() THEN COALESCE(jsonb_agg(jsonb_build_object('code', r.code, 'username', p.username, 'created_at', l.created_at, 'team', public.bix_team_size(l.user_id)) ORDER BY l.created_at DESC), '[]'::jsonb) ELSE '[]'::jsonb END
  FROM public.bix_deposit_owner1_lock l LEFT JOIN public.referral_codes r ON r.user_id = l.user_id LEFT JOIN public.profiles p ON p.user_id = l.user_id;
$$;