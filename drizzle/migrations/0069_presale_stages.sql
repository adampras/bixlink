CREATE OR REPLACE FUNCTION public.bix_presale_save(p_config jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p jsonb; s jsonb := COALESCE(p_config->'strategies', public.bix_presale_config()->'strategies'); st jsonb := COALESCE(p_config->'stages', '[]'::jsonb); a int := COALESCE((p_config->>'activeStage')::int, 0);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF jsonb_typeof(p_config->'packages') <> 'array' THEN RAISE EXCEPTION 'Packages required'; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(p_config->'packages') LOOP
    IF (p->>'usd')::numeric <= 0 OR (p->>'bix')::numeric <= 0 OR (p->>'releaseDays')::int < 1 THEN RAISE EXCEPTION 'Invalid package values'; END IF;
  END LOOP;
  IF jsonb_typeof(st) <> 'array' OR jsonb_array_length(st) > 3 THEN RAISE EXCEPTION 'Up to 3 stages'; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(st) LOOP
    IF (p->>'price')::numeric <= 0 THEN RAISE EXCEPTION 'Stage price must be positive'; END IF;
  END LOOP;
  IF a < 0 OR a > 2 THEN RAISE EXCEPTION 'Invalid active stage'; END IF;
  IF (p_config->>'poolCap')::numeric > 10500000 OR (p_config->>'poolCap')::numeric < 0 THEN RAISE EXCEPTION 'Pool cap must be within the 10,500,000 BIX allocation'; END IF;
  IF (p_config->>'sponsorPct')::numeric < 0 OR (p_config->>'sponsorPct')::numeric > 10 THEN RAISE EXCEPTION 'Sponsor must be 0–10%%'; END IF;
  IF (s->>'hybridBixPct')::numeric NOT BETWEEN 10 AND 90 THEN RAISE EXCEPTION 'Hybrid BIX share must be 10–90%%'; END IF;
  IF (s->>'hybridDailyPct')::numeric NOT BETWEEN 0 AND 1 OR (s->>'dividendDailyPct')::numeric NOT BETWEEN 0 AND 1 THEN RAISE EXCEPTION 'Daily rates must be 0–1%%'; END IF;
  IF (s->>'founderBonusApy')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Founder bonus must be 0–100%%'; END IF;
  INSERT INTO public.app_settings (key, value) VALUES ('presale', jsonb_build_object('enabled', COALESCE((p_config->>'enabled')::boolean,false), 'sponsorPct', (p_config->>'sponsorPct')::numeric, 'poolCap', (p_config->>'poolCap')::numeric, 'packages', p_config->'packages', 'stages', st, 'activeStage', a,
    'strategies', jsonb_build_object('enabled', COALESCE((s->>'enabled')::boolean,false), 'hybridBixPct', (s->>'hybridBixPct')::numeric, 'hybridDailyPct', (s->>'hybridDailyPct')::numeric, 'dividendDailyPct', (s->>'dividendDailyPct')::numeric, 'founderBonusApy', (s->>'founderBonusApy')::numeric)))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN public.bix_presale_config();
END $function$;