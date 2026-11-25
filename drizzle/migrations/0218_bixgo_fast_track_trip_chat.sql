ALTER TABLE public.bixgo_driver_licenses ADD COLUMN IF NOT EXISTS safety_declared_at timestamptz, ADD COLUMN IF NOT EXISTS approval_method text NOT NULL DEFAULT 'manual';
CREATE OR REPLACE FUNCTION public.bixgo_fast_track_enabled() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key='bixgo_driver_fast_track'),true) $$;
CREATE OR REPLACE FUNCTION public.bixgo_fast_track_set(p_enabled boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF; INSERT INTO public.app_settings(key,value) VALUES('bixgo_driver_fast_track',jsonb_build_object('enabled',p_enabled)) ON CONFLICT(key) DO UPDATE SET value=excluded.value; RETURN public.bixgo_fast_track_enabled(); END $$;
CREATE OR REPLACE FUNCTION public.bixgo_driver_application_valid(p_name text,p_phone text,p_model text,p_plate text,p_safe boolean) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT coalesce(length(trim(p_name)) BETWEEN 2 AND 80 AND length(regexp_replace(p_phone,'[^0-9]','','g')) BETWEEN 8 AND 15 AND length(trim(p_model)) BETWEEN 2 AND 60 AND length(trim(p_plate)) BETWEEN 3 AND 20 AND p_safe,false) $$;
CREATE OR REPLACE FUNCTION public.bixgo_driver_apply(p_full_name text,p_phone text,p_vehicle_type text,p_vehicle_model text,p_plate text,p_mode text,p_city text,p_safety boolean) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); existing text; result text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT public.bix_has_real_verified_email(u) THEN RAISE EXCEPTION 'Verify your real email first'; END IF;
 IF NOT public.bixgo_driver_application_valid(p_full_name,p_phone,p_vehicle_model,p_plate,p_safety) THEN RAISE EXCEPTION 'Complete your driver details and safety declaration'; END IF;
 IF p_vehicle_type IS NULL OR p_vehicle_type NOT IN ('moto','urban','executive','black') OR p_mode IS NULL OR p_mode NOT IN ('self','fleet') OR coalesce(length(trim(p_city)),0) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Select vehicle, driver mode and city'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,51));
 SELECT status INTO existing FROM public.bixgo_driver_licenses WHERE user_id=u FOR UPDATE;
 IF existing IS NOT NULL AND existing<>'rejected' THEN RAISE EXCEPTION 'An application already exists; suspended accounts require owner review'; END IF;
 result:=CASE WHEN public.bixgo_fast_track_enabled() AND p_mode='self' THEN 'approved' ELSE 'pending' END;
 INSERT INTO public.bixgo_driver_licenses(user_id,full_name,phone,vehicle_type,vehicle_model,plate,mode,city,status,online,operator_note,safety_declared_at,approval_method)
 VALUES(u,trim(p_full_name),trim(p_phone),p_vehicle_type,trim(p_vehicle_model),upper(trim(p_plate)),p_mode,trim(p_city),result,false,'',now(),CASE WHEN result='approved' THEN 'fast_track' ELSE 'manual' END)
 ON CONFLICT(user_id) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,vehicle_type=excluded.vehicle_type,vehicle_model=excluded.vehicle_model,plate=excluded.plate,mode=excluded.mode,city=excluded.city,status=excluded.status,online=false,operator_note='',safety_declared_at=excluded.safety_declared_at,approval_method=excluded.approval_method,updated_at=now();
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_fast_track_enabled(),public.bixgo_fast_track_set(boolean),public.bixgo_driver_apply(text,text,text,text,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_fast_track_enabled(),public.bixgo_fast_track_set(boolean),public.bixgo_driver_apply(text,text,text,text,text,text,text,boolean) TO authenticated;
CREATE TABLE public.bixgo_trip_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),trip_id uuid NOT NULL REFERENCES public.bixgo_bookings(id),sender_id uuid NOT NULL,body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 1000),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bixgo_trip_messages TO authenticated;
GRANT ALL ON public.bixgo_trip_messages TO service_role;
ALTER TABLE public.bixgo_trip_messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.bixgo_trip_chat_access(p_trip uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.bixgo_bookings WHERE id=p_trip AND driver_user_id IS NOT NULL AND auth.uid() IN (user_id,driver_user_id)) $$;
REVOKE ALL ON FUNCTION public.bixgo_trip_chat_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_trip_chat_access(uuid) TO authenticated;
CREATE POLICY "Assigned trip participants read chat" ON public.bixgo_trip_messages FOR SELECT TO authenticated USING(public.bixgo_trip_chat_access(trip_id));
CREATE INDEX bixgo_trip_messages_feed ON public.bixgo_trip_messages(trip_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.bixgo_trip_chat_send(p_trip uuid,p_body text,p_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bixgo_bookings%ROWTYPE; u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO b FROM public.bixgo_bookings WHERE id=p_trip FOR UPDATE;
 IF NOT FOUND OR b.driver_user_id IS NULL OR u NOT IN(b.user_id,b.driver_user_id) THEN RAISE EXCEPTION 'Only assigned trip participants can chat'; END IF;
 IF b.status NOT IN('assigned','in_transit') THEN RAISE EXCEPTION 'Trip chat is closed'; END IF;
 IF p_id IS NULL OR coalesce(length(trim(p_body)),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Message must contain 1 to 1000 characters'; END IF;
 IF EXISTS(SELECT 1 FROM public.bixgo_trip_messages WHERE id=p_id AND sender_id=u AND trip_id=p_trip) THEN RETURN p_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(u::text,52));
 IF EXISTS(SELECT 1 FROM public.bixgo_trip_messages WHERE sender_id=u AND created_at>now()-interval '1 second') THEN RAISE EXCEPTION 'Wait a moment before sending another message'; END IF;
 INSERT INTO public.bixgo_trip_messages(id,trip_id,sender_id,body) VALUES(p_id,p_trip,u,trim(p_body)); RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_trip_chat_send(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bixgo_trip_chat_send(uuid,text,uuid) TO authenticated;