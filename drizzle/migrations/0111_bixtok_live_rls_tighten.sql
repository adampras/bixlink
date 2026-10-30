DROP POLICY IF EXISTS "bixtok lives read" ON public.bixtok_lives;
CREATE POLICY "bixtok lives read" ON public.bixtok_lives FOR SELECT TO authenticated
USING (status = 'live' OR host_id = auth.uid() OR public.is_bix_admin());
DROP POLICY IF EXISTS "bixtok msgs read" ON public.bixtok_live_messages;
CREATE POLICY "bixtok msgs read" ON public.bixtok_live_messages FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_bix_admin() OR EXISTS (
  SELECT 1 FROM public.bixtok_lives l WHERE l.id = live_id AND (l.status = 'live' OR l.host_id = auth.uid())));