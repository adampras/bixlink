CREATE OR REPLACE FUNCTION public.bix_buyback_request(p_amount numeric,p_method text,p_contact text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_bal numeric; v_id uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_amount IS NULL OR p_amount<500 OR p_amount>1000000 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Amount must be 500 – 1,000,000 BIX'; END IF;
 IF p_method NOT IN ('email','telegram','whatsapp') OR length(trim(coalesce(p_contact,'')))<3 OR length(p_contact)>120 THEN RAISE EXCEPTION 'Choose a confirmation contact'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('buyback'||v_user::text));
 IF (SELECT count(*) FROM public.swap_requests WHERE user_id=v_user AND channel='buyback' AND status='pending')>=3 THEN RAISE EXCEPTION 'You already have 3 pending buyback requests'; END IF;
 SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(v_user);
 IF COALESCE(v_bal,0)<p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
 INSERT INTO public.swap_requests(user_id,direction,amount_in,amount_out,price_usd,status,channel)
 VALUES(v_user,'BIX_TO_USDT',p_amount,round(p_amount*0.25,6),0.25,'pending','buyback') RETURNING id INTO v_id;
 INSERT INTO public.bix_buyback_details(swap_id,user_id,contact_method,contact_value,source) VALUES(v_id,v_user,p_method,trim(p_contact),public.bix_buyback_source(v_user));
 RETURN v_id;
END $$;