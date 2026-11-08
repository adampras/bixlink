ALTER TABLE public.bixcare_orders ADD COLUMN IF NOT EXISTS rating smallint, ADD COLUMN IF NOT EXISTS review text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS rated_at timestamptz, ADD COLUMN IF NOT EXISTS service_note text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS next_service_at date;
ALTER TABLE public.bixcare_outlets ADD COLUMN IF NOT EXISTS break_until timestamptz;

CREATE OR REPLACE FUNCTION public.bixcare_rate_order(p_id uuid, p_rating int, p_review text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating 1–5'; END IF;
  UPDATE public.bixcare_orders SET rating = p_rating, review = left(coalesce(p_review,''), 500), rated_at = now()
   WHERE id = p_id AND buyer_id = auth.uid() AND status = 'completed' AND rated_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak bisa dinilai (belum selesai atau sudah dinilai)'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_order_service_note(p_id uuid, p_note text, p_next date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bixcare_orders SET service_note = left(coalesce(p_note,''), 800), next_service_at = p_next
   WHERE id = p_id AND merchant_id = auth.uid() AND status NOT IN ('cancelled','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_set_break(p_minutes int) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v timestamptz;
BEGIN
  IF p_minutes < 0 OR p_minutes > 240 THEN RAISE EXCEPTION 'Maks 240 menit'; END IF;
  v := CASE WHEN p_minutes = 0 THEN NULL ELSE now() + make_interval(mins => p_minutes) END;
  UPDATE public.bixcare_outlets SET break_until = v WHERE owner_id = auth.uid() AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'Outlet belum aktif'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.bixcare_outlet_ratings() RETURNS TABLE(outlet_id uuid, avg_rating numeric, reviews bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.outlet_id, round(avg(o.rating)::numeric, 1), count(*) FROM public.bixcare_orders o
  JOIN public.bixcare_outlets t ON t.id = o.outlet_id AND t.status = 'approved'
  WHERE o.rating IS NOT NULL GROUP BY o.outlet_id
$$;

CREATE OR REPLACE FUNCTION public.bixcare_outlet_reviews(p_outlet uuid) RETURNS TABLE(rating smallint, review text, rated_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rating, review, rated_at FROM public.bixcare_orders WHERE outlet_id = p_outlet AND rating IS NOT NULL ORDER BY rated_at DESC LIMIT 10
$$;

REVOKE ALL ON FUNCTION public.bixcare_rate_order(uuid,int,text), public.bixcare_order_service_note(uuid,text,date), public.bixcare_set_break(int), public.bixcare_outlet_ratings(), public.bixcare_outlet_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixcare_rate_order(uuid,int,text), public.bixcare_order_service_note(uuid,text,date), public.bixcare_set_break(int), public.bixcare_outlet_ratings(), public.bixcare_outlet_reviews(uuid) TO authenticated;