CREATE OR REPLACE FUNCTION public.bix_avatar_in_use(p_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE avatar_path = p_name);
$$;
CREATE OR REPLACE FUNCTION public.bixtok_media_published(p_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bixtok_videos WHERE media_path = p_name AND enabled);
$$;
CREATE OR REPLACE FUNCTION public.bix_room_visible(p_code text, p_host uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_host = auth.uid() OR public.is_bix_admin() OR EXISTS (
    SELECT 1 FROM public.bix_groups g JOIN public.bix_group_members m ON m.group_id = g.id
    WHERE g.live_code = p_code AND m.user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.bix_avatar_in_use(text), public.bixtok_media_published(text), public.bix_room_visible(text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bix_avatar_in_use(text), public.bixtok_media_published(text), public.bix_room_visible(text, uuid) TO authenticated;

DROP POLICY IF EXISTS "members read rooms" ON public.bix_call_rooms;
CREATE POLICY "members read rooms" ON public.bix_call_rooms FOR SELECT TO authenticated USING (public.bix_room_visible(code, host_id));

DROP POLICY IF EXISTS "Members read comments" ON public.bixtok_comments;
CREATE POLICY "Members read comments" ON public.bixtok_comments FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_bix_admin() OR EXISTS (SELECT 1 FROM public.bixtok_videos v WHERE v.id = bixtok_comments.video_id AND v.enabled));

DROP POLICY IF EXISTS "schedules read" ON public.bixtok_live_schedules;
CREATE POLICY "schedules read" ON public.bixtok_live_schedules FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR public.bixtok_is_official(auth.uid()) OR starts_at > now() - interval '1 day');

DROP POLICY IF EXISTS "bix avatars read members" ON storage.objects;
CREATE POLICY "bix avatars read members" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'bix-avatars' AND ((storage.foldername(name))[1] = (select auth.uid())::text OR public.bix_avatar_in_use(name)));

DROP POLICY IF EXISTS "bixtok media read" ON storage.objects;
CREATE POLICY "bixtok media read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'bixtok-media' AND ((storage.foldername(name))[1] = (select auth.uid())::text OR public.is_bix_admin() OR public.bixtok_media_published(name)));