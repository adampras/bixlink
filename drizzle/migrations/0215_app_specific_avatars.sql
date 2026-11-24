ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bixtok_avatar_path text, ADD COLUMN IF NOT EXISTS bixcall_avatar_path text;

CREATE OR REPLACE FUNCTION public.bix_profile_set_app_avatar(p_app text, p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_path IS NOT NULL AND (p_path NOT LIKE auth.uid()::text || '/%' OR length(p_path) > 200) THEN RAISE EXCEPTION 'Invalid photo'; END IF;
  IF p_app = 'bixtok' THEN UPDATE profiles SET bixtok_avatar_path = p_path WHERE user_id = auth.uid();
  ELSIF p_app = 'bixcall' THEN UPDATE profiles SET bixcall_avatar_path = p_path WHERE user_id = auth.uid();
  ELSE RAISE EXCEPTION 'Invalid app'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bix_profile_set_app_avatar(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_profile_set_app_avatar(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_profile_card(p_user uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('user_id', p.user_id, 'name', coalesce(nullif(p.username,''), p.full_name, 'Member'), 'avatar_path', p.avatar_path,
    'bixtok_avatar_path', p.bixtok_avatar_path, 'bixcall_avatar_path', p.bixcall_avatar_path, 'status_text', p.status_text,
    'story', CASE WHEN EXISTS (SELECT 1 FROM bix_stories s WHERE s.user_id = p.user_id AND s.expires_at > now()) AND bix_story_can_view(auth.uid(), p.user_id)
      THEN CASE WHEN EXISTS (SELECT 1 FROM bix_stories s WHERE s.user_id = p.user_id AND s.expires_at > now() AND NOT EXISTS (SELECT 1 FROM bix_story_views v WHERE v.story_id = s.id AND v.viewer_id = auth.uid())) AND p.user_id <> auth.uid() THEN 'new' ELSE 'seen' END
      ELSE NULL END)
  FROM profiles p WHERE p.user_id = p_user AND auth.uid() IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.bixtok_creator_search(p_q text)
RETURNS TABLE(user_id uuid, name text, posts bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT v.creator_id, max(v.creator_name), count(*)
  FROM bixtok_videos v
  WHERE auth.uid() IS NOT NULL AND v.enabled AND v.creator_id IS NOT NULL
    AND length(trim(coalesce(p_q,''))) >= 1
    AND v.creator_name ILIKE '%' || replace(replace(ltrim(trim(p_q),'@'),'%',''),'_','\_') || '%'
  GROUP BY v.creator_id ORDER BY count(*) DESC LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.bixtok_creator_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_creator_search(text) TO authenticated;