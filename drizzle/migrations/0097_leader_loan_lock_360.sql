CREATE OR REPLACE FUNCTION public.bix_requires_360(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_user AND status IN ('pending','approved')) $$;
REVOKE ALL ON FUNCTION public.bix_requires_360(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bix_requires_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_bix_duration_stake_mode(p_package text, p_days integer, p_mode text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.packages%ROWTYPE; new_id uuid; v_bal record; v_apy numeric; v_price numeric; v_bix numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF public.bix_requires_360(auth.uid()) AND p_days IS DISTINCT FROM 360 THEN RAISE EXCEPTION 'Leader / loan accounts must stake with a 360-day lock'; END IF;
 IF p_mode NOT IN ('usdt','hybrid') THEN RAISE EXCEPTION 'Invalid payment mode'; END IF;
 IF p_mode='usdt' THEN RETURN public.request_bix_duration_stake(p_package,p_days); END IF;
 IF p_days IS NULL OR NOT(p_days=ANY(ARRAY[30,60,90,180,360])) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
 SELECT * INTO p FROM public.packages WHERE id=p_package AND enabled AND NOT retired FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable or closed'; END IF;
 v_apy := (p.duration_apys->>p_days::text)::numeric;
 IF v_apy IS NULL THEN RAISE EXCEPTION 'Duration unavailable'; END IF;
 SELECT NULLIF((value->>'priceUsd')::numeric,0) INTO v_price FROM public.app_settings WHERE key='bix_market';
 IF v_price IS NULL OR v_price<=0 THEN RAISE EXCEPTION 'BIX reference price unavailable'; END IF;
 v_bix := round(p.price_usd*0.3/v_price,6);
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||auth.uid()::text));
 PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
 SELECT * INTO v_bal FROM public.bix_asset_balances(auth.uid());
 IF COALESCE(v_bal.usdt_balance,0) < p.price_usd*0.7 THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
 IF COALESCE(v_bal.bix_balance,0) < v_bix THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt,payment_mode,bix_paid,bix_price_usd)
 VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true,'hybrid',v_bix,v_price) RETURNING id INTO new_id;
 RETURN new_id;
END $function$;