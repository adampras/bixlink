DROP POLICY IF EXISTS "bixtok lives network isolation" ON public.bixtok_lives;
CREATE POLICY "bixtok lives network isolation" ON public.bixtok_lives AS RESTRICTIVE FOR SELECT TO authenticated
USING (host_id = auth.uid() OR kind = 'official' OR public.bixtok_is_official(host_id) OR public.bixtok_visible_to_me(host_id));