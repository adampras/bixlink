ALTER TABLE public.bix_group_members ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.bix_group_can_manage(p_group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM bix_group_members WHERE group_id = p_group AND user_id = auth.uid() AND is_admin)
    OR (public.bix_is_owner1() AND public.bix_group_is_member(p_group)));
$$;

CREATE OR REPLACE FUNCTION public.bix_group_set_admin(p_group uuid, p_user uuid, p_on boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = auth.uid()) OR (public.bix_is_owner1() AND public.bix_group_is_member(p_group))) THEN RAISE EXCEPTION 'Only the group host can appoint admins'; END IF;
  IF EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = p_user) THEN RAISE EXCEPTION 'Host is already the group owner'; END IF;
  UPDATE bix_group_members SET is_admin = p_on WHERE group_id = p_group AND user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not in group'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.bix_group_set_admin(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bix_group_can_manage(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_group_add_member(p_group uuid, p_query text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid; nm text; q text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT public.bix_group_can_manage(p_group) THEN RAISE EXCEPTION 'Only the group host or admins can add members'; END IF;
  q := trim(p_query);
  IF q ~ '^[0-9]+$' THEN q := 'BIX-' || q; END IF;
  SELECT user_id INTO uid FROM referral_codes WHERE upper(code) = upper(q) LIMIT 1;
  IF uid IS NULL THEN SELECT user_id INTO uid FROM profiles WHERE lower(username) = lower(trim(both '@' from trim(p_query))) LIMIT 1; END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'Member ID not found'; END IF;
  IF (SELECT count(*) FROM bix_group_members WHERE group_id = p_group) >= 500 THEN RAISE EXCEPTION 'Group is full (500)'; END IF;
  INSERT INTO bix_group_members (group_id, user_id) VALUES (p_group, uid) ON CONFLICT DO NOTHING;
  SELECT coalesce(username, 'member') INTO nm FROM profiles WHERE user_id = uid;
  RETURN coalesce(nm, 'member');
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_remove_member(p_group uuid, p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE host boolean;
BEGIN
  host := EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = auth.uid()) OR (public.bix_is_owner1() AND public.bix_group_is_member(p_group));
  IF NOT public.bix_group_can_manage(p_group) THEN RAISE EXCEPTION 'Only the group host or admins can remove members'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Use Leave group instead'; END IF;
  IF EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = p_user) THEN RAISE EXCEPTION 'Host cannot be removed'; END IF;
  IF NOT host AND EXISTS (SELECT 1 FROM bix_group_members WHERE group_id = p_group AND user_id = p_user AND is_admin) THEN RAISE EXCEPTION 'Only the host can remove an admin'; END IF;
  DELETE FROM bix_group_members WHERE group_id = p_group AND user_id = p_user;
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_roster(p_group uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.user_id, 'code', rc.code, 'name', coalesce(p.username, p.full_name, rc.code, 'member'), 'host', m.user_id = g.owner_id, 'admin', m.is_admin, 'joined_at', m.joined_at) ORDER BY (m.user_id = g.owner_id) DESC, m.is_admin DESC, m.joined_at), '[]'::jsonb)
  FROM bix_group_members m JOIN bix_groups g ON g.id = m.group_id
  LEFT JOIN referral_codes rc ON rc.user_id = m.user_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  WHERE m.group_id = p_group AND auth.uid() IS NOT NULL AND public.bix_group_is_member(p_group);
$$;