CREATE TABLE public.bixcare_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  division text NOT NULL CHECK (division IN ('auto','wash','laundry','rent')),
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  logo_path text, qris_path text,
  open_time text NOT NULL DEFAULT '08:00', close_time text NOT NULL DEFAULT '20:00',
  is_open boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  review_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bixcare_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.bixcare_outlets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  unit text NOT NULL DEFAULT 'layanan',
  price_idr numeric NOT NULL CHECK (price_idr >= 0 AND price_idr <= 100000000),
  duration_min integer NOT NULL DEFAULT 30,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bixcare_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.bixcare_outlets(id),
  merchant_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_idr numeric NOT NULL DEFAULT 0,
  pay_method text NOT NULL DEFAULT 'qris' CHECK (pay_method IN ('qris','cash')),
  schedule_at timestamptz,
  note text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','in_progress','ready','completed','cancelled','rejected')),
  fee_rate numeric NOT NULL DEFAULT 0,
  fee_bix numeric NOT NULL DEFAULT 0,
  owner_user_id uuid, ref_user uuid, ref_bix numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bixcare_outlets, public.bixcare_services TO authenticated;
GRANT SELECT ON public.bixcare_orders TO authenticated;
GRANT SELECT ON public.bixcare_outlets, public.bixcare_services TO anon;
GRANT ALL ON public.bixcare_outlets, public.bixcare_services, public.bixcare_orders TO service_role;
ALTER TABLE public.bixcare_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bixcare_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bixcare_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bixcare outlets read" ON public.bixcare_outlets FOR SELECT USING (status='approved' OR owner_id=auth.uid() OR public.bix_is_owner1());
CREATE POLICY "bixcare outlets insert own" ON public.bixcare_outlets FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
CREATE POLICY "bixcare outlets update" ON public.bixcare_outlets FOR UPDATE TO authenticated USING (owner_id=auth.uid() OR public.bix_is_owner1()) WITH CHECK (owner_id=auth.uid() OR public.bix_is_owner1());
CREATE POLICY "bixcare services read" ON public.bixcare_services FOR SELECT USING (EXISTS (SELECT 1 FROM public.bixcare_outlets o WHERE o.id=outlet_id AND (o.status='approved' OR o.owner_id=auth.uid())));
CREATE POLICY "bixcare services write own" ON public.bixcare_services FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid() AND EXISTS (SELECT 1 FROM public.bixcare_outlets o WHERE o.id=outlet_id AND o.owner_id=auth.uid()));
CREATE POLICY "bixcare orders read" ON public.bixcare_orders FOR SELECT TO authenticated USING (buyer_id=auth.uid() OR merchant_id=auth.uid() OR public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bixcare_owner1_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM auth.users WHERE lower(email)='bixdevpras@gmail.com' LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.bixcare_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('rates', jsonb_build_object('auto',0.02,'rent',0.02,'wash',0.03,'laundry',0.03),'min_gas_bix',20,'ref_share',0.2,'idr_per_usd',16000,'bix_usd',0.5)
    || COALESCE((SELECT value FROM public.app_settings WHERE key='bixcare'),'{}'::jsonb) $$;

CREATE OR REPLACE FUNCTION public.bixcare_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN
    IF TG_OP='INSERT' THEN NEW.status:='pending'; NEW.review_note:=''; NEW.is_open:=false;
    ELSE
      IF NEW.status IS DISTINCT FROM OLD.status OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
        IF OLD.status='rejected' AND NEW.status='pending' THEN NEW.review_note:=OLD.review_note;
        ELSE NEW.status:=OLD.status; NEW.review_note:=OLD.review_note; END IF;
      END IF;
      IF NEW.is_open AND NOT OLD.is_open AND current_setting('bixcare.rpc',true) IS DISTINCT FROM '1' THEN NEW.is_open:=false; END IF;
    END IF;
  END IF;
  IF NEW.status<>'approved' THEN NEW.is_open:=false; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bixcare_outlet_guard BEFORE INSERT OR UPDATE ON public.bixcare_outlets FOR EACH ROW EXECUTE FUNCTION public.bixcare_guard();

CREATE OR REPLACE FUNCTION public.bixcare_set_open(p_open boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.bixcare_outlets; bal numeric; mn numeric := (public.bixcare_config()->>'min_gas_bix')::numeric;
BEGIN
  SELECT * INTO o FROM public.bixcare_outlets WHERE owner_id=auth.uid();
  IF o.id IS NULL THEN RAISE EXCEPTION 'Outlet tidak ditemukan'; END IF;
  IF p_open THEN
    IF o.status<>'approved' THEN RAISE EXCEPTION 'Outlet belum disetujui Owner 1'; END IF;
    SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(bal,0) < mn THEN RAISE EXCEPTION 'Saldo BIX Gas minimal % BIX untuk membuka outlet', mn; END IF;
  END IF;
  PERFORM set_config('bixcare.rpc','1',true);
  UPDATE public.bixcare_outlets SET is_open=p_open WHERE id=o.id;
  RETURN jsonb_build_object('is_open',p_open);
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_order_place(p_outlet uuid, p_items jsonb, p_pay text, p_schedule timestamptz, p_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.bixcare_outlets; it jsonb; s public.bixcare_services; q int; lines jsonb := '[]'; tot numeric := 0; nid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login dulu'; END IF;
  SELECT * INTO o FROM public.bixcare_outlets WHERE id=p_outlet;
  IF o.id IS NULL OR o.status<>'approved' OR NOT o.is_open THEN RAISE EXCEPTION 'Outlet sedang tutup'; END IF;
  IF o.owner_id=auth.uid() THEN RAISE EXCEPTION 'Tidak bisa memesan di outlet sendiri'; END IF;
  IF p_pay NOT IN ('qris','cash') THEN RAISE EXCEPTION 'Metode bayar tidak valid'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(p_items,'[]')) LOOP
    q := LEAST(GREATEST(COALESCE((it->>'qty')::int,0),0),20);
    CONTINUE WHEN q=0;
    SELECT * INTO s FROM public.bixcare_services WHERE id=(it->>'id')::uuid AND outlet_id=o.id AND available;
    IF s.id IS NULL THEN RAISE EXCEPTION 'Layanan tidak tersedia'; END IF;
    lines := lines || jsonb_build_object('id',s.id,'name',s.name,'price',s.price_idr,'qty',q,'unit',s.unit);
    tot := tot + s.price_idr*q;
  END LOOP;
  IF jsonb_array_length(lines)=0 THEN RAISE EXCEPTION 'Pilih minimal satu layanan'; END IF;
  INSERT INTO public.bixcare_orders(outlet_id,merchant_id,buyer_id,items,total_idr,pay_method,schedule_at,note)
  VALUES (o.id,o.owner_id,auth.uid(),lines,tot,p_pay,p_schedule,left(COALESCE(p_note,''),300)) RETURNING id INTO nid;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_order_set(p_id uuid, p_status text, p_stage text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bixcare_orders; o public.bixcare_outlets; cfg jsonb := public.bixcare_config(); rate numeric; fee numeric; bal numeric; ref uuid; refb numeric := 0; ok boolean;
BEGIN
  SELECT * INTO r FROM public.bixcare_orders WHERE id=p_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF auth.uid()=r.buyer_id AND auth.uid()<>r.merchant_id THEN
    IF NOT (r.status='pending' AND p_status='cancelled') THEN RAISE EXCEPTION 'Hanya bisa batal saat menunggu'; END IF;
    UPDATE public.bixcare_orders SET status='cancelled' WHERE id=p_id; RETURN jsonb_build_object('status','cancelled');
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
    fee := round(r.total_idr*rate/(cfg->>'idr_per_usd')::numeric/(cfg->>'bix_usd')::numeric, 6);
    SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(bal,0) < fee THEN RAISE EXCEPTION 'Saldo BIX Gas kurang (butuh % BIX). Isi ulang dulu.', fee; END IF;
    SELECT referred_by INTO ref FROM public.referral_codes WHERE user_id=r.merchant_id;
    IF ref IS NOT NULL THEN refb := round(fee*(cfg->>'ref_share')::numeric,6); END IF;
    UPDATE public.bixcare_orders SET status='completed', stage='Selesai', fee_rate=rate, fee_bix=fee, owner_user_id=public.bixcare_owner1_id(), ref_user=ref, ref_bix=refb, completed_at=now() WHERE id=p_id;
    SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(bal,0) < (cfg->>'min_gas_bix')::numeric THEN UPDATE public.bixcare_outlets SET is_open=false WHERE id=o.id; END IF;
    RETURN jsonb_build_object('status','completed','fee_bix',fee,'closed',COALESCE(bal,0) < (cfg->>'min_gas_bix')::numeric);
  END IF;
  UPDATE public.bixcare_orders SET status=p_status, stage=COALESCE(NULLIF(p_stage,''),stage) WHERE id=p_id;
  RETURN jsonb_build_object('status',p_status);
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_bix_delta(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT -SUM(fee_bix) FROM public.bixcare_orders WHERE merchant_id=p_user AND status='completed'),0)
       + COALESCE((SELECT SUM(fee_bix-ref_bix) FROM public.bixcare_orders WHERE owner_user_id=p_user AND status='completed'),0)
       + COALESCE((SELECT SUM(ref_bix) FROM public.bixcare_orders WHERE ref_user=p_user AND status='completed'),0) $$;

CREATE OR REPLACE FUNCTION public.bix_bixgo_bix_delta(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT -SUM(fare_bix) FROM public.bixgo_bookings WHERE user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(driver_bix) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(owner_bix - ref_driver_bix - ref_rider_bix) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND status = 'completed'),0)
       - COALESCE((SELECT SUM(gas_bix) FROM public.bixgo_bookings WHERE driver_user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(gas_bix) FROM public.bixgo_bookings WHERE owner_user_id = p_user AND held_at IS NOT NULL AND status IN ('assigned','in_transit','completed')),0)
       + COALESCE((SELECT SUM(ref_driver_bix) FROM public.bixgo_bookings WHERE ref_driver_user = p_user AND status = 'completed'),0)
       + COALESCE((SELECT SUM(ref_rider_bix) FROM public.bixgo_bookings WHERE ref_rider_user = p_user AND status = 'completed'),0)
       + public.bixcare_bix_delta(p_user)
$function$;

REVOKE EXECUTE ON FUNCTION public.bixcare_bix_delta(uuid), public.bixcare_owner1_id() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.bixcare_config(), public.bixcare_set_open(boolean), public.bixcare_order_place(uuid,jsonb,text,timestamptz,text), public.bixcare_order_set(uuid,text,text) TO authenticated;

CREATE POLICY "bixcare files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='bixcare');
CREATE POLICY "bixcare files insert own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='bixcare' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "bixcare files update own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='bixcare' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "bixcare files delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='bixcare' AND (storage.foldername(name))[1]=auth.uid()::text);