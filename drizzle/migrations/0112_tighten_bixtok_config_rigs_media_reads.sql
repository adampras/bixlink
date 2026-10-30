DROP POLICY IF EXISTS "bixtok config read" ON public.bixtok_config;
CREATE POLICY "bixtok config read" ON public.bixtok_config
  FOR SELECT TO authenticated
  USING (id = 1);

DROP POLICY IF EXISTS "Public reads mining rigs" ON public.bix_mining_rigs;
CREATE POLICY "Public reads mining rigs" ON public.bix_mining_rigs
  FOR SELECT TO anon, authenticated
  USING (enabled OR public.is_bix_admin());

DROP POLICY IF EXISTS "bixtok media read" ON storage.objects;
CREATE POLICY "bixtok media read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bixtok-media'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.is_bix_admin()
      OR EXISTS (
        SELECT 1 FROM public.bixtok_videos v
        WHERE v.media_path = storage.objects.name AND v.enabled
      )
    )
  );