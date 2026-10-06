DROP POLICY IF EXISTS "Member settings read" ON public.app_settings;
CREATE POLICY "Member settings read" ON public.app_settings FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND key = ANY (ARRAY['booster','booster_visual','referrals','swap','bix_market','bix_pay','landing_content','wallet','readiness','deposit_wallets','usdt_transfer','unstake']));

DROP POLICY IF EXISTS "Member package read" ON public.packages;
CREATE POLICY "Member package read" ON public.packages FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.bix_content_published(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'landing_content' AND position(p_name in value::text) > 0)
$$;

DROP POLICY IF EXISTS "Content image reads" ON storage.objects;
CREATE POLICY "Content image reads" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'bix-content' AND (public.bix_content_published(name) OR public.is_bix_admin()));