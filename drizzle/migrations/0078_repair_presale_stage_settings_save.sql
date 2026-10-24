CREATE OR REPLACE FUNCTION public.bix_presale_save(p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE p jsonb; v_cfg jsonb; st jsonb; a int;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_bix_admin() OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified owner access required'; END IF;
 v_cfg := public.bix_presale_config() || p_config;
 st := COALESCE(v_cfg->'stages', jsonb_build_array(jsonb_build_object('price', ((v_cfg->'packages'->0->>'usd')::numeric / NULLIF((v_cfg->'packages'->0->>'bix')::numeric,0))),jsonb_build_object('price',0.65),jsonb_build_object('price',0.8)));
 a := COALESCE((v_cfg->>'activeStage')::int,0);
 IF jsonb_typeof(v_cfg->'packages') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Packages required'; END IF;
 IF jsonb_array_length(v_cfg->'packages') NOT BETWEEN 1 AND 14 THEN RAISE EXCEPTION 'Choose 1 to 14 packages'; END IF;
 FOR p IN SELECT * FROM jsonb_array_elements(v_cfg->'packages') LOOP
 IF COALESCE((p->>'usd')::numeric,0)<=0 OR COALESCE((p->>'bix')::numeric,0)<=0 OR COALESCE((p->>'releaseDays')::int,0)<1 THEN RAISE EXCEPTION 'Invalid package values'; END IF;
 END LOOP;
 IF jsonb_typeof(st) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Three stages required'; END IF;
 IF jsonb_array_length(st)<>3 THEN RAISE EXCEPTION 'Three stages required'; END IF;
 FOR p IN SELECT * FROM jsonb_array_elements(st) LOOP
 IF COALESCE((p->>'price')::numeric,0)<=0 THEN RAISE EXCEPTION 'Stage price must be positive'; END IF;
 END LOOP;
 IF a NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'Invalid active stage'; END IF;
 IF COALESCE((v_cfg->>'poolCap')::numeric,-1) NOT BETWEEN 0 AND 3150000 THEN RAISE EXCEPTION 'Pool cap must be within 3,150,000 BIX'; END IF;
 IF COALESCE((v_cfg->>'sponsorPct')::numeric,-1) NOT BETWEEN 0 AND 10 THEN RAISE EXCEPTION 'Sponsor must be 0 to 10 percent'; END IF;
 p := v_cfg->'strategies';
 IF COALESCE((p->>'hybridBixPct')::numeric,-1) NOT BETWEEN 10 AND 90 OR COALESCE((p->>'hybridDailyPct')::numeric,-1) NOT BETWEEN 0 AND 1 OR COALESCE((p->>'dividendDailyPct')::numeric,-1) NOT BETWEEN 0 AND 1 OR COALESCE((p->>'founderBonusApy')::numeric,-1) NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid strategy settings'; END IF;
 p := v_cfg->'sovereign';
 IF COALESCE((p->>'usd')::numeric,0)<=0 OR COALESCE((p->>'bix')::numeric,0)<=0 OR COALESCE((p->>'releaseDays')::int,0)<1 OR COALESCE((p->>'slots')::int,0) NOT BETWEEN 1 AND 21 THEN RAISE EXCEPTION 'Invalid Sovereign settings'; END IF;
 v_cfg := v_cfg || jsonb_build_object('stages',st,'activeStage',a,'enabled',COALESCE((v_cfg->>'enabled')::boolean,false));
 INSERT INTO public.app_settings(key,value) VALUES ('presale',v_cfg) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
 RETURN public.bix_presale_config();
END $function$;
REVOKE ALL ON FUNCTION public.bix_presale_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_save(jsonb) TO authenticated, service_role;