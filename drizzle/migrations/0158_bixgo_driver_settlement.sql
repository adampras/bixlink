ALTER TABLE public.bixgo_bookings
  ADD COLUMN IF NOT EXISTS fare_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- USDT movement from BIXGO trips: passenger hold while active/completed, driver 85% and owner 15% on completion. Cancelled = released.
CREATE OR REPLACE FUNCTION public.bix_bixgo_usdt_delta(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT -SUM(fare_usdt) FROM public.bixgo_bookings WHERE user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(driver_usdt) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(owner_usdt) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND status = 'completed'),0)
$$;
REVOKE ALL ON FUNCTION public.bix_bixgo_usdt_delta(uuid) FROM PUBLIC, anon, authenticated;

-- Unguarded balance for server-side affordability checks only (not callable by clients).
CREATE OR REPLACE FUNCTION public.bix_wallet_balance_internal(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
    + public.bix_vusdt_component(p_user)
    + COALESCE((SELECT SUM(usdt_amount) FROM public.bix_usdt_network_bonuses WHERE user_id = p_user), 0)
    - public.bix_presale_paid(p_user)
    + public.bix_presale_dividend(p_user)
    + public.bix_p2p_usdt_delta(p_user)
    + public.bix_bixtrade_usdt_delta(p_user)
    + public.bix_bixgo_usdt_delta(p_user)
$$;
REVOKE ALL ON FUNCTION public.bix_wallet_balance_internal(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres'
    THEN public.bix_wallet_balance_internal(p_user) ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.bixgo_driver_jobs() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE lic record;
BEGIN
  SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id = auth.uid() AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'License is not approved'; END IF;
  RETURN jsonb_build_object(
    'open', CASE WHEN lic.online THEN COALESCE((SELECT jsonb_agg(to_jsonb(b) - 'user_id' - 'owner_user_id' ORDER BY b.created_at DESC) FROM (
       SELECT * FROM public.bixgo_bookings WHERE status = 'pending' AND driver_user_id IS NULL AND user_id <> auth.uid()
         AND service IN ('ride','car') AND (lic.city = '' OR lower(city) = lower(lic.city)) ORDER BY created_at DESC LIMIT 30) b), '[]'::jsonb) ELSE '[]'::jsonb END,
    'mine', COALESCE((SELECT jsonb_agg(to_jsonb(b) - 'user_id' - 'owner_user_id' ORDER BY b.created_at DESC) FROM (
       SELECT * FROM public.bixgo_bookings WHERE driver_user_id = auth.uid() ORDER BY created_at DESC LIMIT 50) b), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_driver_accept(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE lic record; b record; rate numeric; fare numeric; owner uuid;
BEGIN
  SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id = auth.uid() AND status = 'approved' AND online;
  IF NOT FOUND THEN RAISE EXCEPTION 'Go online with an approved license first'; END IF;
  SELECT * INTO b FROM public.bixgo_bookings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'pending' OR b.driver_user_id IS NOT NULL THEN RAISE EXCEPTION 'Order is no longer available'; END IF;
  IF b.user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot accept your own order'; END IF;
  SELECT COALESCE(NULLIF(value->>'usdtIdr','')::numeric, 16000) INTO rate FROM public.app_settings WHERE key = 'bixgo';
  rate := COALESCE(rate, 16000);
  fare := round(b.total_idr / rate, 2);
  IF fare <= 0 THEN RAISE EXCEPTION 'Invalid fare'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bixgo_hold:' || b.user_id::text));
  IF public.bix_wallet_balance_internal(b.user_id) < fare THEN RAISE EXCEPTION 'Passenger USDT balance is not enough for this trip'; END IF;
  SELECT user_id INTO owner FROM public.user_roles WHERE public.bix_is_owner1_user(user_id) LIMIT 1;
  UPDATE public.bixgo_bookings SET status = 'assigned', driver_user_id = auth.uid(), driver_name = lic.full_name, driver_phone = lic.phone,
    plate = lic.plate, fare_usdt = fare, held_at = now(), owner_user_id = owner, updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'fare_usdt', fare);
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_driver_advance(p_id uuid, p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b record; d numeric;
BEGIN
  SELECT * INTO b FROM public.bixgo_bookings WHERE id = p_id AND driver_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status = 'in_transit' AND b.status = 'assigned' THEN
    UPDATE public.bixgo_bookings SET status = 'in_transit', updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'completed' AND b.status = 'in_transit' THEN
    d := round(b.fare_usdt * 0.85, 2);
    UPDATE public.bixgo_bookings SET status = 'completed', completed_at = now(), driver_usdt = d,
      owner_usdt = CASE WHEN b.owner_user_id IS NULL THEN 0 ELSE b.fare_usdt - d END, updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'cancelled' AND b.status IN ('assigned') THEN
    UPDATE public.bixgo_bookings SET status = 'pending', driver_user_id = NULL, driver_name = NULL, driver_phone = NULL, plate = NULL,
      held_at = NULL, fare_usdt = 0, updated_at = now() WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Invalid status change'; END IF;
  RETURN jsonb_build_object('id', p_id, 'status', p_status);
END $$;

GRANT EXECUTE ON FUNCTION public.bixgo_driver_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_accept(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_advance(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.bixgo_driver_jobs(), public.bixgo_driver_accept(uuid), public.bixgo_driver_advance(uuid,text) FROM anon;

-- Members may not set settlement columns directly.
CREATE OR REPLACE FUNCTION public.bixgo_booking_settle_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND pg_trigger_depth() = 1 AND NOT public.bix_is_owner1() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.fare_usdt := 0; NEW.driver_usdt := 0; NEW.owner_usdt := 0; NEW.owner_user_id := NULL; NEW.held_at := NULL; NEW.completed_at := NULL;
    ELSIF (NEW.fare_usdt, NEW.driver_usdt, NEW.owner_usdt, NEW.held_at, NEW.completed_at) IS DISTINCT FROM (OLD.fare_usdt, OLD.driver_usdt, OLD.owner_usdt, OLD.held_at, OLD.completed_at)
       OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR (OLD.held_at IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled') THEN
      RAISE EXCEPTION 'Settlement fields are server-controlled';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bixgo_booking_settle_guard ON public.bixgo_bookings;
CREATE TRIGGER bixgo_booking_settle_guard BEFORE INSERT OR UPDATE ON public.bixgo_bookings FOR EACH ROW EXECUTE FUNCTION public.bixgo_booking_settle_guard();