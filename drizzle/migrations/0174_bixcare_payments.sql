ALTER TABLE public.bixcare_outlets
  ADD COLUMN IF NOT EXISTS bank_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_holder text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accept_bix boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_usdt boolean NOT NULL DEFAULT true;
ALTER TABLE public.bixcare_orders DROP CONSTRAINT IF EXISTS bixcare_orders_pay_method_check;
ALTER TABLE public.bixcare_orders ADD CONSTRAINT bixcare_orders_pay_method_check CHECK (pay_method IN ('bix','usdt','qris','bank','cash'));
ALTER TABLE public.bixcare_orders
  ADD COLUMN IF NOT EXISTS fare_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fare_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchant_bix numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchant_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_ref text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.bixcare_order_place(p_outlet uuid, p_items jsonb, p_pay text, p_schedule timestamptz, p_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.bixcare_outlets; it jsonb; s public.bixcare_services; q int; lines jsonb := '[]'; tot numeric := 0; nid uuid;
  cfg jsonb := public.bixcare_config(); usd numeric; fb numeric := 0; fu numeric := 0; bal record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login dulu'; END IF;
  SELECT * INTO o FROM public.bixcare_outlets WHERE id=p_outlet;
  IF o.id IS NULL OR o.status<>'approved' OR NOT o.is_open THEN RAISE EXCEPTION 'Outlet sedang tutup'; END IF;
  IF o.owner_id=auth.uid() THEN RAISE EXCEPTION 'Tidak bisa memesan di outlet sendiri'; END IF;
  IF p_pay NOT IN ('bix','usdt','qris','bank','cash') THEN RAISE EXCEPTION 'Metode bayar tidak valid'; END IF;
  IF p_pay='qris' AND o.qris_path IS NULL THEN RAISE EXCEPTION 'Outlet belum memasang QRIS'; END IF;
  IF p_pay='bank' AND (o.bank_account='' OR o.bank_name='') THEN RAISE EXCEPTION 'Outlet belum memasang rekening bank'; END IF;
  IF p_pay='bix' AND NOT o.accept_bix THEN RAISE EXCEPTION 'Outlet tidak menerima BIX'; END IF;
  IF p_pay='usdt' AND NOT o.accept_usdt THEN RAISE EXCEPTION 'Outlet tidak menerima USDT'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(p_items,'[]')) LOOP
    q := LEAST(GREATEST(COALESCE((it->>'qty')::int,0),0),20);
    CONTINUE WHEN q=0;
    SELECT * INTO s FROM public.bixcare_services WHERE id=(it->>'id')::uuid AND outlet_id=o.id AND available;
    IF s.id IS NULL THEN RAISE EXCEPTION 'Layanan tidak tersedia'; END IF;
    lines := lines || jsonb_build_object('id',s.id,'name',s.name,'price',s.price_idr,'qty',q,'unit',s.unit);
    tot := tot + s.price_idr*q;
  END LOOP;
  IF jsonb_array_length(lines)=0 THEN RAISE EXCEPTION 'Pilih minimal satu layanan'; END IF;
  IF p_pay IN ('bix','usdt') THEN
    IF tot <= 0 THEN RAISE EXCEPTION 'Total harus lebih dari 0'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('bixcare-pay:'||auth.uid()::text));
    usd := tot/(cfg->>'idr_per_usd')::numeric;
    SELECT * INTO bal FROM public.bix_asset_balances(auth.uid());
    IF p_pay='bix' THEN
      fb := round(usd/(cfg->>'bix_usd')::numeric, 6);
      IF COALESCE(bal.bix_balance,0) < fb THEN RAISE EXCEPTION 'Saldo BIX kurang (butuh % BIX)', fb; END IF;
      PERFORM public.bix_assert_bix_unlocked(auth.uid(), fb);
    ELSE
      fu := round(usd, 6);
      IF COALESCE(bal.usdt_balance,0) < fu THEN RAISE EXCEPTION 'Saldo USDT kurang (butuh % USDT)', fu; END IF;
    END IF;
  END IF;
  INSERT INTO public.bixcare_orders(outlet_id,merchant_id,buyer_id,items,total_idr,pay_method,schedule_at,note,fare_bix,fare_usdt,held_at,paid_at)
  VALUES (o.id,o.owner_id,auth.uid(),lines,tot,p_pay,p_schedule,left(COALESCE(p_note,''),300),fb,fu,
    CASE WHEN p_pay IN ('bix','usdt') THEN now() END, CASE WHEN p_pay IN ('bix','usdt') THEN now() END) RETURNING id INTO nid;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_order_paid(p_id uuid, p_ref text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bixcare_orders;
BEGIN
  SELECT * INTO r FROM public.bixcare_orders WHERE id=p_id FOR UPDATE;
  IF r.id IS NULL OR r.buyer_id<>auth.uid() THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  IF r.pay_method NOT IN ('qris','bank') THEN RAISE EXCEPTION 'Hanya untuk QRIS/transfer'; END IF;
  IF r.status IN ('completed','cancelled','rejected') THEN RAISE EXCEPTION 'Order sudah ditutup'; END IF;
  UPDATE public.bixcare_orders SET paid_at=now(), pay_ref=left(COALESCE(p_ref,''),80) WHERE id=p_id;
  RETURN jsonb_build_object('paid',true);
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_order_set(p_id uuid, p_status text, p_stage text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bixcare_orders; o public.bixcare_outlets; cfg jsonb := public.bixcare_config(); rate numeric; fee numeric; bal numeric; ref uuid; refb numeric := 0; ok boolean; share numeric;
BEGIN
  SELECT * INTO r FROM public.bixcare_orders WHERE id=p_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF auth.uid()=r.buyer_id AND auth.uid()<>r.merchant_id THEN
    IF NOT (r.status='pending' AND p_status='cancelled') THEN RAISE EXCEPTION 'Hanya bisa batal saat menunggu'; END IF;
    UPDATE public.bixcare_orders SET status='cancelled' WHERE id=p_id; RETURN jsonb_build_object('status','cancelled','refunded',r.held_at IS NOT NULL);
  END IF;
  IF auth.uid()<>r.merchant_id THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  IF p_status = r.status THEN
    UPDATE public.bixcare_orders SET stage=left(COALESCE(p_stage,''),60) WHERE id=p_id; RETURN jsonb_build_object('status',r.status);
  END IF;
  ok := (r.status='pending' AND p_status IN ('accepted','rejected')) OR (r.status='accepted' AND p_status='in_progress')
     OR (r.status='in_progress' AND p_status='ready') OR (r.status IN ('ready','in_progress','accepted') AND p_status='completed');
  IF NOT ok THEN RAISE EXCEPTION 'Status tidak valid'; END IF;
  IF p_status='completed' THEN
    SELECT * INTO o FROM public.bixcare_outlets WHERE id=r.outlet_id;
    rate := COALESCE((cfg->'rates'->>o.division)::numeric,0.03);
    share := (cfg->>'ref_share')::numeric;
    SELECT referred_by INTO ref FROM public.referral_codes WHERE user_id=r.merchant_id;
    IF r.pay_method='bix' THEN
      fee := round(r.fare_bix*rate,6);
      IF ref IS NOT NULL THEN refb := round(fee*share,6); END IF;
      UPDATE public.bixcare_orders SET status='completed', stage='Selesai', fee_rate=rate, fee_bix=fee, merchant_bix=r.fare_bix-fee, owner_user_id=public.bixcare_owner1_id(), ref_user=ref, ref_bix=refb, completed_at=now() WHERE id=p_id;
      RETURN jsonb_build_object('status','completed','merchant_bix',r.fare_bix-fee);
    ELSIF r.pay_method='usdt' THEN
      fee := round(r.fare_usdt*rate,6);
      UPDATE public.bixcare_orders SET status='completed', stage='Selesai', fee_rate=rate, fee_usdt=fee, merchant_usdt=r.fare_usdt-fee, owner_user_id=public.bixcare_owner1_id(), ref_user=ref, ref_usdt=CASE WHEN ref IS NOT NULL THEN round(fee*share,6) ELSE 0 END, completed_at=now() WHERE id=p_id;
      RETURN jsonb_build_object('status','completed','merchant_usdt',r.fare_usdt-fee);
    END IF;
    fee := round(r.total_idr*rate/(cfg->>'idr_per_usd')::numeric/(cfg->>'bix_usd')::numeric, 6);
    SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(bal,0) < fee THEN RAISE EXCEPTION 'Saldo BIX Gas kurang (butuh % BIX). Isi ulang dulu.', fee; END IF;
    IF ref IS NOT NULL THEN refb := round(fee*share,6); END IF;
    UPDATE public.bixcare_orders SET status='completed', stage='Selesai', fee_rate=rate, fee_bix=fee, owner_user_id=public.bixcare_owner1_id(), ref_user=ref, ref_bix=refb, completed_at=now() WHERE id=p_id;
    SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(bal,0) < (cfg->>'min_gas_bix')::numeric THEN UPDATE public.bixcare_outlets SET is_open=false WHERE id=o.id; END IF;
    RETURN jsonb_build_object('status','completed','fee_bix',fee,'closed',COALESCE(bal,0) < (cfg->>'min_gas_bix')::numeric);
  END IF;
  UPDATE public.bixcare_orders SET status=p_status, stage=COALESCE(NULLIF(p_stage,''),stage) WHERE id=p_id;
  RETURN jsonb_build_object('status',p_status,'refunded',p_status='rejected' AND r.held_at IS NOT NULL);
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_bix_delta(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT -SUM(fare_bix) FROM public.bixcare_orders WHERE buyer_id=p_user AND held_at IS NOT NULL AND status NOT IN ('cancelled','rejected')),0)
       + COALESCE((SELECT SUM(merchant_bix) FROM public.bixcare_orders WHERE merchant_id=p_user AND status='completed'),0)
       + COALESCE((SELECT -SUM(fee_bix) FROM public.bixcare_orders WHERE merchant_id=p_user AND status='completed' AND pay_method NOT IN ('bix','usdt')),0)
       + COALESCE((SELECT SUM(fee_bix-ref_bix) FROM public.bixcare_orders WHERE owner_user_id=p_user AND status='completed'),0)
       + COALESCE((SELECT SUM(ref_bix) FROM public.bixcare_orders WHERE ref_user=p_user AND status='completed'),0) $$;

CREATE OR REPLACE FUNCTION public.bixcare_usdt_delta(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT -SUM(fare_usdt) FROM public.bixcare_orders WHERE buyer_id=p_user AND held_at IS NOT NULL AND status NOT IN ('cancelled','rejected')),0)
       + COALESCE((SELECT SUM(merchant_usdt) FROM public.bixcare_orders WHERE merchant_id=p_user AND status='completed'),0)
       + COALESCE((SELECT SUM(fee_usdt-ref_usdt) FROM public.bixcare_orders WHERE owner_user_id=p_user AND status='completed'),0)
       + COALESCE((SELECT SUM(ref_usdt) FROM public.bixcare_orders WHERE ref_user=p_user AND status='completed'),0) $$;

CREATE OR REPLACE FUNCTION public.bix_bixgo_usdt_delta(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT -SUM(fare_usdt) FROM public.bixgo_bookings WHERE user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(driver_usdt) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(owner_usdt - ref_driver_usdt - ref_rider_usdt) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(ref_driver_usdt) FROM public.bixgo_bookings WHERE ref_driver_user = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(ref_rider_usdt) FROM public.bixgo_bookings WHERE ref_rider_user = p_user AND status = 'completed'),0)
       + public.bixcare_usdt_delta(p_user)
$function$;

REVOKE EXECUTE ON FUNCTION public.bixcare_bix_delta(uuid), public.bixcare_usdt_delta(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.bixcare_order_paid(uuid,text) TO authenticated;