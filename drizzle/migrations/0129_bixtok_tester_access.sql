ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS tester_code text;
CREATE OR REPLACE FUNCTION public.bixtok_can_bypass() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.bix_is_owner1() OR EXISTS (
    SELECT 1 FROM public.bixtok_config c JOIN public.referral_codes r ON upper(r.code)=upper(c.tester_code)
    WHERE c.id=1 AND r.user_id=auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.bixtok_can_bypass() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_can_bypass() TO authenticated, service_role;