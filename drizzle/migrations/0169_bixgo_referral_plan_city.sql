ALTER TABLE public.bixgo_bookings
  ADD COLUMN IF NOT EXISTS ref_driver_user uuid, ADD COLUMN IF NOT EXISTS ref_driver_usdt numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS ref_driver_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref_rider_user uuid, ADD COLUMN IF NOT EXISTS ref_rider_usdt numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS ref_rider_bix numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bixgo_driver_advance(p_id uuid, p_status text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b record; d numeric; db numeric; rd uuid; rr uuid; base_u numeric; base_b numeric;
BEGIN
  PERFORM set_config('bixgo.rpc','1',true);
  SELECT * INTO b FROM public.bixgo_bookings WHERE id = p_id AND driver_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status = 'in_transit' AND b.status = 'assigned' THEN
    UPDATE public.bixgo_bookings SET status = 'in_transit', updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'completed' AND b.status = 'in_transit' THEN
    d := round(b.fare_usdt * 0.85, 2); db := round(b.fare_bix * 0.85, 2);
    -- Referral plan: paid from the 15% platform share. Base = fare (BIX/USDT trips) or gas/0.15 (cash trips).
    base_u := b.fare_usdt; base_b := CASE WHEN b.fare_bix > 0 THEN b.fare_bix ELSE COALESCE(b.gas_bix,0) / 0.15 END;
    IF b.owner_user_id IS NOT NULL THEN
      SELECT referred_by INTO rd FROM public.referral_codes WHERE user_id = b.driver_user_id;
      SELECT referred_by INTO rr FROM public.referral_codes WHERE user_id = b.user_id;
      IF rd = b.driver_user_id OR rd = b.owner_user_id THEN rd := NULL; END IF;
      IF rr = b.user_id OR rr = b.owner_user_id THEN rr := NULL; END IF;
    END IF;
    UPDATE public.bixgo_bookings SET status = 'completed', completed_at = now(), driver_usdt = d, driver_bix = db,
      owner_usdt = CASE WHEN b.owner_user_id IS NULL THEN 0 ELSE b.fare_usdt - d END,
      owner_bix = CASE WHEN b.owner_user_id IS NULL THEN 0 ELSE b.fare_bix - db END,
      ref_driver_user = rd, ref_driver_usdt = CASE WHEN rd IS NULL THEN 0 ELSE round(base_u*0.02,4) END, ref_driver_bix = CASE WHEN rd IS NULL THEN 0 ELSE round(base_b*0.02,4) END,
      ref_rider_user = rr, ref_rider_usdt = CASE WHEN rr IS NULL THEN 0 ELSE round(base_u*0.01,4) END, ref_rider_bix = CASE WHEN rr IS NULL THEN 0 ELSE round(base_b*0.01,4) END,
      updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'cancelled' AND b.status IN ('assigned') THEN
    UPDATE public.bixgo_bookings SET status = 'pending', driver_user_id = NULL, driver_name = NULL, driver_phone = NULL, plate = NULL,
      held_at = NULL, fare_usdt = 0, fare_bix = 0, gas_bix = 0, fare_idr = 0, updated_at = now() WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Invalid status change'; END IF;
  RETURN jsonb_build_object('id', p_id, 'status', p_status);
END $function$;

CREATE OR REPLACE FUNCTION public.bix_bixgo_usdt_delta(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT -SUM(fare_usdt) FROM public.bixgo_bookings WHERE user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(driver_usdt) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(owner_usdt - ref_driver_usdt - ref_rider_usdt) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(ref_driver_usdt) FROM public.bixgo_bookings WHERE ref_driver_user = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(ref_rider_usdt) FROM public.bixgo_bookings WHERE ref_rider_user = p_user AND status = 'completed'),0)
$$;
REVOKE ALL ON FUNCTION public.bix_bixgo_usdt_delta(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_bixgo_bix_delta(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT -SUM(fare_bix) FROM public.bixgo_bookings WHERE user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(driver_bix) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(owner_bix - ref_driver_bix - ref_rider_bix) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND status = 'completed'),0)
       - COALESCE((SELECT SUM(gas_bix) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(gas_bix) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(ref_driver_bix) FROM public.bixgo_bookings WHERE ref_driver_user = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(ref_rider_bix) FROM public.bixgo_bookings WHERE ref_rider_user = p_user AND status = 'completed'),0)
$$;
REVOKE ALL ON FUNCTION public.bix_bixgo_bix_delta(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bixgo_ref_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'code', (SELECT code FROM public.referral_codes WHERE user_id = auth.uid()),
    'invited', (SELECT count(*) FROM public.referral_codes WHERE referred_by = auth.uid()),
    'drivers', (SELECT count(*) FROM public.bixgo_driver_licenses l JOIN public.referral_codes r ON r.user_id = l.user_id WHERE r.referred_by = auth.uid() AND l.status = 'approved'),
    'driver_trips', (SELECT count(*) FROM public.bixgo_bookings WHERE ref_driver_user = auth.uid() AND status='completed'),
    'rider_trips', (SELECT count(*) FROM public.bixgo_bookings WHERE ref_rider_user = auth.uid() AND status='completed'),
    'usdt', (SELECT COALESCE(SUM(CASE WHEN ref_driver_user=auth.uid() THEN ref_driver_usdt ELSE 0 END + CASE WHEN ref_rider_user=auth.uid() THEN ref_rider_usdt ELSE 0 END),0) FROM public.bixgo_bookings WHERE status='completed' AND (ref_driver_user=auth.uid() OR ref_rider_user=auth.uid())),
    'bix', (SELECT COALESCE(SUM(CASE WHEN ref_driver_user=auth.uid() THEN ref_driver_bix ELSE 0 END + CASE WHEN ref_rider_user=auth.uid() THEN ref_rider_bix ELSE 0 END),0) FROM public.bixgo_bookings WHERE status='completed' AND (ref_driver_user=auth.uid() OR ref_rider_user=auth.uid())))
$$;
REVOKE ALL ON FUNCTION public.bixgo_ref_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_ref_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.bixgo_driver_set_city(p_city text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_city IS NULL OR length(trim(p_city)) < 2 OR length(p_city) > 60 THEN RAISE EXCEPTION 'Invalid city'; END IF;
  UPDATE public.bixgo_driver_licenses SET city = lower(trim(p_city)), updated_at = now() WHERE user_id = auth.uid() AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Approved license required'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_driver_set_city(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_set_city(text) TO authenticated;