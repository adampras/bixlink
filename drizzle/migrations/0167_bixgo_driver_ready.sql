ALTER TABLE public.bixgo_bookings ADD COLUMN IF NOT EXISTS pickup_note text NOT NULL DEFAULT '';
ALTER TABLE public.bixgo_bookings ADD COLUMN IF NOT EXISTS rating smallint;
ALTER TABLE public.bixgo_bookings ADD COLUMN IF NOT EXISTS rating_note text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.bixgo_driver_jobs()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lic record;
BEGIN
  SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id = auth.uid() AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'License is not approved'; END IF;
  RETURN jsonb_build_object(
    'open', CASE WHEN lic.online THEN COALESCE((SELECT jsonb_agg(to_jsonb(b) - 'user_id' - 'owner_user_id' ORDER BY b.created_at DESC) FROM (
       SELECT * FROM public.bixgo_bookings WHERE status = 'pending' AND driver_user_id IS NULL AND user_id <> auth.uid()
         AND (service IN ('ride','car') OR (service IN ('food','send','mart') AND lic.vehicle_type = 'moto'))
         AND (lic.city = '' OR lower(city) = lower(lic.city)) ORDER BY created_at DESC LIMIT 30) b), '[]'::jsonb) ELSE '[]'::jsonb END,
    'mine', COALESCE((SELECT jsonb_agg(to_jsonb(b) - 'user_id' - 'owner_user_id' ORDER BY b.created_at DESC) FROM (
       SELECT * FROM public.bixgo_bookings WHERE driver_user_id = auth.uid() ORDER BY created_at DESC LIMIT 50) b), '[]'::jsonb),
    'rating', (SELECT jsonb_build_object('avg', round(avg(rating)::numeric, 2), 'n', count(rating)) FROM public.bixgo_bookings WHERE driver_user_id = auth.uid() AND rating IS NOT NULL));
END $function$;

CREATE OR REPLACE FUNCTION public.bixgo_rate_trip(p_id uuid, p_rating int, p_note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;
  PERFORM set_config('bixgo.rpc', '1', true);
  UPDATE public.bixgo_bookings SET rating = p_rating, rating_note = left(coalesce(p_note, ''), 200)
   WHERE id = p_id AND user_id = auth.uid() AND status = 'completed' AND rating IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip cannot be rated'; END IF;
END $function$;
REVOKE ALL ON FUNCTION public.bixgo_rate_trip(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_rate_trip(uuid, int, text) TO authenticated;