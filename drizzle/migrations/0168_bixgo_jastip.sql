CREATE TABLE public.bixgo_jastip_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  city text NOT NULL,
  item text NOT NULL CHECK (char_length(item) BETWEEN 2 AND 200),
  store text NOT NULL CHECK (char_length(store) BETWEEN 2 AND 200),
  qty int NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 50),
  item_budget_idr numeric NOT NULL DEFAULT 0 CHECK (item_budget_idr >= 0 AND item_budget_idr <= 100000000),
  fee_idr numeric NOT NULL DEFAULT 0 CHECK (fee_idr >= 0),
  dropoff text NOT NULL CHECK (char_length(dropoff) BETWEEN 2 AND 200),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  pay_method text NOT NULL DEFAULT 'Cash' CHECK (pay_method IN ('Cash','BIX Token')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','shopping','delivering','completed','cancelled')),
  driver_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bixgo_jastip_requests TO authenticated;
GRANT ALL ON public.bixgo_jastip_requests TO service_role;
ALTER TABLE public.bixgo_jastip_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX bixgo_jastip_user_idx ON public.bixgo_jastip_requests (user_id, created_at DESC);
CREATE INDEX bixgo_jastip_city_idx ON public.bixgo_jastip_requests (city, status, created_at DESC);

CREATE POLICY "Members create own jastip" ON public.bixgo_jastip_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND driver_user_id IS NULL);
CREATE POLICY "Members read own jastip" ON public.bixgo_jastip_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR driver_user_id = auth.uid() OR public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bixgo_jastip_cancel(_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bixgo_jastip_requests SET status='cancelled', updated_at=now()
   WHERE id=_id AND user_id=auth.uid() AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only your pending Jastip requests can be cancelled'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bixgo_jastip_set_status(_id uuid, _status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Only Owner 1 can dispatch Jastip'; END IF;
  IF _status NOT IN ('accepted','shopping','delivering','completed','cancelled') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.bixgo_jastip_requests SET status=_status, updated_at=now() WHERE id=_id;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_jastip_cancel(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bixgo_jastip_set_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_jastip_cancel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bixgo_jastip_set_status(uuid, text) TO authenticated;