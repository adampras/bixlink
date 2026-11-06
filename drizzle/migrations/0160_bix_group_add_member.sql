CREATE OR REPLACE FUNCTION public.bix_group_add_member(p_group uuid, p_query text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; nm text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bix_groups WHERE id = p_group AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Only the group host can add members'; END IF;
  SELECT user_id INTO uid FROM referral_codes WHERE upper(code) = upper(trim(p_query)) LIMIT 1;
  IF uid IS NULL THEN SELECT user_id INTO uid FROM profiles WHERE lower(username) = lower(trim(both '@' from trim(p_query))) LIMIT 1; END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'Member ID not found'; END IF;
  IF (SELECT count(*) FROM bix_group_members WHERE group_id = p_group) >= 500 THEN RAISE EXCEPTION 'Group is full (500)'; END IF;
  INSERT INTO bix_group_members (group_id, user_id) VALUES (p_group, uid) ON CONFLICT DO NOTHING;
  SELECT coalesce(username, 'member') INTO nm FROM profiles WHERE user_id = uid;
  RETURN coalesce(nm, 'member');
END $$;
REVOKE ALL ON FUNCTION public.bix_group_add_member(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_add_member(uuid, text) TO authenticated;