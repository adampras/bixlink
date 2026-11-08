CREATE TABLE public.bixgo_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  kind text NOT NULL DEFAULT 'food' CHECK (kind IN ('food','mart')),
  category text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  landmark text NOT NULL DEFAULT '',
  lat double precision, lng double precision,
  phone text NOT NULL DEFAULT '',
  logo_path text, banner_path text,
  open_time text NOT NULL DEFAULT '08:00', close_time text NOT NULL DEFAULT '21:00',
  is_open boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  review_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bixgo_merchants TO authenticated;
GRANT ALL ON public.bixgo_merchants TO service_role;
ALTER TABLE public.bixgo_merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant read" ON public.bixgo_merchants FOR SELECT TO authenticated USING (status = 'approved' OR owner_id = auth.uid() OR public.bix_is_owner1());
CREATE POLICY "merchant insert own" ON public.bixgo_merchants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'pending');
CREATE POLICY "merchant update" ON public.bixgo_merchants FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.bix_is_owner1()) WITH CHECK (owner_id = auth.uid() OR public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bixgo_merchant_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NOT public.bix_is_owner1() THEN
    NEW.owner_id := OLD.owner_id;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN NULL; ELSE NEW.status := OLD.status; END IF;
    END IF;
    NEW.review_note := CASE WHEN NEW.status = 'pending' AND OLD.status = 'rejected' THEN '' ELSE OLD.review_note END;
    IF NEW.status <> 'approved' THEN NEW.is_open := false; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bixgo_merchant_guard BEFORE UPDATE ON public.bixgo_merchants FOR EACH ROW EXECUTE FUNCTION public.bixgo_merchant_guard();

CREATE TABLE public.bixgo_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.bixgo_merchants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Menu',
  price_idr numeric NOT NULL CHECK (price_idr > 0 AND price_idr <= 100000000),
  photo_path text,
  in_stock boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bixgo_menu_items TO authenticated;
GRANT ALL ON public.bixgo_menu_items TO service_role;
ALTER TABLE public.bixgo_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu read" ON public.bixgo_menu_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bixgo_merchants m WHERE m.id = merchant_id AND (m.status = 'approved' OR m.owner_id = auth.uid() OR public.bix_is_owner1())));
CREATE POLICY "menu write own" ON public.bixgo_menu_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.bixgo_merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.bixgo_merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid()));

CREATE TABLE public.bixgo_merchant_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.bixgo_merchants(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal_idr numeric NOT NULL DEFAULT 0,
  address text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  pay_method text NOT NULL DEFAULT 'cash' CHECK (pay_method IN ('cash')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','ready','completed','cancelled','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bixgo_merchant_orders TO authenticated;
GRANT ALL ON public.bixgo_merchant_orders TO service_role;
ALTER TABLE public.bixgo_merchant_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order read parties" ON public.bixgo_merchant_orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.bix_is_owner1() OR EXISTS (SELECT 1 FROM public.bixgo_merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.bixgo_merchant_order_place(p_merchant uuid, p_items jsonb, p_address text, p_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_m public.bixgo_merchants; v_lines jsonb := '[]'; v_total numeric := 0; r record; v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO v_m FROM public.bixgo_merchants WHERE id = p_merchant;
  IF v_m.id IS NULL OR v_m.status <> 'approved' OR NOT v_m.is_open THEN RAISE EXCEPTION 'Store is closed'; END IF;
  IF v_m.owner_id = v_uid THEN RAISE EXCEPTION 'You cannot order from your own store'; END IF;
  IF coalesce(length(trim(p_address)),0) < 5 THEN RAISE EXCEPTION 'Delivery address required'; END IF;
  FOR r IN SELECT i.id, i.name, i.price_idr, least(greatest((e->>'qty')::int,0),50) AS qty
    FROM jsonb_array_elements(p_items) e JOIN public.bixgo_menu_items i ON i.id = (e->>'id')::uuid
    WHERE i.merchant_id = p_merchant AND i.in_stock LOOP
    IF r.qty > 0 THEN
      v_lines := v_lines || jsonb_build_object('id', r.id, 'name', r.name, 'price', r.price_idr, 'qty', r.qty);
      v_total := v_total + r.price_idr * r.qty;
    END IF;
  END LOOP;
  IF v_total <= 0 THEN RAISE EXCEPTION 'Cart is empty or items are out of stock'; END IF;
  INSERT INTO public.bixgo_merchant_orders(merchant_id, buyer_id, items, subtotal_idr, address, note)
  VALUES (p_merchant, v_uid, v_lines, v_total, left(p_address,300), left(coalesce(p_note,''),300)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_merchant_order_set(p_id uuid, p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.bixgo_merchant_orders; v_owner uuid;
BEGIN
  SELECT * INTO o FROM public.bixgo_merchant_orders WHERE id = p_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT owner_id INTO v_owner FROM public.bixgo_merchants WHERE id = o.merchant_id;
  IF auth.uid() = o.buyer_id AND p_status = 'cancelled' AND o.status = 'pending' THEN NULL;
  ELSIF auth.uid() = v_owner AND (
    (o.status = 'pending' AND p_status IN ('accepted','rejected')) OR
    (o.status = 'accepted' AND p_status = 'ready') OR
    (o.status = 'ready' AND p_status = 'completed')) THEN NULL;
  ELSE RAISE EXCEPTION 'Status change not allowed'; END IF;
  UPDATE public.bixgo_merchant_orders SET status = p_status, updated_at = now() WHERE id = p_id;
END $$;
GRANT EXECUTE ON FUNCTION public.bixgo_merchant_order_place(uuid,jsonb,text,text), public.bixgo_merchant_order_set(uuid,text) TO authenticated;