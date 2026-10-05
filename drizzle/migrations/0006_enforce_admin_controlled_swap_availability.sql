CREATE OR REPLACE FUNCTION public.request_bix_swap(p_direction text, p_amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_usdt numeric;
  v_bix numeric;
  v_out numeric;
  v_swap_enabled boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE((value ->> 'enabled')::boolean, false)
    INTO v_swap_enabled
    FROM public.app_settings
    WHERE key = 'swap';
  IF NOT COALESCE(v_swap_enabled, false) THEN RAISE EXCEPTION 'Coming soon — BIX/USDT swap is not open yet'; END IF;
  IF p_direction NOT IN ('USDT_TO_BIX','BIX_TO_USDT') THEN RAISE EXCEPTION 'Invalid swap direction'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT usdt_balance, bix_balance INTO v_usdt, v_bix FROM public.bix_asset_balances(auth.uid());
  IF p_direction = 'USDT_TO_BIX' THEN
    IF v_usdt < p_amount THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
    v_out := round(p_amount / 0.10, 8);
  ELSE
    IF v_bix < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
    v_out := round(p_amount * 0.10, 8);
  END IF;
  INSERT INTO public.swap_requests(user_id,direction,amount_in,amount_out,price_usd)
  VALUES (auth.uid(),p_direction,p_amount,v_out,0.10) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.request_bix_swap(text,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_bix_swap(text,numeric) TO authenticated;