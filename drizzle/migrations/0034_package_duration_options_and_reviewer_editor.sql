ALTER TABLE public.packages ADD COLUMN duration_apys jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.packages ADD COLUMN retired boolean NOT NULL DEFAULT false;
UPDATE public.packages p SET duration_apys = (SELECT jsonb_object_agg(d::text,COALESCE((SELECT q.apy FROM public.packages q WHERE (q.id=p.id OR q.clone_of=p.id) AND q.lock_days=d ORDER BY (q.id=p.id) DESC,q.id LIMIT 1),p.apy)) FROM unnest(ARRAY[30,60,90,180,360]) d) WHERE clone_of IS NULL;
UPDATE public.packages SET retired=true,enabled=false WHERE clone_of IS NOT NULL;
COMMENT ON COLUMN public.packages.clone_of IS 'DEPRECATED: cloned offerings retired; original packages use duration_apys. Historical stakes remain intact.';
CREATE OR REPLACE FUNCTION public.bix_can_manage_packages() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (public.is_bix_admin() OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='reviewer')) $$;
REVOKE ALL ON FUNCTION public.bix_can_manage_packages() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_can_manage_packages() TO authenticated;
CREATE POLICY "Package editor read" ON public.packages FOR SELECT TO authenticated USING (NOT retired AND public.bix_can_manage_packages());
CREATE OR REPLACE FUNCTION public.bix_edit_duration_package(p_id text,p_price numeric,p_apys jsonb,p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d integer; v numeric;
BEGIN
 IF NOT public.bix_can_manage_packages() THEN RAISE EXCEPTION 'Package editor access required'; END IF;
 IF p_price IS NULL OR p_price<=0 OR p_price>10000000 OR p_enabled IS NULL OR p_apys IS NULL OR jsonb_typeof(p_apys)<>'object' THEN RAISE EXCEPTION 'Invalid package values'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_apys))<>5 THEN RAISE EXCEPTION 'Five duration APYs required'; END IF;
 FOREACH d IN ARRAY ARRAY[30,60,90,180,360] LOOP
  IF NOT (p_apys ? d::text) OR jsonb_typeof(p_apys->d::text)<>'number' THEN RAISE EXCEPTION 'Invalid duration APY'; END IF;
  v := (p_apys->>d::text)::numeric;
  IF v<0 OR v>25 THEN RAISE EXCEPTION 'APY must be between 0 and 25'; END IF;
 END LOOP;
 UPDATE public.packages SET price_usd=p_price,duration_apys=p_apys,enabled=p_enabled WHERE id=p_id AND NOT retired AND clone_of IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bix_edit_duration_package(text,numeric,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_edit_duration_package(text,numeric,jsonb,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.bix_stake_package_open() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.packages WHERE id=NEW.package_id AND enabled AND NOT retired) THEN RAISE EXCEPTION 'Package is closed'; END IF; RETURN NEW; END $$;
CREATE FUNCTION public.request_bix_duration_stake(p_package text,p_days integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.packages%ROWTYPE; new_id uuid; v_bal numeric; v_apy numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_days IS NULL OR NOT(p_days=ANY(ARRAY[30,60,90,180,360])) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
 SELECT * INTO p FROM public.packages WHERE id=p_package AND enabled AND NOT retired FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable or closed'; END IF;
 v_apy := (p.duration_apys->>p_days::text)::numeric;
 IF v_apy IS NULL THEN RAISE EXCEPTION 'Duration unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||auth.uid()::text));
 v_bal := COALESCE(public.bix_vusdt_balance(auth.uid()),0);
 IF v_bal<p.price_usd THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt) VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true) RETURNING id INTO new_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.request_bix_duration_stake(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_bix_duration_stake(text,integer) TO authenticated;