CREATE OR REPLACE FUNCTION public.bix_edit_duration_package(p_id text, p_price numeric, p_apys jsonb, p_enabled boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d integer; v numeric;
BEGIN
 IF NOT public.bix_can_manage_packages() THEN RAISE EXCEPTION 'Package editor access required'; END IF;
 IF p_price IS NULL OR p_price<=0 OR p_price>10000000 OR p_enabled IS NULL OR p_apys IS NULL OR jsonb_typeof(p_apys)<>'object' THEN RAISE EXCEPTION 'Invalid package values'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_apys))<>5 THEN RAISE EXCEPTION 'Five duration APYs required'; END IF;
 FOREACH d IN ARRAY ARRAY[30,60,90,180,360] LOOP
  IF NOT (p_apys ? d::text) OR jsonb_typeof(p_apys->d::text)<>'number' THEN RAISE EXCEPTION 'Invalid duration APY'; END IF;
  v := (p_apys->>d::text)::numeric;
  IF v<0 OR v>300 THEN RAISE EXCEPTION 'Annual APY must be between 0 and 300 (max 25%% per month)'; END IF;
 END LOOP;
 UPDATE public.packages SET price_usd=p_price,duration_apys=p_apys,enabled=p_enabled WHERE id=p_id AND NOT retired AND clone_of IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable'; END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.request_bix_duration_stake(p_package text, p_days integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.packages%ROWTYPE; new_id uuid; v_bal numeric; v_apy numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_days IS NULL OR NOT(p_days=ANY(ARRAY[30,60,90,180,360])) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
 SELECT * INTO p FROM public.packages WHERE id=p_package AND enabled AND NOT retired FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable or closed'; END IF;
 v_apy := (p.duration_apys->>p_days::text)::numeric;
 IF v_apy IS NULL THEN RAISE EXCEPTION 'Duration unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||auth.uid()::text));
 v_bal := COALESCE(public.bix_vusdt_balance(auth.uid()),0);
 IF v_bal<p.price_usd THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt) VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true) RETURNING id INTO new_id;
 RETURN new_id;
END $function$;

CREATE OR REPLACE FUNCTION public.bix_stake_bix(p_amount numeric, p_days integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_bal numeric; new_id uuid; sponsor uuid; cfg jsonb; pct numeric;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF p_days IS NULL OR p_days NOT IN (30,90,180,360,540) THEN RAISE EXCEPTION 'Invalid lock period'; END IF;
IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<10 THEN RAISE EXCEPTION 'Minimum stake is 10 BIX'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(auth.uid());
IF COALESCE(v_bal,0)<p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
-- booster rate is monthly; stored apy is the annual equivalent
INSERT INTO public.bix_stakes(user_id,amount_bix,apy,lock_days) VALUES(auth.uid(),p_amount,public.bix_stake_apy(p_amount,p_days)*12,p_days) RETURNING id INTO new_id;
SELECT referred_by INTO sponsor FROM public.referral_codes WHERE user_id=auth.uid();
SELECT value INTO cfg FROM public.app_settings WHERE key='referrals';
pct:=LEAST(100,GREATEST(0,COALESCE((cfg->>'bixDirectPct')::numeric,(cfg->>'direct')::numeric,10)));
IF sponsor IS NOT NULL AND sponsor<>auth.uid() AND COALESCE((cfg->>'bixDirectEnabled')::boolean,true) AND pct>0 THEN
INSERT INTO public.bix_referral_bonuses(stake_id,referrer_id,member_id,amount_bix,rate_pct) VALUES(new_id,sponsor,auth.uid(),round(p_amount*pct/100,6),pct);
END IF;
RETURN new_id;
END $function$;