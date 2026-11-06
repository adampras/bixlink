ALTER TABLE public.bixgo_driver_licenses
  ADD COLUMN IF NOT EXISTS rate_adj_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accept_cash boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_bix boolean NOT NULL DEFAULT true;
ALTER TABLE public.bixgo_bookings
  ADD COLUMN IF NOT EXISTS fare_idr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fare_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gas_bix numeric NOT NULL DEFAULT 0;

-- Driver sets own fare adjustment and accepted payment types (license row only via this RPC).
CREATE OR REPLACE FUNCTION public.bixgo_driver_set_rates(p_adj numeric, p_cash boolean, p_bix boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_adj IS NULL OR p_adj < -20 OR p_adj > 30 THEN RAISE EXCEPTION 'Fare adjustment must be between -20%% and +30%%'; END IF;
  UPDATE public.bixgo_driver_licenses SET rate_adj_pct = round(p_adj, 1), accept_cash = p_cash, accept_bix = p_bix, updated_at = now()
   WHERE user_id = auth.uid() AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'License is not approved'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_driver_set_rates(numeric, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_set_rates(numeric, boolean, boolean) TO authenticated;

-- BIX movement from BIXGO: BIX trips hold passenger BIX (85% driver / 15% owner on completion); cash trips charge driver gas BIX up front to owner.
CREATE OR REPLACE FUNCTION public.bix_bixgo_bix_delta(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT -SUM(fare_bix) FROM public.bixgo_bookings WHERE user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(driver_bix) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(owner_bix) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND status = 'completed'),0)
       - COALESCE((SELECT SUM(gas_bix) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(gas_bix) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
$$;
REVOKE ALL ON FUNCTION public.bix_bixgo_bix_delta(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
SELECT CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,public.bix_wallet_balance(p_user)+COALESCE((SELECT SUM(CASE WHEN direction='BIX_TO_USDT' AND status='approved' THEN amount_out WHEN direction='USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(amount_usdt) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='USDT'),0)
+COALESCE((SELECT SUM(0.3*(amount_usd - CASE WHEN status='unstaked' THEN COALESCE(refund_usd,0) ELSE 0 END)) FROM public.stakes WHERE user_id=p_user AND payment_mode='hybrid'),0)) ELSE NULL END,
CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,
COALESCE((SELECT SUM(CASE WHEN direction='USDT_TO_BIX' AND status='approved' THEN amount_out WHEN direction='BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_bix ELSE -amount_bix END) FROM public.bix_transfers WHERE status='completed' AND(sender_id=p_user OR recipient_id=p_user)),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id=p_user),0)
+COALESCE((SELECT balance_bix FROM public.owner_bix_vault WHERE owner_id=p_user AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin')),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX'),0)
+public.bix_p2p_bix_delta(p_user)
+public.bix_bixgo_bix_delta(p_user)
-COALESCE((SELECT SUM(amount) FROM public.bixtok_gift_tx WHERE recipient_id=p_user AND currency='BIX' AND claimed_at IS NULL),0)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)
-COALESCE((SELECT SUM(CASE WHEN status='unstaked' AND amount_usd>0 THEN bix_paid*(1-COALESCE(refund_usd,0)/amount_usd) ELSE bix_paid END) FROM public.stakes WHERE user_id=p_user AND payment_mode='hybrid'),0)) ELSE NULL END;
$function$;

-- Server-only BIX balance for any user (affordability checks inside RPCs).
CREATE OR REPLACE FUNCTION public.bixgo_bix_balance_internal(p_user uuid) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev text := current_setting('request.jwt.claims', true); v numeric;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_user::text, 'role', 'authenticated')::text, true);
  SELECT bix_balance INTO v FROM public.bix_asset_balances(p_user);
  PERFORM set_config('request.jwt.claims', COALESCE(prev, ''), true);
  RETURN COALESCE(v, 0);
END $$;
REVOKE ALL ON FUNCTION public.bixgo_bix_balance_internal(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bixgo_driver_accept(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE lic record; b record; rate numeric; commission numeric; fare_idr numeric; usd numeric; owner uuid; pm text; bix numeric := 0; gas numeric := 0; fare numeric := 0;
BEGIN
  SELECT * INTO lic FROM public.bixgo_driver_licenses WHERE user_id = auth.uid() AND status = 'approved' AND online;
  IF NOT FOUND THEN RAISE EXCEPTION 'Go online with an approved license first'; END IF;
  SELECT * INTO b FROM public.bixgo_bookings WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR b.status <> 'pending' OR b.driver_user_id IS NOT NULL THEN RAISE EXCEPTION 'Order is no longer available'; END IF;
  IF b.user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot accept your own order'; END IF;
  SELECT COALESCE(NULLIF(value->>'usdtIdr','')::numeric, 16000), COALESCE(NULLIF(value->>'commissionPct','')::numeric, 15) INTO rate, commission FROM public.app_settings WHERE key = 'bixgo';
  rate := COALESCE(rate, 16000); commission := LEAST(50, GREATEST(0, COALESCE(commission, 15)));
  fare_idr := round(b.total_idr * (1 + lic.rate_adj_pct / 100));
  usd := round(fare_idr / rate, 2);
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
    plate = lic.plate, fare_idr = fare_idr, fare_usdt = fare, fare_bix = bix, gas_bix = gas, held_at = now(), owner_user_id = owner, updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'fare_usdt', fare, 'fare_bix', bix, 'gas_bix', gas, 'fare_idr', fare_idr);
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_driver_advance(p_id uuid, p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b record; d numeric; db numeric;
BEGIN
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
  IF current_setting('role', true) = 'authenticated' AND pg_trigger_depth() = 1 AND NOT public.bix_is_owner1() THEN
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

-- License: members cannot write rate columns directly.
CREATE OR REPLACE FUNCTION public.bixgo_license_rate_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' AND pg_trigger_depth() = 1 THEN
    IF TG_OP = 'INSERT' THEN NEW.rate_adj_pct := 0;
    ELSIF NEW.rate_adj_pct IS DISTINCT FROM OLD.rate_adj_pct AND (NEW.rate_adj_pct < -20 OR NEW.rate_adj_pct > 30) THEN RAISE EXCEPTION 'Fare adjustment out of range'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bixgo_license_rate_guard ON public.bixgo_driver_licenses;
CREATE TRIGGER bixgo_license_rate_guard BEFORE INSERT OR UPDATE ON public.bixgo_driver_licenses FOR EACH ROW EXECUTE FUNCTION public.bixgo_license_rate_guard();