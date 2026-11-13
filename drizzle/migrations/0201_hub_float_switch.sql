CREATE OR REPLACE FUNCTION public.bix_hub_float_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE m text := COALESCE(public.bix_design_cfg()->>'hub_float','scoped'); u uuid := auth.uid(); o1 boolean := false;
BEGIN
  IF u IS NOT NULL THEN o1 := public.bix_is_owner1(); END IF;
  RETURN jsonb_build_object('mode', CASE WHEN o1 THEN m ELSE NULL END, 'on',
    m='public' OR (m='scoped' AND u IS NOT NULL AND (o1 OR EXISTS(SELECT 1 FROM public.bix_design_whitelist w WHERE w.user_id=u))));
END $$;
REVOKE ALL ON FUNCTION public.bix_hub_float_access() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.bix_hub_float_access() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bix_hub_float_set(p_mode text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
IF p_mode NOT IN ('off','scoped','public') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
INSERT INTO public.app_settings(key,value) VALUES('bix_design_release', public.bix_design_cfg() || jsonb_build_object('hub_float',p_mode))
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
RETURN jsonb_build_object('mode',p_mode); END $$;
REVOKE ALL ON FUNCTION public.bix_hub_float_set(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.bix_hub_float_set(text) TO authenticated,service_role;