CREATE OR REPLACE FUNCTION public.bix_p2p_post(p_side text, p_price numeric, p_amount numeric)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_bal record; v_id uuid; v_open boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE((value->>'enabled')::boolean, true) INTO v_open FROM public.app_settings WHERE key='p2p_market';
  IF NOT COALESCE(v_open, true) THEN RAISE EXCEPTION 'P2P desk is paused by the owner'; END IF;
  IF p_side NOT IN ('SELL','BUY') THEN RAISE EXCEPTION 'Invalid side'; END IF;
  IF p_price IS NULL OR p_price < 0.25 OR p_price > 0.50 THEN RAISE EXCEPTION 'Price must be between $0.25 and $0.50'; END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN RAISE EXCEPTION 'Amount must be 1 – 1,000,000 BIX'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF (SELECT count(*) FROM public.bix_p2p_offers WHERE user_id=auth.uid() AND status='open') >= 10 THEN RAISE EXCEPTION 'Maximum 10 open offers'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT * INTO v_bal FROM public.bix_asset_balances(auth.uid());
  IF p_side='SELL' AND COALESCE(v_bal.bix_balance,0) < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
  IF p_side='BUY' AND COALESCE(v_bal.usdt_balance,0) < round(p_amount*p_price,6) THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
  INSERT INTO public.bix_p2p_offers(user_id, side, price_usd, amount_bix, remaining_bix) VALUES (auth.uid(), p_side, round(p_price,6), p_amount, p_amount) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;