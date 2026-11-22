CREATE OR REPLACE FUNCTION public.bix_is_owner1(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT COALESCE(public.bix_is_owner1_user(p_user), false) $$;
REVOKE EXECUTE ON FUNCTION public.bix_is_owner1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_is_owner1(uuid) TO authenticated, service_role;