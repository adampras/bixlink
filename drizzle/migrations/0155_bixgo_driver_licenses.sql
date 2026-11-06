CREATE TABLE public.bixgo_driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL DEFAULT 'moto' CHECK (vehicle_type IN ('moto','urban','executive','black')),
  vehicle_model text NOT NULL DEFAULT '',
  plate text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'self' CHECK (mode IN ('self','fleet')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  online boolean NOT NULL DEFAULT false,
  operator_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bixgo_driver_licenses TO authenticated;
GRANT ALL ON public.bixgo_driver_licenses TO service_role;
ALTER TABLE public.bixgo_driver_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members apply for own license" ON public.bixgo_driver_licenses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND online = false AND operator_note = '');
CREATE POLICY "Members read own license, owner reads all" ON public.bixgo_driver_licenses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.bix_is_owner1());
CREATE POLICY "Owner reviews licenses" ON public.bixgo_driver_licenses FOR UPDATE TO authenticated
  USING (public.bix_is_owner1()) WITH CHECK (public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bixgo_driver_set_online(p_online boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bixgo_driver_licenses SET online = p_online, updated_at = now()
   WHERE user_id = auth.uid() AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'License is not approved'; END IF;
  RETURN p_online;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_driver_set_online(boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_set_online(boolean) TO authenticated;

ALTER TABLE public.bixgo_bookings ADD COLUMN driver_user_id uuid;
CREATE POLICY "Drivers read assigned bookings" ON public.bixgo_bookings FOR SELECT TO authenticated
  USING (driver_user_id = auth.uid());
CREATE INDEX bixgo_bookings_driver_idx ON public.bixgo_bookings (driver_user_id, created_at DESC);