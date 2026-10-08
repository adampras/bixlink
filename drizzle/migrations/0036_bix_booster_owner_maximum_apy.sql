CREATE OR REPLACE FUNCTION public.bix_stake_apy(p_amount numeric, p_days int)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH cap AS (SELECT LEAST(45,GREATEST(8,COALESCE((SELECT (value->>'maxApy')::numeric FROM public.app_settings WHERE key='booster'),45))) AS maximum), tier AS (SELECT (CASE WHEN p_days>=540 THEN 20 WHEN p_days>=360 THEN 17 WHEN p_days>=180 THEN 14 WHEN p_days>=90 THEN 11 ELSE 8 END)+(CASE WHEN p_amount>=10000 THEN 5 WHEN p_amount>=5000 THEN 4 WHEN p_amount>=1000 THEN 3 WHEN p_amount>=500 THEN 2 WHEN p_amount>=100 THEN 1 ELSE 0 END) AS original)
SELECT ROUND(LEAST(maximum,8+(original-8)*(maximum-8)/17),2) FROM cap,tier;
$$;
REVOKE ALL ON FUNCTION public.bix_stake_apy(numeric,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_stake_apy(numeric,int) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bix_validate_booster_maximum() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
IF NEW.key='booster' AND NEW.value ? 'maxApy' THEN
IF jsonb_typeof(NEW.value->'maxApy') <> 'number' OR (NEW.value->>'maxApy')::numeric NOT BETWEEN 8 AND 45 THEN RAISE EXCEPTION 'BIX Booster maximum must be between 8 and 45'; END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER bix_booster_maximum_validation BEFORE INSERT OR UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.bix_validate_booster_maximum();
COMMENT ON FUNCTION public.bix_stake_apy(numeric,int) IS 'Native BIX annual projection only; owner maxApy defaults to 45. Existing bix_stakes APY snapshots and USDT package terms are unchanged.';