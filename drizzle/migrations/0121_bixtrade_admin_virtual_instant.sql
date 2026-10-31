CREATE OR REPLACE FUNCTION public.bixtrade_admin_virtual_deposit(p_amount numeric, p_strategy text DEFAULT 'core')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF p_strategy NOT IN ('core','active','triangular') THEN RAISE EXCEPTION 'Invalid strategy'; END IF;
  INSERT INTO public.bixtrade_requests (user_id, kind, amount_usd, strategy, funding, status, admin_note, reviewed_at, settled_usd, settled_at)
  VALUES (auth.uid(), 'deposit', round(p_amount, 2), p_strategy, 'virtual', 'approved', 'Admin instant virtual deposit', now(), round(p_amount, 2), now())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'status', 'approved', 'settled_usd', round(p_amount, 2));
END $$;
REVOKE ALL ON FUNCTION public.bixtrade_admin_virtual_deposit(numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtrade_admin_virtual_deposit(numeric, text) TO authenticated;