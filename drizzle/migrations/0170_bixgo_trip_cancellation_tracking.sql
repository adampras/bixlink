ALTER TABLE public.bixgo_bookings ADD COLUMN IF NOT EXISTS cancel_reason text, ADD COLUMN IF NOT EXISTS cancel_note text, ADD COLUMN IF NOT EXISTS cancelled_by uuid, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz, ADD COLUMN IF NOT EXISTS pickup_lat double precision, ADD COLUMN IF NOT EXISTS pickup_lng double precision, ADD COLUMN IF NOT EXISTS dropoff_lat double precision, ADD COLUMN IF NOT EXISTS dropoff_lng double precision, ADD COLUMN IF NOT EXISTS driver_lat double precision, ADD COLUMN IF NOT EXISTS driver_lng double precision, ADD COLUMN IF NOT EXISTS driver_location_at timestamptz;
CREATE OR REPLACE FUNCTION public.bixgo_cancel_trip(p_id uuid, p_reason text, p_note text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bixgo_bookings; actor text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO b FROM public.bixgo_bookings WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
 actor := CASE WHEN b.user_id=auth.uid() THEN 'rider' WHEN b.driver_user_id=auth.uid() THEN 'driver' WHEN public.bix_is_owner1() THEN 'operator' ELSE NULL END;
 IF actor IS NULL THEN RAISE EXCEPTION 'Not your trip'; END IF;
 IF b.status NOT IN ('pending','assigned') THEN RAISE EXCEPTION 'A trip can only be cancelled before it starts'; END IF;
 IF actor='driver' AND b.status<>'assigned' THEN RAISE EXCEPTION 'Trip is not assigned'; END IF;
 IF actor='rider' AND p_reason <> ALL(ARRAY['Change pickup or destination','Driver taking too long','Driver not moving toward pickup','Driver asked me to cancel','Wrong vehicle or payment method','Other']) THEN RAISE EXCEPTION 'Choose a cancellation reason'; END IF;
 IF actor='driver' AND p_reason <> ALL(ARRAY['Vehicle breakdown','Passenger unreachable','Pickup road inaccessible','Passenger or luggage exceeds capacity','Other']) THEN RAISE EXCEPTION 'Choose a cancellation reason'; END IF;
 IF p_reason IS NULL OR length(trim(p_reason))=0 OR length(p_reason)>100 OR length(COALESCE(p_note,''))>240 OR (p_reason='Other' AND length(trim(COALESCE(p_note,'')))=0) THEN RAISE EXCEPTION 'Provide a short reason (maximum 240 characters)'; END IF;
 PERFORM set_config('bixgo.rpc','1',true);
 UPDATE public.bixgo_bookings SET status='cancelled',cancel_reason=p_reason,cancel_note=trim(COALESCE(p_note,'')),cancelled_by=auth.uid(),cancelled_at=now(),held_at=NULL,updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('id',p_id,'status','cancelled','fee',0);
END $$;
REVOKE ALL ON FUNCTION public.bixgo_cancel_trip(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_cancel_trip(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.bixgo_passenger_cancel(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM public.bixgo_cancel_trip(p_id,'Other','Cancelled from an older app version'); END $$;
CREATE OR REPLACE FUNCTION public.bixgo_trip_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.driver_lat:=NULL; NEW.driver_lng:=NULL; NEW.driver_location_at:=NULL; NEW.cancel_reason:=NULL; NEW.cancel_note:=NULL; NEW.cancelled_by:=NULL; NEW.cancelled_at:=NULL;
  IF (NEW.pickup_lat IS NOT NULL AND (NEW.pickup_lat NOT BETWEEN -90 AND 90 OR NEW.pickup_lng IS NULL OR NEW.pickup_lng NOT BETWEEN -180 AND 180)) OR (NEW.dropoff_lat IS NOT NULL AND (NEW.dropoff_lat NOT BETWEEN -90 AND 90 OR NEW.dropoff_lng IS NULL OR NEW.dropoff_lng NOT BETWEEN -180 AND 180)) THEN RAISE EXCEPTION 'Invalid map coordinates'; END IF;
 ELSE
  IF (NEW.driver_lat,NEW.driver_lng,NEW.driver_location_at,NEW.cancel_reason,NEW.cancel_note,NEW.cancelled_by,NEW.cancelled_at) IS DISTINCT FROM (OLD.driver_lat,OLD.driver_lng,OLD.driver_location_at,OLD.cancel_reason,OLD.cancel_note,OLD.cancelled_by,OLD.cancelled_at) AND current_setting('bixgo.rpc',true) IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Use the trip action'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND (NEW.status='cancelled' OR (NEW.status='pending' AND OLD.status='assigned')) AND (NEW.cancelled_at IS NULL OR NEW.cancel_reason IS NULL OR NEW.cancelled_by IS NULL) THEN RAISE EXCEPTION 'Choose a cancellation reason'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER bixgo_trip_guard BEFORE INSERT OR UPDATE ON public.bixgo_bookings FOR EACH ROW EXECUTE FUNCTION public.bixgo_trip_guard();
CREATE OR REPLACE FUNCTION public.bixgo_driver_location(p_id uuid,p_lat double precision,p_lng double precision) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
 PERFORM set_config('bixgo.rpc','1',true);
 UPDATE public.bixgo_bookings SET driver_lat=p_lat,driver_lng=p_lng,driver_location_at=now() WHERE id=p_id AND driver_user_id=auth.uid() AND status IN ('assigned','in_transit');
 IF NOT FOUND THEN RAISE EXCEPTION 'No active assigned trip'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_driver_location(uuid,double precision,double precision) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_location(uuid,double precision,double precision) TO authenticated;
CREATE OR REPLACE FUNCTION public.bixgo_trip_driver(p_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE d uuid;
BEGIN
 SELECT driver_user_id INTO d FROM public.bixgo_bookings WHERE id=p_id AND (user_id=auth.uid() OR driver_user_id=auth.uid() OR public.bix_is_owner1());
 IF d IS NULL THEN RETURN NULL; END IF;
 RETURN (SELECT jsonb_build_object('name',l.full_name,'vehicle_model',l.vehicle_model,'plate',l.plate,'license_id',l.id,'approved',l.status='approved','avatar_path',p.avatar_path,'rating',(SELECT round(avg(rating)::numeric,2) FROM public.bixgo_bookings WHERE driver_user_id=d AND rating IS NOT NULL),'rating_count',(SELECT count(rating) FROM public.bixgo_bookings WHERE driver_user_id=d AND rating IS NOT NULL)) FROM public.bixgo_driver_licenses l LEFT JOIN public.profiles p ON p.user_id=l.user_id WHERE l.user_id=d);
END $$;
REVOKE ALL ON FUNCTION public.bixgo_trip_driver(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_trip_driver(uuid) TO authenticated;