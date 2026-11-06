CREATE TABLE public.bixgo_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  city text NOT NULL DEFAULT '',
  service text NOT NULL CHECK (service IN ('ride','car','food','send','mart','travel')),
  vehicle text NOT NULL DEFAULT '',
  pickup text NOT NULL DEFAULT '',
  dropoff text NOT NULL DEFAULT '',
  km numeric NOT NULL DEFAULT 0,
  total_idr numeric NOT NULL DEFAULT 0 CHECK (total_idr >= 0),
  pay_method text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_transit','completed','cancelled')),
  driver_name text NOT NULL DEFAULT '',
  driver_phone text NOT NULL DEFAULT '',
  plate text NOT NULL DEFAULT '',
  operator_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bixgo_bookings TO authenticated;
GRANT ALL ON public.bixgo_bookings TO service_role;
ALTER TABLE public.bixgo_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members insert own pending bookings" ON public.bixgo_bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND driver_name = '' AND plate = '');
CREATE POLICY "Members read own, owner reads all" ON public.bixgo_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.bix_is_owner1());
CREATE POLICY "Owner dispatches bookings" ON public.bixgo_bookings FOR UPDATE TO authenticated
  USING (public.bix_is_owner1()) WITH CHECK (public.bix_is_owner1());
CREATE INDEX bixgo_bookings_city_idx ON public.bixgo_bookings (city, created_at DESC);
CREATE INDEX bixgo_bookings_user_idx ON public.bixgo_bookings (user_id, created_at DESC);