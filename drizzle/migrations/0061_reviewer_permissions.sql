CREATE OR REPLACE FUNCTION public.bix_reviewer_can(p_section text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='reviewer')
    AND COALESCE((SELECT (value->>p_section)::boolean FROM public.app_settings WHERE key='reviewer_permissions'), true)
$$;
REVOKE ALL ON FUNCTION public.bix_reviewer_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_reviewer_can(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_can_manage_packages() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.is_bix_admin() OR public.bix_reviewer_can('apy'))
$$;

CREATE OR REPLACE FUNCTION public.bix_reviewer_permission_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE section text;
BEGIN
  IF auth.uid() IS NULL OR public.is_bix_admin() THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='reviewer') THEN RETURN NEW; END IF;
  section := CASE NEW.key WHEN 'bix_market' THEN 'market' WHEN 'referrals' THEN 'referral' WHEN 'deposit_wallets' THEN 'wallet' ELSE NULL END;
  IF section IS NULL OR NOT public.bix_reviewer_can(section) THEN RAISE EXCEPTION 'This Owner 2 section is turned off'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bix_reviewer_permission_guard ON public.app_settings;
CREATE TRIGGER bix_reviewer_permission_guard BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.bix_reviewer_permission_guard();

INSERT INTO public.app_settings(key,value) VALUES ('reviewer_permissions','{"apy":true,"wallet":true,"market":true,"referral":true}'::jsonb) ON CONFLICT (key) DO NOTHING;