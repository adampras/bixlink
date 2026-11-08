CREATE OR REPLACE FUNCTION public.bix_surprise_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1);
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  RETURN public.bix_surprise_status() || jsonb_build_object('bank', (SELECT count(*) FROM public.bix_surprise_bank), 'list', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', COALESCE(NULLIF(p.username,''), NULLIF(p.full_name,''), left(a.user_id::text, 8)), 'result', a.result, 'amount', a.amount, 'at', COALESCE(a.answered_at, a.created_at)) ORDER BY a.created_at DESC) FROM public.bix_surprise_attempts a LEFT JOIN public.profiles p ON p.user_id = a.user_id WHERE a.round = v_round), '[]'::jsonb));
END $$;