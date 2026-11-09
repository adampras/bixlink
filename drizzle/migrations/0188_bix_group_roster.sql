CREATE OR REPLACE FUNCTION public.bix_group_roster(p_group uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.user_id, 'code', rc.code, 'name', coalesce(p.username, p.full_name, rc.code, 'member'), 'host', m.user_id = g.owner_id, 'joined_at', m.joined_at) ORDER BY (m.user_id = g.owner_id) DESC, m.joined_at), '[]'::jsonb)
  FROM bix_group_members m JOIN bix_groups g ON g.id = m.group_id
  LEFT JOIN referral_codes rc ON rc.user_id = m.user_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  WHERE m.group_id = p_group AND auth.uid() IS NOT NULL AND public.bix_group_is_member(p_group);
$$;
REVOKE ALL ON FUNCTION public.bix_group_roster(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_roster(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_group_remove_member(p_group uuid, p_user uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Only the group host can remove members'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Host cannot remove themselves'; END IF;
  DELETE FROM bix_group_members WHERE group_id = p_group AND user_id = p_user;
END $$;
REVOKE ALL ON FUNCTION public.bix_group_remove_member(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_remove_member(uuid, uuid) TO authenticated;