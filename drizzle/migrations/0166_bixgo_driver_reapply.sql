CREATE OR REPLACE FUNCTION public.bixgo_driver_reapply(p_full_name text, p_phone text, p_vehicle_type text, p_vehicle_model text, p_plate text, p_mode text, p_city text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF coalesce(trim(p_full_name),'') = '' OR coalesce(trim(p_phone),'') = '' OR coalesce(trim(p_plate),'') = '' THEN RAISE EXCEPTION 'Fill name, phone and plate'; END IF;
  UPDATE public.bixgo_driver_licenses SET
    full_name = left(trim(p_full_name), 80), phone = left(trim(p_phone), 30),
    vehicle_type = p_vehicle_type, vehicle_model = left(trim(coalesce(p_vehicle_model,'')), 60),
    plate = left(trim(p_plate), 20), mode = p_mode, city = left(coalesce(p_city,''), 60),
    status = 'pending', online = false, updated_at = now()
  WHERE user_id = auth.uid() AND status = 'rejected';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only rejected applications can be resubmitted'; END IF;
  RETURN 'pending';
END $$;
REVOKE ALL ON FUNCTION public.bixgo_driver_reapply(text,text,text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_driver_reapply(text,text,text,text,text,text,text) TO authenticated;