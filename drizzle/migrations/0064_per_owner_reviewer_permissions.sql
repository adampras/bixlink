CREATE OR REPLACE FUNCTION public.bix_reviewer_can(p_section text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='reviewer')
    AND COALESCE(
      (SELECT (value->'users'->(auth.uid()::text)->>p_section)::boolean FROM public.app_settings WHERE key='reviewer_permissions'),
      (SELECT (value->>p_section)::boolean FROM public.app_settings WHERE key='reviewer_permissions'),
      true)
$function$;