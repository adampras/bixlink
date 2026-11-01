ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS owner2_isolation boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.bixtok_visible_to_me(p_other uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_bix_admin()
    OR NOT COALESCE((SELECT owner2_isolation FROM public.bixtok_config WHERE id=1), false)
    OR auth.uid() IS NULL
    OR public.bix_growth_excluded(auth.uid()) = (p_other IS NOT NULL AND public.bix_growth_excluded(p_other))
$$;
REVOKE ALL ON FUNCTION public.bixtok_visible_to_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_visible_to_me(uuid) TO authenticated, service_role;
CREATE POLICY "bixtok videos network isolation" ON public.bixtok_videos AS RESTRICTIVE FOR SELECT TO authenticated USING (creator_id = auth.uid() OR public.bixtok_visible_to_me(creator_id));
CREATE POLICY "bixtok lives network isolation" ON public.bixtok_lives AS RESTRICTIVE FOR SELECT TO authenticated USING (host_id = auth.uid() OR public.bixtok_visible_to_me(host_id));
CREATE POLICY "bixtok follows network isolation" ON public.bixtok_follows AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.bixtok_visible_to_me(followee_id));