CREATE TABLE public.bixgo_dispatch_positions (user_id uuid PRIMARY KEY, lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90), lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180), accuracy double precision NOT NULL CHECK (accuracy BETWEEN 0 AND 150), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bixgo_dispatch_positions TO authenticated;
GRANT ALL ON public.bixgo_dispatch_positions TO service_role;
ALTER TABLE public.bixgo_dispatch_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispatch_position_self ON public.bixgo_dispatch_positions FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.bixgo_dispatch_distance(p_lat double precision,p_lng double precision,p_to_lat double precision,p_to_lng double precision) RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path=public AS $$ SELECT 6371.0*2*asin(sqrt(LEAST(1.0,GREATEST(0.0,power(sin(radians(p_to_lat-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(p_to_lat))*power(sin(radians(p_to_lng-p_lng)/2),2))))); $$;
CREATE OR REPLACE FUNCTION public.bixgo_dispatch_matches(p_lat double precision,p_lng double precision,p_at timestamptz,p_vehicle text,p_city text,p_pickup_lat double precision,p_pickup_lng double precision,p_order_city text) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT COALESCE(p_at BETWEEN now()-interval '90 seconds' AND now() AND p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 AND CASE WHEN p_pickup_lat IS NULL OR p_pickup_lng IS NULL THEN p_city<>'' AND lower(p_city)=lower(p_order_city) WHEN p_pickup_lat BETWEEN -90 AND 90 AND p_pickup_lng BETWEEN -180 AND 180 THEN public.bixgo_dispatch_distance(p_lat,p_lng,p_pickup_lat,p_pickup_lng)<=CASE WHEN p_vehicle='moto' THEN 5 ELSE 8 END ELSE false END,false); $$;
CREATE OR REPLACE FUNCTION public.bixgo_dispatch_location(p_lat double precision,p_lng double precision,p_accuracy double precision) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.bixgo_driver_licenses WHERE user_id=auth.uid() AND status='approved' AND online) THEN RAISE EXCEPTION 'Approved online driver required'; END IF;
IF p_lat IS NULL OR p_lng IS NULL OR p_accuracy IS NULL OR NOT(p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 AND p_accuracy BETWEEN 0 AND 150) THEN RAISE EXCEPTION 'Accurate GPS location required'; END IF;
INSERT INTO public.bixgo_dispatch_positions(user_id,lat,lng,accuracy,updated_at) VALUES(auth.uid(),p_lat,p_lng,p_accuracy,now()) ON CONFLICT(user_id) DO UPDATE SET lat=EXCLUDED.lat,lng=EXCLUDED.lng,accuracy=EXCLUDED.accuracy,updated_at=now(); END; $$;
REVOKE ALL ON FUNCTION public.bixgo_dispatch_location(double precision,double precision,double precision) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_dispatch_location(double precision,double precision,double precision) TO authenticated;
CREATE OR REPLACE FUNCTION public.bixgo_driver_jobs() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE lic record; pos record; BEGIN
SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id=auth.uid() AND status='approved'; IF NOT FOUND THEN RAISE EXCEPTION 'License is not approved'; END IF;
SELECT * INTO pos FROM public.bixgo_dispatch_positions WHERE user_id=auth.uid();
RETURN jsonb_build_object('gps_ready',COALESCE(pos.updated_at BETWEEN now()-interval '90 seconds' AND now(),false),'radius_km',CASE WHEN lic.vehicle_type='moto' THEN 5 ELSE 8 END,
'open',CASE WHEN lic.online THEN COALESCE((SELECT jsonb_agg(to_jsonb(b)-'user_id'-'owner_user_id' ORDER BY b.pickup_distance_km NULLS LAST,b.created_at DESC) FROM (
SELECT b.*,public.bixgo_dispatch_distance(pos.lat,pos.lng,b.pickup_lat,b.pickup_lng) AS pickup_distance_km FROM public.bixgo_bookings b WHERE b.status='pending' AND b.driver_user_id IS NULL AND b.user_id<>auth.uid()
AND (b.service IN ('ride','car') OR (b.service IN ('food','send','mart') AND lic.vehicle_type='moto'))
AND public.bixgo_dispatch_matches(pos.lat,pos.lng,pos.updated_at,lic.vehicle_type,lic.city,b.pickup_lat,b.pickup_lng,b.city)
ORDER BY pickup_distance_km NULLS LAST,b.created_at DESC LIMIT 30) b),'[]'::jsonb) ELSE '[]'::jsonb END,
'mine',COALESCE((SELECT jsonb_agg(to_jsonb(b)-'user_id'-'owner_user_id' ORDER BY b.created_at DESC) FROM (SELECT * FROM public.bixgo_bookings WHERE driver_user_id=auth.uid() ORDER BY created_at DESC LIMIT 50) b),'[]'::jsonb),
'rating',(SELECT jsonb_build_object('avg',round(avg(rating)::numeric,2),'n',count(rating)) FROM public.bixgo_bookings WHERE driver_user_id=auth.uid() AND rating IS NOT NULL)); END; $$;
REVOKE ALL ON FUNCTION public.bixgo_driver_jobs() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_jobs() TO authenticated;
CREATE OR REPLACE FUNCTION public.bixgo_dispatch_accept_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE lic record; pos record; BEGIN
IF NEW.driver_user_id IS DISTINCT FROM OLD.driver_user_id AND NEW.driver_user_id=auth.uid() AND NEW.status='assigned' THEN
SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id=auth.uid() AND status='approved' AND online;
IF NOT FOUND THEN RAISE EXCEPTION 'Approved online driver required'; END IF;
SELECT * INTO pos FROM public.bixgo_dispatch_positions WHERE user_id=auth.uid();
IF NOT public.bixgo_dispatch_matches(pos.lat,pos.lng,pos.updated_at,lic.vehicle_type,lic.city,NEW.pickup_lat,NEW.pickup_lng,NEW.city) OR NOT (NEW.service IN ('ride','car') OR (NEW.service IN ('food','send','mart') AND lic.vehicle_type='moto')) THEN RAISE EXCEPTION 'Refresh GPS; order is outside your pickup radius'; END IF;
END IF; RETURN NEW; END; $$;
CREATE TRIGGER bixgo_dispatch_accept_guard BEFORE UPDATE ON public.bixgo_bookings FOR EACH ROW EXECUTE FUNCTION public.bixgo_dispatch_accept_guard();