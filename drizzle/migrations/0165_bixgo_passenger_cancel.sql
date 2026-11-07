CREATE OR REPLACE FUNCTION public.bixgo_passenger_cancel(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('bixgo.rpc', '1', true);
  UPDATE public.bixgo_bookings SET status = 'cancelled', updated_at = now()
   WHERE id = p_id AND user_id = auth.uid() AND status = 'pending' AND driver_user_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only a request still searching for a driver can be cancelled'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixgo_passenger_cancel(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixgo_passenger_cancel(uuid) TO authenticated;