CREATE OR REPLACE FUNCTION public.bixgo_driver_accept(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE lic record; b record; rate numeric; commission numeric; v_idr numeric; usd numeric; owner uuid; pm text; bix numeric := 0; gas numeric := 0; fare numeric := 0;
BEGIN
  PERFORM set_config('bixgo.rpc','1',true);
  SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id = auth.uid() AND status = 'approved' AND online;
  IF NOT FOUND THEN RAISE EXCEPTION 'Go online with an approved license first'; END IF;
  SELECT * INTO b FROM public.bixgo_bookings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'pending' OR b.driver_user_id IS NOT NULL THEN RAISE EXCEPTION 'Order is no longer available'; END IF;
  IF b.user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot accept your own order'; END IF;
  SELECT COALESCE(NULLIF(value->>'usdtIdr','')::numeric, 16000), COALESCE(NULLIF(value->>'commissionPct','')::numeric, 15) INTO rate, commission FROM public.app_settings WHERE key = 'bixgo';
  rate := COALESCE(rate, 16000); commission := LEAST(50, GREATEST(0, COALESCE(commission, 15)));
  v_idr := round(b.total_idr * (1 + lic.rate_adj_pct / 100));
  usd := round(v_idr / rate, 2);
  IF usd <= 0 THEN RAISE EXCEPTION 'Invalid fare'; END IF;
  pm := lower(COALESCE(b.pay_method, 'USDT'));
  SELECT user_id INTO owner FROM public.user_roles WHERE public.bix_is_owner1_user(user_id) LIMIT 1;
  IF pm LIKE 'bix%' THEN
    IF NOT lic.accept_bix THEN RAISE EXCEPTION 'You turned off BIX orders'; END IF;
    bix := round(usd / 0.5, 2);
    PERFORM pg_advisory_xact_lock(hashtext('bixgo_bix:' || b.user_id::text));
    IF public.bixgo_bix_balance_internal(b.user_id) < bix THEN RAISE EXCEPTION 'Passenger BIX balance is not enough for this trip'; END IF;
  ELSIF pm = 'cash' THEN
    IF NOT lic.accept_cash THEN RAISE EXCEPTION 'You turned off cash orders'; END IF;
    gas := round(usd * commission / 100 / 0.5, 2);
    PERFORM pg_advisory_xact_lock(hashtext('bixgo_bix:' || auth.uid()::text));
    IF public.bixgo_bix_balance_internal(auth.uid()) < gas THEN RAISE EXCEPTION 'Top up % BIX gas fee before taking this cash order', gas; END IF;
  ELSE
    fare := usd;
    PERFORM pg_advisory_xact_lock(hashtext('bixgo_hold:' || b.user_id::text));
    IF public.bix_wallet_balance_internal(b.user_id) < fare THEN RAISE EXCEPTION 'Passenger USDT balance is not enough for this trip'; END IF;
  END IF;
  UPDATE public.bixgo_bookings SET status = 'assigned', driver_user_id = auth.uid(), driver_name = lic.full_name, driver_phone = lic.phone,
    plate = lic.plate, fare_idr = v_idr, fare_usdt = fare, fare_bix = bix, gas_bix = gas, held_at = now(), owner_user_id = owner, updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'fare_usdt', fare, 'fare_bix', bix, 'gas_bix', gas, 'fare_idr', v_idr);
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_driver_advance(p_id uuid, p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b record; d numeric; db numeric;
BEGIN
  PERFORM set_config('bixgo.rpc','1',true);
  SELECT * INTO b FROM public.bixgo_bookings WHERE id = p_id AND driver_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status = 'in_transit' AND b.status = 'assigned' THEN
    UPDATE public.bixgo_bookings SET status = 'in_transit', updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'completed' AND b.status = 'in_transit' THEN
    d := round(b.fare_usdt * 0.85, 2); db := round(b.fare_bix * 0.85, 2);
    UPDATE public.bixgo_bookings SET status = 'completed', completed_at = now(), driver_usdt = d, driver_bix = db,
      owner_usdt = CASE WHEN b.owner_user_id IS NULL THEN 0 ELSE b.fare_usdt - d END,
      owner_bix = CASE WHEN b.owner_user_id IS NULL THEN 0 ELSE b.fare_bix - db END, updated_at = now() WHERE id = p_id;
  ELSIF p_status = 'cancelled' AND b.status IN ('assigned') THEN
    UPDATE public.bixgo_bookings SET status = 'pending', driver_user_id = NULL, driver_name = NULL, driver_phone = NULL, plate = NULL,
      held_at = NULL, fare_usdt = 0, fare_bix = 0, gas_bix = 0, fare_idr = 0, updated_at = now() WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Invalid status change'; END IF;
  RETURN jsonb_build_object('id', p_id, 'status', p_status);
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_booking_settle_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND pg_trigger_depth() = 1 AND NOT public.bix_is_owner1() AND COALESCE(current_setting('bixgo.rpc', true),'') <> '1' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.fare_usdt := 0; NEW.driver_usdt := 0; NEW.owner_usdt := 0; NEW.owner_user_id := NULL; NEW.held_at := NULL; NEW.completed_at := NULL;
      NEW.fare_idr := 0; NEW.fare_bix := 0; NEW.driver_bix := 0; NEW.owner_bix := 0; NEW.gas_bix := 0;
    ELSIF (NEW.fare_usdt, NEW.driver_usdt, NEW.owner_usdt, NEW.held_at, NEW.completed_at, NEW.fare_bix, NEW.driver_bix, NEW.owner_bix, NEW.gas_bix, NEW.fare_idr)
          IS DISTINCT FROM (OLD.fare_usdt, OLD.driver_usdt, OLD.owner_usdt, OLD.held_at, OLD.completed_at, OLD.fare_bix, OLD.driver_bix, OLD.owner_bix, OLD.gas_bix, OLD.fare_idr)
       OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.total_idr IS DISTINCT FROM OLD.total_idr OR NEW.pay_method IS DISTINCT FROM OLD.pay_method
       OR (OLD.held_at IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled') THEN
      RAISE EXCEPTION 'Settlement fields are server-controlled';
    END IF;
  END IF;
  RETURN NEW;
END $$;