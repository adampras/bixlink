CREATE TABLE public.bixgo_map_config (id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false, reward_bix numeric(18,6) NOT NULL DEFAULT 0 CHECK(reward_bix>=0 AND reward_bix<=1000), daily_limit integer NOT NULL DEFAULT 5 CHECK(daily_limit BETWEEN 1 AND 20), budget_bix numeric(18,6) NOT NULL DEFAULT 0 CHECK(budget_bix BETWEEN 0 AND 1000000));
GRANT SELECT ON public.bixgo_map_config TO authenticated; GRANT ALL ON public.bixgo_map_config TO service_role;
ALTER TABLE public.bixgo_map_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY map_config_read ON public.bixgo_map_config FOR SELECT TO authenticated USING(true);
CREATE TABLE public.bixgo_map_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL CHECK(length(name) BETWEEN 3 AND 100), category text NOT NULL CHECK(category IN ('entrance','motor_lane','home','store','public')), lat double precision NOT NULL CHECK(lat BETWEEN -90 AND 90), lng double precision NOT NULL CHECK(lng BETWEEN -180 AND 180), detail text NOT NULL DEFAULT '' CHECK(length(detail)<=200), driver_note text NOT NULL DEFAULT '' CHECK(length(driver_note)<=120), photo_path text, is_public boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','archived')), review_note text NOT NULL DEFAULT '', reward_bix numeric(18,6) NOT NULL DEFAULT 0 CHECK(reward_bix BETWEEN 0 AND 1000), created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid, claimed_at timestamptz, allocation_id uuid UNIQUE);
GRANT SELECT ON public.bixgo_map_points TO authenticated; GRANT ALL ON public.bixgo_map_points TO service_role;
ALTER TABLE public.bixgo_map_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY map_points_read ON public.bixgo_map_points FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.bix_is_owner1());
CREATE INDEX bixgo_map_owner ON public.bixgo_map_points(user_id,created_at DESC); CREATE INDEX bixgo_map_location ON public.bixgo_map_points(lat,lng) WHERE status='approved' AND is_public;
CREATE POLICY map_photo_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='bixgo-map' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY map_photo_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='bixgo-map' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.bix_is_owner1()));
CREATE POLICY map_photo_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='bixgo-map' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.bixgo_map_points WHERE photo_path=name));
CREATE FUNCTION public.bixgo_map_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT to_jsonb(c) FROM public.bixgo_map_config c WHERE id),'{"enabled":false,"reward_bix":0,"daily_limit":5,"budget_bix":0}'::jsonb) $$;
CREATE FUNCTION public.bixgo_map_pool_used() RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT sum(amount_bix) FROM public.bix_mining_conversions),0)+coalesce((SELECT sum(reward_bix) FROM public.bixgo_map_points WHERE status IN ('approved','archived')),0) $$;
CREATE FUNCTION public.bixgo_map_save(p_enabled boolean,p_reward numeric,p_limit integer,p_budget numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
IF p_enabled IS NULL OR p_reward IS NULL OR p_budget IS NULL OR p_limit IS NULL OR p_reward::text IN ('NaN','Infinity','-Infinity') OR p_budget::text IN ('NaN','Infinity','-Infinity') OR p_reward<0 OR p_reward>1000 OR p_budget<0 OR p_budget>1000000 OR p_limit<1 OR p_limit>20 THEN RAISE EXCEPTION 'Invalid map settings'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bix_mining_marketing_pool'));
IF p_budget < coalesce((SELECT sum(reward_bix) FROM public.bixgo_map_points WHERE status IN ('approved','archived')),0) THEN RAISE EXCEPTION 'Budget is below reserved rewards'; END IF;
IF p_enabled AND p_reward>0 AND p_budget<p_reward THEN RAISE EXCEPTION 'Set a reward budget first'; END IF;
INSERT INTO public.bixgo_map_config(id,enabled,reward_bix,daily_limit,budget_bix) VALUES(true,p_enabled,p_reward,p_limit,p_budget) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,reward_bix=excluded.reward_bix,daily_limit=excluded.daily_limit,budget_bix=excluded.budget_bix;
RETURN public.bixgo_map_settings(); END $$;
CREATE FUNCTION public.bixgo_map_submit(p_name text,p_category text,p_lat double precision,p_lng double precision,p_detail text,p_note text,p_photo text,p_public boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cfg jsonb; point_id uuid; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND lower(email) NOT LIKE '%@wallet.bixlink.invalid') OR EXISTS(SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Verify your real email first'; END IF;
cfg:=public.bixgo_map_settings(); IF NOT (cfg->>'enabled')::boolean THEN RAISE EXCEPTION 'Community mapping is closed'; END IF;
IF p_name IS NULL OR length(trim(p_name))<3 OR length(trim(p_name))>100 OR p_category IS NULL OR p_category NOT IN ('entrance','motor_lane','home','store','public') OR p_lat IS NULL OR p_lng IS NULL OR p_lat::text IN ('NaN','Infinity','-Infinity') OR p_lng::text IN ('NaN','Infinity','-Infinity') OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 OR length(coalesce(p_detail,''))>200 OR length(coalesce(p_note,''))>120 OR p_public IS NULL THEN RAISE EXCEPTION 'Invalid location details'; END IF;
IF p_photo IS NOT NULL AND (split_part(p_photo,'/',1)<>auth.uid()::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='bixgo-map' AND name=p_photo)) THEN RAISE EXCEPTION 'Invalid location photo'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bixgo_map_submit')); 
IF (SELECT count(*) FROM public.bixgo_map_points WHERE user_id=auth.uid() AND (created_at AT TIME ZONE 'UTC')::date=(now() AT TIME ZONE 'UTC')::date)>=(cfg->>'daily_limit')::integer THEN RAISE EXCEPTION 'Daily contribution limit reached'; END IF;
IF EXISTS(SELECT 1 FROM public.bixgo_map_points WHERE status IN ('pending','approved') AND lower(trim(name))=lower(trim(p_name)) AND abs(lat-p_lat)<0.0003 AND abs(lng-p_lng)<0.0003) THEN RAISE EXCEPTION 'A similar point already exists nearby'; END IF;
INSERT INTO public.bixgo_map_points(user_id,name,category,lat,lng,detail,driver_note,photo_path,is_public,reward_bix) VALUES(auth.uid(),trim(p_name),p_category,p_lat,p_lng,coalesce(p_detail,''),coalesce(p_note,''),p_photo,p_public,(cfg->>'reward_bix')::numeric) RETURNING id INTO point_id; RETURN point_id; END $$;
CREATE FUNCTION public.bixgo_map_review(p_id uuid,p_action text,p_note text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.bixgo_map_points; cfg jsonb; used numeric; BEGIN
IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
IF p_action IS NULL OR p_action NOT IN ('approved','rejected','archived') OR length(coalesce(p_note,''))>240 THEN RAISE EXCEPTION 'Invalid review'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bix_mining_marketing_pool')); SELECT * INTO r FROM public.bixgo_map_points WHERE id=p_id FOR UPDATE;
IF r.id IS NULL THEN RAISE EXCEPTION 'Point not found'; END IF;
IF r.status=p_action THEN RETURN to_jsonb(r); END IF;
IF p_action='archived' AND r.status<>'approved' OR p_action<>'archived' AND r.status<>'pending' THEN RAISE EXCEPTION 'Point was already reviewed'; END IF;
IF p_action='approved' THEN
cfg:=public.bixgo_map_settings(); SELECT coalesce(sum(reward_bix),0) INTO used FROM public.bixgo_map_points WHERE status IN ('approved','archived');
IF used+r.reward_bix>(cfg->>'budget_bix')::numeric OR public.bixgo_map_pool_used()+r.reward_bix>1000000 THEN RAISE EXCEPTION 'Marketing reward budget exhausted'; END IF;
END IF;
UPDATE public.bixgo_map_points SET status=p_action,review_note=coalesce(p_note,''),reviewed_at=now(),reviewed_by=auth.uid() WHERE id=p_id RETURNING * INTO r; RETURN to_jsonb(r); END $$;
CREATE FUNCTION public.bixgo_map_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE total numeric:=0; alloc uuid; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bixgo_map_claim:'||auth.uid()::text));
PERFORM 1 FROM public.bixgo_map_points WHERE user_id=auth.uid() AND status IN ('approved','archived') AND claimed_at IS NULL FOR UPDATE;
SELECT coalesce(sum(reward_bix),0) INTO total FROM public.bixgo_map_points WHERE user_id=auth.uid() AND status IN ('approved','archived') AND claimed_at IS NULL;
IF total<=0 THEN RETURN jsonb_build_object('claimed',0); END IF;
INSERT INTO public.bix_allocations(user_id,amount_bix,note,created_by) VALUES(auth.uid(),total,'Marketing & Community: BIXGO map rewards',auth.uid()) RETURNING id INTO alloc;
UPDATE public.bixgo_map_points SET claimed_at=now(),allocation_id=NULL WHERE user_id=auth.uid() AND status IN ('approved','archived') AND claimed_at IS NULL;
-- One allocation may cover several points; linkage lives in a separate claim row.
INSERT INTO public.bixgo_map_claims(user_id,amount_bix,allocation_id) VALUES(auth.uid(),total,alloc);
RETURN jsonb_build_object('claimed',total); END $$;
CREATE TABLE public.bixgo_map_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,amount_bix numeric(18,6) NOT NULL CHECK(amount_bix>0),allocation_id uuid NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bixgo_map_claims TO authenticated; GRANT ALL ON public.bixgo_map_claims TO service_role;
ALTER TABLE public.bixgo_map_claims ENABLE ROW LEVEL SECURITY; CREATE POLICY map_claim_read ON public.bixgo_map_claims FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.bix_is_owner1());
CREATE FUNCTION public.bixgo_map_search(p_query text DEFAULT '',p_lat double precision DEFAULT NULL,p_lng double precision DEFAULT NULL) RETURNS TABLE(id uuid,name text,lat double precision,lng double precision,detail text,driver_note text,category text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT p.id,p.name,p.lat,p.lng,p.detail,p.driver_note,p.category FROM public.bixgo_map_points p WHERE p.status='approved' AND p.is_public AND ((length(trim(p_query))>=3 AND length(p_query)<=100 AND strpos(lower(p.name||' '||p.detail),lower(trim(p_query)))>0) OR (coalesce(p_query,'')='' AND p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 AND abs(p.lat-p_lat)<0.1 AND abs(p.lng-p_lng)<0.1)) ORDER BY CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL THEN power(p.lat-p_lat,2)+power(p.lng-p_lng,2) ELSE 0 END,p.created_at DESC LIMIT 30 $$;
REVOKE ALL ON FUNCTION public.bixgo_map_pool_used() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.bixgo_map_pool_used() TO service_role;
REVOKE ALL ON FUNCTION public.bixgo_map_settings(),public.bixgo_map_save(boolean,numeric,integer,numeric),public.bixgo_map_submit(text,text,double precision,double precision,text,text,text,boolean),public.bixgo_map_review(uuid,text,text),public.bixgo_map_claim(),public.bixgo_map_search(text,double precision,double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bixgo_map_settings(),public.bixgo_map_save(boolean,numeric,integer,numeric),public.bixgo_map_submit(text,text,double precision,double precision,text,text,text,boolean),public.bixgo_map_review(uuid,text,text),public.bixgo_map_claim() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bixgo_map_search(text,double precision,double precision) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.bix_mining_conversion_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE cfg jsonb; consumed numeric; credited numeric; pool_used numeric; bal numeric; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
SELECT value INTO cfg FROM public.app_settings WHERE key='mining_conversion'; SELECT coalesce(sum(amount_vbix),0),coalesce(sum(amount_bix),0) INTO consumed,credited FROM public.bix_mining_conversions WHERE user_id=auth.uid(); pool_used:=public.bixgo_map_pool_used(); SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
RETURN jsonb_build_object('enabled',coalesce((cfg->>'enabled')::boolean,false),'vbixPerBix',(cfg->>'vbixPerBix')::numeric,'consumedVbix',consumed,'convertedBix',credited,'poolUsed',pool_used,'bixBalance',bal); END $$;
CREATE OR REPLACE FUNCTION public.bix_mining_convert() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cfg jsonb; rate numeric; available numeric; consumed numeric; credited numeric; pool_used numeric; amount numeric; allocation uuid; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL AND lower(email) NOT LIKE '%@wallet.bixlink.invalid') THEN RAISE EXCEPTION 'Verifikasi email diperlukan'; END IF;
IF EXISTS(SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bix_mining_marketing_pool')); SELECT value INTO cfg FROM public.app_settings WHERE key='mining_conversion' FOR UPDATE;
IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'Konversi vBIX sedang ditutup'; END IF;
rate:=(cfg->>'vbixPerBix')::numeric; IF rate IS NULL OR rate<=0 OR rate>1000000000 OR rate::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Nilai konversi belum ditentukan'; END IF;
PERFORM public.bix_mining_settle(); SELECT coalesce(sum(amount_vbix),0),coalesce(sum(amount_bix),0) INTO consumed,credited FROM public.bix_mining_conversions WHERE user_id=auth.uid(); pool_used:=public.bixgo_map_pool_used();
SELECT coalesce(sum(amount_vbix),0)-consumed INTO available FROM public.bix_vbix_ledger WHERE user_id=auth.uid(); amount:=trunc(greatest(0,least(available/rate,100-credited,1000000-pool_used)),6);
IF amount<=0 THEN RAISE EXCEPTION 'Saldo vBIX belum cukup atau batas konversi tercapai'; END IF;
INSERT INTO public.bix_allocations(user_id,amount_bix,note,created_by) VALUES(auth.uid(),amount,'Marketing & Community: vBIX conversion',auth.uid()) RETURNING id INTO allocation; INSERT INTO public.bix_mining_conversions(user_id,amount_vbix,amount_bix,vbix_per_bix,allocation_id) VALUES(auth.uid(),amount*rate,amount,rate,allocation); RETURN public.bix_mining_conversion_status(); END $$;