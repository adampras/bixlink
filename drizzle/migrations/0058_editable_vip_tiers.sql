CREATE OR REPLACE FUNCTION public.bix_vip_tiers() RETURNS TABLE(level int,target_usd numeric,reward_bix numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v jsonb;
BEGIN
SELECT value->'tiers' INTO v FROM public.app_settings WHERE key='vip_tiers';
IF v IS NOT NULL AND jsonb_typeof(v)='array' AND jsonb_array_length(v)>0 THEN
 RETURN QUERY SELECT (e->>'level')::int,(e->>'targetUsd')::numeric,(e->>'rewardBix')::numeric FROM jsonb_array_elements(v) e
  WHERE (e->>'level')::int BETWEEN 1 AND 10 AND (e->>'targetUsd')::numeric>0 AND (e->>'rewardBix')::numeric>0 ORDER BY 1;
ELSE
 RETURN QUERY SELECT * FROM (VALUES (1,5000::numeric,1000::numeric),(2,10000,2500),(3,30000,10000),(4,50000,15000),(5,100000,20000),(6,200000,25000),(7,300000,50000),(8,500000,100000),(9,1000000,200000),(10,5000000,500000)) t(level,target_usd,reward_bix);
END IF;
END $$;
REVOKE ALL ON FUNCTION public.bix_vip_tiers() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_vip_tiers() TO authenticated;