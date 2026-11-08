ALTER TABLE public.bix_groups ADD COLUMN IF NOT EXISTS avatar_path text;

CREATE OR REPLACE FUNCTION public.bix_avatar_in_use(p_name text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE avatar_path = p_name)
      OR EXISTS (SELECT 1 FROM public.bix_groups g WHERE g.avatar_path = p_name AND public.bix_group_is_member(g.id));
$$;

CREATE OR REPLACE FUNCTION public.bix_group_set_avatar(p_group uuid, p_path text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Only the group host can change the photo'; END IF;
  IF p_path IS NOT NULL AND split_part(p_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid photo path'; END IF;
  UPDATE bix_groups SET avatar_path = p_path WHERE id = p_group;
END $$;
REVOKE ALL ON FUNCTION public.bix_group_set_avatar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_set_avatar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_group_candidates()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH RECURSIVE down AS (
    SELECT r.user_id, 1 AS depth FROM referral_codes r WHERE r.referred_by = auth.uid()
    UNION
    SELECT r.user_id, d.depth + 1 FROM referral_codes r JOIN down d ON r.referred_by = d.user_id WHERE d.depth < 30
  ), up AS (SELECT referred_by AS user_id FROM referral_codes WHERE user_id = auth.uid() AND referred_by IS NOT NULL),
  ids AS (SELECT user_id, min(depth) AS depth FROM down GROUP BY user_id UNION ALL SELECT user_id, 0 FROM up)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.user_id, 'code', rc.code, 'name', coalesce(p.username, p.full_name, rc.code), 'avatar_path', p.avatar_path, 'depth', i.depth) ORDER BY i.depth, rc.code), '[]'::jsonb)
  FROM (SELECT * FROM ids LIMIT 500) i
  LEFT JOIN referral_codes rc ON rc.user_id = i.user_id
  LEFT JOIN profiles p ON p.user_id = i.user_id
  WHERE auth.uid() IS NOT NULL AND i.user_id <> auth.uid();
$$;
REVOKE ALL ON FUNCTION public.bix_group_candidates() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_candidates() TO authenticated;