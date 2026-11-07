CREATE TABLE IF NOT EXISTS public.bix_deposit_quota_routes (
  sponsor_id uuid PRIMARY KEY,
  max_direct int NOT NULL DEFAULT 5 CHECK (max_direct >= 0 AND max_direct <= 10000),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_deposit_quota_routes TO authenticated;
GRANT ALL ON public.bix_deposit_quota_routes TO service_role;
ALTER TABLE public.bix_deposit_quota_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner1 reads quota routes" ON public.bix_deposit_quota_routes FOR SELECT TO authenticated USING (public.is_bix_admin());

-- True when p_child is beyond the first max_direct direct sponsors of p_parent (by signup order).
CREATE OR REPLACE FUNCTION public.bix_quota_overflow(p_parent uuid, p_child uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bix_deposit_quota_routes q
    WHERE q.sponsor_id = p_parent AND (
      SELECT count(*) FROM public.referral_codes r, public.referral_codes c
      WHERE c.user_id = p_child AND r.referred_by = p_parent
        AND (r.created_at, r.user_id) < (c.created_at, c.user_id)
    ) >= q.max_direct)
$$;
REVOKE ALL ON FUNCTION public.bix_quota_overflow(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_owner(p_user uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := p_user; nxt uuid; seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  LOOP
    IF EXISTS (SELECT 1 FROM public.bix_deposit_owner1_lock WHERE user_id = cur) THEN RETURN NULL; END IF;
    SELECT referred_by INTO nxt FROM public.referral_codes WHERE user_id = cur;
    -- Direct sponsor beyond the owner-set quota of a routed sponsor: this branch uses Owner 1 wallets.
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

CREATE OR REPLACE FUNCTION public.bix_deposit_quota_set(p_code text, p_max int, p_on boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  SELECT user_id INTO u FROM public.referral_codes WHERE upper(code) = upper(trim(p_code));
  IF u IS NULL THEN SELECT user_id INTO u FROM public.profiles WHERE lower(username) = lower(trim(p_code)); END IF;
  IF u IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF p_max IS NULL OR p_max < 0 OR p_max > 10000 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  IF p_on THEN
    INSERT INTO public.bix_deposit_quota_routes(sponsor_id, max_direct, created_by) VALUES (u, p_max, auth.uid())
    ON CONFLICT (sponsor_id) DO UPDATE SET max_direct = EXCLUDED.max_direct;
  ELSE DELETE FROM public.bix_deposit_quota_routes WHERE sponsor_id = u; END IF;
  RETURN jsonb_build_object('user_id', u, 'on', p_on);
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_quota_set(text, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_deposit_quota_set(text, int, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_deposit_quota_list()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_bix_admin() THEN COALESCE(jsonb_agg(jsonb_build_object(
    'code', rc.code, 'username', p.username, 'max_direct', q.max_direct, 'created_at', q.created_at,
    'directs', (SELECT COALESCE(jsonb_agg(jsonb_build_object('code', d.code, 'username', dp.username, 'routed', (d.rn > q.max_direct)) ORDER BY d.rn), '[]'::jsonb)
      FROM (SELECT r.user_id, r.code, row_number() OVER (ORDER BY r.created_at, r.user_id) rn FROM public.referral_codes r WHERE r.referred_by = q.sponsor_id) d
      LEFT JOIN public.profiles dp ON dp.user_id = d.user_id)
  ) ORDER BY q.created_at DESC), '[]'::jsonb) ELSE '[]'::jsonb END
  FROM public.bix_deposit_quota_routes q LEFT JOIN public.referral_codes rc ON rc.user_id = q.sponsor_id LEFT JOIN public.profiles p ON p.user_id = q.sponsor_id;
$$;
REVOKE ALL ON FUNCTION public.bix_deposit_quota_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_deposit_quota_list() TO authenticated;