CREATE TABLE public.bix_p2p_pay_profiles (
  user_id uuid PRIMARY KEY,
  bank_name text NOT NULL DEFAULT '', bank_account text NOT NULL DEFAULT '', bank_holder text NOT NULL DEFAULT '',
  qris_path text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bix_p2p_pay_profiles TO authenticated;
GRANT ALL ON public.bix_p2p_pay_profiles TO service_role;
ALTER TABLE public.bix_p2p_pay_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pay profile" ON public.bix_p2p_pay_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.bix_p2p_fiat_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL,
  price_idr numeric NOT NULL, amount_bix numeric NOT NULL, remaining_bix numeric NOT NULL,
  min_idr numeric NOT NULL DEFAULT 10000, methods text[] NOT NULL DEFAULT '{bank}',
  status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bix_p2p_fiat_ads TO authenticated;
GRANT ALL ON public.bix_p2p_fiat_ads TO service_role;
ALTER TABLE public.bix_p2p_fiat_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read fiat ads" ON public.bix_p2p_fiat_ads FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bix_p2p_fiat_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ad_id uuid NOT NULL REFERENCES public.bix_p2p_fiat_ads(id),
  seller_id uuid NOT NULL, buyer_id uuid NOT NULL, amount_bix numeric NOT NULL, price_idr numeric NOT NULL, total_idr numeric NOT NULL,
  method text NOT NULL, status text NOT NULL DEFAULT 'pending_pay', proof_path text, note text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes', paid_at timestamptz, released_at timestamptz,
  disputed_by uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bix_p2p_fiat_orders TO authenticated;
GRANT ALL ON public.bix_p2p_fiat_orders TO service_role;
ALTER TABLE public.bix_p2p_fiat_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties read fiat orders" ON public.bix_p2p_fiat_orders FOR SELECT TO authenticated USING (seller_id = auth.uid() OR buyer_id = auth.uid() OR public.is_bix_admin());

-- BIX held in open fiat ads and active orders leaves the seller's balance; released orders move it to the buyer.
CREATE OR REPLACE FUNCTION public.bix_p2p_bix_delta(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT SUM(CASE WHEN buyer_id=p_user THEN amount_bix ELSE 0 END) - SUM(CASE WHEN seller_id=p_user THEN amount_bix ELSE 0 END) FROM public.bix_p2p_fills WHERE seller_id=p_user OR buyer_id=p_user),0)
   - COALESCE((SELECT SUM(remaining_bix) FROM public.bix_p2p_offers WHERE user_id=p_user AND side='SELL' AND status='open'),0)
   - COALESCE((SELECT SUM(remaining_bix) FROM public.bix_p2p_fiat_ads WHERE seller_id=p_user AND status='open'),0)
   - COALESCE((SELECT SUM(amount_bix) FROM public.bix_p2p_fiat_orders WHERE seller_id=p_user AND status IN ('pending_pay','paid','disputed','released')),0)
   + COALESCE((SELECT SUM(amount_bix) FROM public.bix_p2p_fiat_orders WHERE buyer_id=p_user AND status='released'),0)
$$;
REVOKE EXECUTE ON FUNCTION public.bix_p2p_bix_delta(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_p2p_fiat_expire() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, ad_id, amount_bix FROM public.bix_p2p_fiat_orders WHERE status='pending_pay' AND expires_at < now() FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.bix_p2p_fiat_orders SET status='expired', note='Pembeli tidak membayar dalam 15 menit' WHERE id=r.id;
    UPDATE public.bix_p2p_fiat_ads SET remaining_bix=remaining_bix+r.amount_bix, status=CASE WHEN status='filled' THEN 'open' ELSE status END, updated_at=now() WHERE id=r.ad_id;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.bix_p2p_fiat_expire() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_p2p_fiat_expire() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_p2p_set_pay(p_bank_name text, p_bank_account text, p_bank_holder text, p_qris_path text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_qris_path IS NOT NULL AND p_qris_path <> '' AND split_part(p_qris_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid QR image'; END IF;
  IF length(COALESCE(p_bank_name,''))>40 OR length(COALESCE(p_bank_holder,''))>80 OR COALESCE(p_bank_account,'') !~ '^[0-9 -]{0,30}$' THEN RAISE EXCEPTION 'Periksa data rekening'; END IF;
  INSERT INTO public.bix_p2p_pay_profiles(user_id, bank_name, bank_account, bank_holder, qris_path, updated_at)
  VALUES (auth.uid(), trim(COALESCE(p_bank_name,'')), trim(COALESCE(p_bank_account,'')), trim(COALESCE(p_bank_holder,'')), NULLIF(p_qris_path,''), now())
  ON CONFLICT (user_id) DO UPDATE SET bank_name=EXCLUDED.bank_name, bank_account=EXCLUDED.bank_account, bank_holder=EXCLUDED.bank_holder, qris_path=EXCLUDED.qris_path, updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.bix_p2p_fiat_post(p_price numeric, p_amount numeric, p_min numeric, p_methods text[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_bal record; v_id uuid; pp public.bix_p2p_pay_profiles; m text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF p_price IS NULL OR p_price < 100 OR p_price > 1000000 THEN RAISE EXCEPTION 'Harga per BIX harus Rp100 – Rp1.000.000'; END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN RAISE EXCEPTION 'Jumlah 1 – 1.000.000 BIX'; END IF;
  IF p_methods IS NULL OR cardinality(p_methods)=0 THEN RAISE EXCEPTION 'Pilih Bank atau QRIS'; END IF;
  SELECT * INTO pp FROM public.bix_p2p_pay_profiles WHERE user_id=auth.uid();
  FOREACH m IN ARRAY p_methods LOOP
    IF m NOT IN ('bank','qris') THEN RAISE EXCEPTION 'Metode tidak valid'; END IF;
    IF m='bank' AND (pp.user_id IS NULL OR pp.bank_account='' OR pp.bank_holder='') THEN RAISE EXCEPTION 'Isi rekening bank dulu di Profil Pembayaran'; END IF;
    IF m='qris' AND (pp.user_id IS NULL OR pp.qris_path IS NULL) THEN RAISE EXCEPTION 'Unggah QRIS dulu di Profil Pembayaran'; END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.bix_p2p_fiat_ads WHERE seller_id=auth.uid() AND status='open') >= 5 THEN RAISE EXCEPTION 'Maksimal 5 iklan aktif'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  PERFORM public.bix_assert_bix_unlocked(auth.uid(), p_amount);
  SELECT * INTO v_bal FROM public.bix_asset_balances(auth.uid());
  IF COALESCE(v_bal.bix_balance,0) < p_amount THEN RAISE EXCEPTION 'Saldo BIX tidak cukup'; END IF;
  INSERT INTO public.bix_p2p_fiat_ads(seller_id, price_idr, amount_bix, remaining_bix, min_idr, methods)
  VALUES (auth.uid(), round(p_price,2), p_amount, p_amount, GREATEST(COALESCE(p_min,10000),10000), p_methods) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.bix_p2p_fiat_close(p_ad uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.bix_p2p_fiat_ads SET status='closed', updated_at=now() WHERE id=p_ad AND status IN ('open','filled') AND (seller_id=auth.uid() OR public.is_bix_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Iklan tidak ditemukan'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bix_p2p_fiat_take(p_ad uuid, p_amount numeric, p_method text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.bix_p2p_fiat_ads; v_id uuid; v_total numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM public.bix_p2p_fiat_expire();
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF (SELECT count(*) FROM public.bix_p2p_fiat_orders WHERE buyer_id=auth.uid() AND status IN ('pending_pay','paid','disputed')) >= 3 THEN RAISE EXCEPTION 'Selesaikan pesanan aktif Anda dulu (maks 3)'; END IF;
  SELECT * INTO a FROM public.bix_p2p_fiat_ads WHERE id=p_ad FOR UPDATE;
  IF a.id IS NULL OR a.status<>'open' THEN RAISE EXCEPTION 'Iklan sudah tidak tersedia'; END IF;
  IF a.seller_id=auth.uid() THEN RAISE EXCEPTION 'Tidak bisa membeli iklan sendiri'; END IF;
  IF NOT (p_method = ANY(a.methods)) THEN RAISE EXCEPTION 'Metode pembayaran tidak tersedia'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > a.remaining_bix THEN RAISE EXCEPTION 'Jumlah melebihi stok iklan'; END IF;
  v_total := round(p_amount*a.price_idr, 0);
  IF v_total < a.min_idr THEN RAISE EXCEPTION 'Minimal pembelian Rp%', a.min_idr; END IF;
  INSERT INTO public.bix_p2p_fiat_orders(ad_id, seller_id, buyer_id, amount_bix, price_idr, total_idr, method)
  VALUES (a.id, a.seller_id, auth.uid(), p_amount, a.price_idr, v_total, p_method) RETURNING id INTO v_id;
  UPDATE public.bix_p2p_fiat_ads SET remaining_bix=remaining_bix-p_amount, status=CASE WHEN remaining_bix-p_amount<=0 THEN 'filled' ELSE 'open' END, updated_at=now() WHERE id=a.id;
  RETURN v_id;
END $$;

-- Buyer sees seller payee details only for their own active order.
CREATE OR REPLACE FUNCTION public.bix_p2p_fiat_payee(p_order uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('method', o.method, 'bank_name', pp.bank_name, 'bank_account', pp.bank_account, 'bank_holder', pp.bank_holder, 'qris_path', pp.qris_path)
  FROM public.bix_p2p_fiat_orders o JOIN public.bix_p2p_pay_profiles pp ON pp.user_id=o.seller_id
  WHERE o.id=p_order AND (o.buyer_id=auth.uid() OR public.is_bix_admin()) AND o.status IN ('pending_pay','paid','disputed');
$$;

CREATE OR REPLACE FUNCTION public.bix_p2p_fiat_act(p_order uuid, p_action text, p_proof text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o public.bix_p2p_fiat_orders; me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM public.bix_p2p_fiat_expire();
  SELECT * INTO o FROM public.bix_p2p_fiat_orders WHERE id=p_order FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Pesanan tidak ditemukan'; END IF;
  IF p_action='paid' THEN
    IF o.buyer_id<>me OR o.status<>'pending_pay' THEN RAISE EXCEPTION 'Pesanan tidak bisa ditandai dibayar'; END IF;
    IF p_proof IS NULL OR split_part(p_proof,'/',1) <> me::text THEN RAISE EXCEPTION 'Unggah bukti transfer'; END IF;
    UPDATE public.bix_p2p_fiat_orders SET status='paid', paid_at=now(), proof_path=p_proof WHERE id=o.id;
  ELSIF p_action='cancel' THEN
    IF o.buyer_id<>me OR o.status<>'pending_pay' THEN RAISE EXCEPTION 'Hanya pembeli yang belum bayar bisa membatalkan'; END IF;
    UPDATE public.bix_p2p_fiat_orders SET status='cancelled', note='Dibatalkan pembeli' WHERE id=o.id;
    UPDATE public.bix_p2p_fiat_ads SET remaining_bix=remaining_bix+o.amount_bix, status=CASE WHEN status='filled' THEN 'open' ELSE status END, updated_at=now() WHERE id=o.ad_id;
  ELSIF p_action='release' THEN
    IF o.seller_id<>me OR o.status NOT IN ('paid','disputed') THEN RAISE EXCEPTION 'BIX hanya bisa dirilis setelah pembeli menandai bayar'; END IF;
    UPDATE public.bix_p2p_fiat_orders SET status='released', released_at=now() WHERE id=o.id;
  ELSIF p_action='dispute' THEN
    IF me NOT IN (o.seller_id, o.buyer_id) OR o.status<>'paid' THEN RAISE EXCEPTION 'Banding hanya untuk pesanan yang sudah dibayar'; END IF;
    IF o.buyer_id=me AND o.paid_at > now() - interval '10 minutes' THEN RAISE EXCEPTION 'Tunggu 10 menit setelah bayar sebelum banding'; END IF;
    UPDATE public.bix_p2p_fiat_orders SET status='disputed', disputed_by=me WHERE id=o.id;
  ELSIF p_action IN ('admin_release','admin_refund') THEN
    IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
    IF o.status NOT IN ('paid','disputed','pending_pay') THEN RAISE EXCEPTION 'Pesanan sudah selesai'; END IF;
    IF p_action='admin_release' THEN UPDATE public.bix_p2p_fiat_orders SET status='released', released_at=now(), note='Dirilis admin setelah mediasi' WHERE id=o.id;
    ELSE
      UPDATE public.bix_p2p_fiat_orders SET status='refunded', note='Dikembalikan ke penjual oleh admin' WHERE id=o.id;
      UPDATE public.bix_p2p_fiat_ads SET remaining_bix=remaining_bix+o.amount_bix, status=CASE WHEN status='filled' THEN 'open' ELSE status END, updated_at=now() WHERE id=o.ad_id;
    END IF;
  ELSE RAISE EXCEPTION 'Aksi tidak valid'; END IF;
  RETURN p_action;
END $$;

REVOKE ALL ON FUNCTION public.bix_p2p_set_pay(text,text,text,text), public.bix_p2p_fiat_post(numeric,numeric,numeric,text[]), public.bix_p2p_fiat_close(uuid), public.bix_p2p_fiat_take(uuid,numeric,text), public.bix_p2p_fiat_payee(uuid), public.bix_p2p_fiat_act(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_p2p_set_pay(text,text,text,text), public.bix_p2p_fiat_post(numeric,numeric,numeric,text[]), public.bix_p2p_fiat_close(uuid), public.bix_p2p_fiat_take(uuid,numeric,text), public.bix_p2p_fiat_payee(uuid), public.bix_p2p_fiat_act(uuid,text,text) TO authenticated;

-- Storage: private bix-p2p bucket; owner folder writes; counterparties read proofs/QRIS of shared orders.
CREATE POLICY "p2p own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='bix-p2p' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "p2p own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='bix-p2p' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "p2p read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='bix-p2p' AND (
  (storage.foldername(name))[1]=auth.uid()::text OR public.is_bix_admin()
  OR EXISTS (SELECT 1 FROM public.bix_p2p_fiat_orders o WHERE o.proof_path=name AND auth.uid() IN (o.seller_id,o.buyer_id))
  OR EXISTS (SELECT 1 FROM public.bix_p2p_pay_profiles pp JOIN public.bix_p2p_fiat_orders o ON o.seller_id=pp.user_id WHERE pp.qris_path=name AND o.buyer_id=auth.uid() AND o.status IN ('pending_pay','paid','disputed'))));

-- Support operators appointed by Owner 1.
CREATE TABLE public.bix_support_operators (user_id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT true, added_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.bix_support_operators TO service_role;
ALTER TABLE public.bix_support_operators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bix_support_operators_list() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.user_id, 'code', rc.code, 'name', COALESCE(p.username, p.full_name, rc.code, 'CS'), 'active', s.active) ORDER BY s.added_at), '[]'::jsonb)
  FROM public.bix_support_operators s LEFT JOIN public.referral_codes rc ON rc.user_id=s.user_id LEFT JOIN public.profiles p ON p.user_id=s.user_id
  WHERE auth.uid() IS NOT NULL AND (s.active OR public.bix_is_owner1());
$$;
CREATE OR REPLACE FUNCTION public.bix_support_operator_set(p_query text, p_user uuid, p_active boolean, p_remove boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v uuid := p_user;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  IF v IS NULL THEN
    SELECT rc.user_id INTO v FROM public.referral_codes rc WHERE upper(rc.code)=upper(trim(p_query)) LIMIT 1;
    IF v IS NULL THEN SELECT p.user_id INTO v FROM public.profiles p WHERE lower(p.username)=lower(ltrim(trim(p_query),'@')) LIMIT 1; END IF;
    IF v IS NULL THEN RAISE EXCEPTION 'Member tidak ditemukan'; END IF;
  END IF;
  IF p_remove THEN DELETE FROM public.bix_support_operators WHERE user_id=v; RETURN; END IF;
  INSERT INTO public.bix_support_operators(user_id, active) VALUES (v, COALESCE(p_active,true)) ON CONFLICT (user_id) DO UPDATE SET active=EXCLUDED.active;
END $$;
REVOKE ALL ON FUNCTION public.bix_support_operators_list(), public.bix_support_operator_set(text,uuid,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_support_operators_list(), public.bix_support_operator_set(text,uuid,boolean,boolean) TO authenticated;