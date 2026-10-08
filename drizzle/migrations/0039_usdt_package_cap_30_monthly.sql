CREATE OR REPLACE FUNCTION public.bix_edit_duration_package(p_id text, p_price numeric, p_apys jsonb, p_enabled boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d integer; v numeric;
BEGIN
 IF NOT public.bix_can_manage_packages() THEN RAISE EXCEPTION 'Package editor access required'; END IF;
 IF p_price IS NULL OR p_price<=0 OR p_price>10000000 OR p_enabled IS NULL OR p_apys IS NULL OR jsonb_typeof(p_apys)<>'object' THEN RAISE EXCEPTION 'Invalid package values'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_apys))<>5 THEN RAISE EXCEPTION 'Five duration APYs required'; END IF;
 FOREACH d IN ARRAY ARRAY[30,60,90,180,360] LOOP
  IF NOT (p_apys ? d::text) OR jsonb_typeof(p_apys->d::text)<>'number' THEN RAISE EXCEPTION 'Invalid duration APY'; END IF;
  v := (p_apys->>d::text)::numeric;
  IF v<0 OR v>360 THEN RAISE EXCEPTION 'Annual APY must be between 0 and 360 (max 30%% per month)'; END IF;
 END LOOP;
 UPDATE public.packages SET price_usd=p_price,duration_apys=p_apys,enabled=p_enabled WHERE id=p_id AND NOT retired AND clone_of IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable'; END IF;
END $function$;