CREATE OR REPLACE FUNCTION public.bix_feature_enabled(p_feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT COALESCE((SELECT (value ->> p_feature)::boolean FROM public.app_settings WHERE key = 'readiness'), p_feature = 'marketEnabled'); $$;
REVOKE ALL ON FUNCTION public.bix_feature_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bix_feature_enabled(text) TO anon, authenticated, service_role;
CREATE POLICY "Public readiness settings" ON public.app_settings FOR SELECT TO anon USING (key = 'readiness');
CREATE POLICY "Identity availability" ON public.kyc_submissions AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_bix_admin() OR public.bix_feature_enabled('kycEnabled')) WITH CHECK (public.is_bix_admin() OR public.bix_feature_enabled('kycEnabled'));
CREATE TABLE public.bix_announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL,
 body text NOT NULL,
 category text NOT NULL DEFAULT 'ANNOUNCEMENT',
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bix_announcements TO authenticated;
GRANT ALL ON public.bix_announcements TO service_role;
ALTER TABLE public.bix_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published announcements" ON public.bix_announcements FOR SELECT TO anon, authenticated USING (published_at IS NOT NULL AND published_at <= now() AND public.bix_feature_enabled('marketEnabled'));
CREATE POLICY "Owner announcement management" ON public.bix_announcements FOR ALL TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());