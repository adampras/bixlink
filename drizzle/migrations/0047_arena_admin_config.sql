REVOKE EXECUTE ON FUNCTION public.bix_arena_config() FROM authenticated;
CREATE OR REPLACE FUNCTION public.bix_arena_admin_config() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  RETURN jsonb_build_object('config', public.bix_arena_config(), 'prizes', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.season DESC, p.rank) FROM public.bix_season_prizes p), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.bix_arena_admin_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_arena_admin_config() TO authenticated;