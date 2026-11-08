ALTER TABLE public.bixgo_driver_licenses
  ADD COLUMN IF NOT EXISTS accept_qris boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_bank boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS qris_path text,
  ADD COLUMN IF NOT EXISTS bank_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_holder text NOT NULL DEFAULT '';
ALTER TABLE public.bixgo_bookings
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_ref text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS paid_confirmed_at timestamptz;

CREATE OR REPLACE FUNCTION public.bixgo_trip_guard()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.driver_lat:=NULL; NEW.driver_lng:=NULL; NEW.driver_location_at:=NULL; NEW.cancel_reason:=NULL; NEW.cancel_note:=NULL; NEW.cancelled_by:=NULL; NEW.cancelled_at:=NULL;
  NEW.paid_at:=NULL; NEW.pay_ref:=''; NEW.paid_confirmed_at:=NULL;
  IF (NEW.pickup_lat IS NOT NULL AND (NEW.pickup_lat NOT BETWEEN -90 AND 90 OR NEW.pickup_lng IS NULL OR NEW.pickup_lng NOT BETWEEN -180 AND 180)) OR (NEW.dropoff_lat IS NOT NULL AND (NEW.dropoff_lat NOT BETWEEN -90 AND 90 OR NEW.dropoff_lng IS NULL OR NEW.dropoff_lng NOT BETWEEN -180 AND 180)) THEN RAISE EXCEPTION 'Invalid map coordinates'; END IF;
 ELSE
  IF (NEW.driver_lat,NEW.driver_lng,NEW.driver_location_at,NEW.cancel_reason,NEW.cancel_note,NEW.cancelled_by,NEW.cancelled_at,NEW.paid_at,NEW.pay_ref,NEW.paid_confirmed_at) IS DISTINCT FROM (OLD.driver_lat,OLD.driver_lng,OLD.driver_location_at,OLD.cancel_reason,OLD.cancel_note,OLD.cancelled_by,OLD.cancelled_at,OLD.paid_at,OLD.pay_ref,OLD.paid_confirmed_at) AND current_setting('bixgo.rpc',true) IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Use the trip action'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND (NEW.status='cancelled' OR (NEW.status='pending' AND OLD.status='assigned')) AND (NEW.cancelled_at IS NULL OR NEW.cancel_reason IS NULL OR NEW.cancelled_by IS NULL) THEN RAISE EXCEPTION 'Choose a cancellation reason'; END IF;
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.bixgo_driver_set_pay(p_qris boolean, p_bank boolean, p_qris_path text, p_bank_name text, p_bank_account text, p_bank_holder text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF p_qris_path IS NOT NULL AND p_qris_path <> '' AND split_part(p_qris_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid QR image'; END IF;
  IF length(COALESCE(p_bank_name,''))>40 OR length(COALESCE(p_bank_holder,''))>80 OR COALESCE(p_bank_account,'') !~ '^[0-9 -]{0,30}$' THEN RAISE EXCEPTION 'Check the bank details'; END IF;
  IF p_qris AND COALESCE(p_qris_path,'')='' THEN RAISE EXCEPTION 'Upload your QR image first'; END IF;
  IF p_bank AND (trim(COALESCE(p_bank_name,''))='' OR trim(COALESCE(p_bank_account,''))='' OR trim(COALESCE(p_bank_holder,''))='') THEN RAISE EXCEPTION 'Fill bank, account number and holder name'; END IF;
  UPDATE public.bixgo_driver_licenses SET accept_qris=p_qris, accept_bank=p_bank, qris_path=NULLIF(p_qris_path,''),
    bank_name=trim(COALESCE(p_bank_name,'')), bank_account=trim(COALESCE(p_bank_account,'')), bank_holder=trim(COALESCE(p_bank_holder,'')), updated_at=now()
   WHERE user_id=auth.uid() AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'License is not approved'; END IF;
END $function$;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_set_pay(boolean,boolean,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixgo_driver_accept(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  ELSIF pm IN ('cash','qris','bank') THEN
    IF pm = 'cash' AND NOT lic.accept_cash THEN RAISE EXCEPTION 'You turned off cash orders'; END IF;
    IF pm = 'qris' AND (NOT lic.accept_qris OR lic.qris_path IS NULL) THEN RAISE EXCEPTION 'Add your QR in Payment settings to take QR orders'; END IF;
    IF pm = 'bank' AND (NOT lic.accept_bank OR lic.bank_account = '') THEN RAISE EXCEPTION 'Add your bank account in Payment settings to take transfer orders'; END IF;
    gas := round(usd * commission / 100 / 0.5, 2);
    PERFORM pg_advisory_xact_lock(hashtext('bixgo_bix:' || auth.uid()::text));
    IF public.bixgo_bix_balance_internal(auth.uid()) < gas THEN RAISE EXCEPTION 'Top up % BIX gas fee before taking this order', gas; END IF;
  ELSE
    fare := usd;
    PERFORM pg_advisory_xact_lock(hashtext('bixgo_hold:' || b.user_id::text));
    IF public.bix_wallet_balance_internal(b.user_id) < fare THEN RAISE EXCEPTION 'Passenger USDT balance is not enough for this trip'; END IF;
  END IF;
  UPDATE public.bixgo_bookings SET status = 'assigned', driver_user_id = auth.uid(), driver_name = lic.full_name, driver_phone = lic.phone,
    plate = lic.plate, fare_idr = v_idr, fare_usdt = fare, fare_bix = bix, gas_bix = gas, held_at = now(), owner_user_id = owner, updated_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'fare_usdt', fare, 'fare_bix', bix, 'gas_bix', gas, 'fare_idr', v_idr);
END $function$;

-- Rider sees the assigned driver's QR/bank only for their own QR/transfer trip.
CREATE OR REPLACE FUNCTION public.bixgo_trip_payee(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b record; l record;
BEGIN
  SELECT * INTO b FROM public.bixgo_bookings WHERE id=p_id AND (user_id=auth.uid() OR driver_user_id=auth.uid());
  IF NOT FOUND OR b.driver_user_id IS NULL OR lower(b.pay_method) NOT IN ('qris','bank') THEN RETURN NULL; END IF;
  SELECT * INTO l FROM public.bixgo_driver_licenses WHERE user_id=b.driver_user_id;
  RETURN jsonb_build_object('method',lower(b.pay_method),'fare_idr',b.fare_idr,'qris_path',CASE WHEN lower(b.pay_method)='qris' THEN l.qris_path END,
    'bank_name',CASE WHEN lower(b.pay_method)='bank' THEN l.bank_name END,'bank_account',CASE WHEN lower(b.pay_method)='bank' THEN l.bank_account END,'bank_holder',CASE WHEN lower(b.pay_method)='bank' THEN l.bank_holder END,
    'paid_at',b.paid_at,'pay_ref',b.pay_ref,'confirmed_at',b.paid_confirmed_at);
END $function$;
GRANT EXECUTE ON FUNCTION public.bixgo_trip_payee(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixgo_trip_mark_paid(p_id uuid, p_ref text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF length(COALESCE(p_ref,''))>60 THEN RAISE EXCEPTION 'Reference is too long'; END IF;
  PERFORM set_config('bixgo.rpc','1',true);
  UPDATE public.bixgo_bookings SET paid_at=now(), pay_ref=trim(COALESCE(p_ref,'')), updated_at=now()
   WHERE id=p_id AND user_id=auth.uid() AND status IN ('assigned','in_transit') AND lower(pay_method) IN ('qris','bank');
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip is not waiting for a QR or transfer payment'; END IF;
END $function$;
GRANT EXECUTE ON FUNCTION public.bixgo_trip_mark_paid(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixgo_trip_confirm_paid(p_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('bixgo.rpc','1',true);
  UPDATE public.bixgo_bookings SET paid_confirmed_at=now(), updated_at=now()
   WHERE id=p_id AND driver_user_id=auth.uid() AND status IN ('assigned','in_transit') AND lower(pay_method) IN ('qris','bank');
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip is not waiting for a QR or transfer payment'; END IF;
END $function$;
GRANT EXECUTE ON FUNCTION public.bixgo_trip_confirm_paid(uuid) TO authenticated;

-- Block completion of QR/transfer trips until the driver confirms the money arrived.
CREATE OR REPLACE FUNCTION public.bixgo_paid_before_complete()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' AND lower(COALESCE(NEW.pay_method,'')) IN ('qris','bank') AND NEW.paid_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Confirm the QR/transfer payment arrived before finishing the trip';
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS bixgo_paid_before_complete ON public.bixgo_bookings;
CREATE TRIGGER bixgo_paid_before_complete BEFORE UPDATE ON public.bixgo_bookings FOR EACH ROW EXECUTE FUNCTION public.bixgo_paid_before_complete();