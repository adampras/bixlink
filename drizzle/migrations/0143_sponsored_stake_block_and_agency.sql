
-- Option A: sponsored leaders may only stake from withdrawable (real) USDT
CREATE OR REPLACE FUNCTION public.bix_assert_real_stake_funds(p_user uuid, p_usdt numeric)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_led jsonb;
BEGIN
  IF public.bix_lock_exempt_reason(p_user) IS NOT NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved' AND COALESCE(virtual_usd,0) > 0)
     AND NOT EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_user AND owner_access = 'closed') THEN RETURN; END IF;
  v_led := public.bix_balance_ledger(p_user);
  IF COALESCE((v_led->>'withdrawable_usdt')::numeric,0) < p_usdt THEN
    RAISE EXCEPTION 'Sponsored / virtual balance cannot be staked. Only real USDT (deposit & real bonus) can fund new staking.';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bix_assert_real_stake_funds(uuid, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_bix_duration_stake(p_package text, p_days integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
 PERFORM public.bix_assert_real_stake_funds(auth.uid(), p.price_usd);
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt) VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true) RETURNING id INTO new_id;
 RETURN new_id;
END $function$;

CREATE OR REPLACE FUNCTION public.request_bix_duration_stake_mode(p_package text, p_days integer, p_mode text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
 PERFORM public.bix_assert_real_stake_funds(auth.uid(), p.price_usd*0.7);
 PERFORM public.bix_assert_bix_unlocked(auth.uid(), v_bix);
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt,payment_mode,bix_paid,bix_price_usd)
 VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true,'hybrid',v_bix,v_price) RETURNING id INTO new_id;
 RETURN new_id;
END $function$;

-- Regional agency program
CREATE TABLE public.bix_agency_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL CHECK (tier IN ('national','city')),
  country text NOT NULL,
  city text,
  contact text NOT NULL,
  commitment_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  license_no text UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.bix_agency_applications TO authenticated;
GRANT ALL ON public.bix_agency_applications TO service_role;
ALTER TABLE public.bix_agency_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner reads agency" ON public.bix_agency_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bix_agency_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT value FROM public.app_settings WHERE key='bix_agency'),
    '{"enabled":false,"national":{"enabled":true,"minUsd":25000,"maxUsd":100000,"overridePct":3,"perCountry":1},"city":{"enabled":true,"minUsd":5000,"maxUsd":10000,"overridePct":1.5,"perCity":3}}'::jsonb)
$$;
GRANT EXECUTE ON FUNCTION public.bix_agency_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_agency_save(p_config jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF jsonb_typeof(p_config->'national') <> 'object' OR jsonb_typeof(p_config->'city') <> 'object' THEN RAISE EXCEPTION 'Invalid config'; END IF;
  IF (p_config#>>'{national,minUsd}')::numeric <= 0 OR (p_config#>>'{city,minUsd}')::numeric <= 0
     OR (p_config#>>'{national,maxUsd}')::numeric < (p_config#>>'{national,minUsd}')::numeric
     OR (p_config#>>'{city,maxUsd}')::numeric < (p_config#>>'{city,minUsd}')::numeric THEN RAISE EXCEPTION 'Invalid amounts'; END IF;
  INSERT INTO public.app_settings(key,value) VALUES('bix_agency',p_config) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
  RETURN public.bix_agency_config();
END $$;
REVOKE ALL ON FUNCTION public.bix_agency_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_agency_save(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_agency_apply(p_tier text, p_country text, p_city text, p_contact text, p_usd numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c jsonb := public.bix_agency_config(); t jsonb; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((c->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'Agency program is closed'; END IF;
  IF p_tier NOT IN ('national','city') THEN RAISE EXCEPTION 'Invalid tier'; END IF;
  t := c->p_tier;
  IF NOT COALESCE((t->>'enabled')::boolean,true) THEN RAISE EXCEPTION 'This agency level is closed'; END IF;
  IF length(trim(coalesce(p_country,''))) < 2 OR length(p_country) > 60 THEN RAISE EXCEPTION 'Country required'; END IF;
  IF p_tier='city' AND (length(trim(coalesce(p_city,''))) < 2 OR length(p_city) > 60) THEN RAISE EXCEPTION 'City required'; END IF;
  IF length(trim(coalesce(p_contact,''))) < 5 OR length(p_contact) > 120 THEN RAISE EXCEPTION 'Contact required'; END IF;
  IF p_usd < (t->>'minUsd')::numeric OR p_usd > (t->>'maxUsd')::numeric THEN RAISE EXCEPTION 'Commitment outside the allowed range'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_agency_applications WHERE user_id=auth.uid() AND status IN ('pending','approved')) THEN RAISE EXCEPTION 'You already have an active agency application'; END IF;
  IF p_tier='national' AND (SELECT count(*) FROM public.bix_agency_applications WHERE tier='national' AND status='approved' AND lower(country)=lower(trim(p_country))) >= COALESCE((t->>'perCountry')::int,1) THEN RAISE EXCEPTION 'National slot for this country is already filled'; END IF;
  IF p_tier='city' AND (SELECT count(*) FROM public.bix_agency_applications WHERE tier='city' AND status='approved' AND lower(country)=lower(trim(p_country)) AND lower(city)=lower(trim(p_city))) >= COALESCE((t->>'perCity')::int,3) THEN RAISE EXCEPTION 'City slots are already filled'; END IF;
  INSERT INTO public.bix_agency_applications(user_id,tier,country,city,contact,commitment_usd)
  VALUES(auth.uid(),p_tier,trim(p_country),NULLIF(trim(coalesce(p_city,'')),''),trim(p_contact),p_usd) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.bix_agency_apply(text,text,text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_agency_apply(text,text,text,text,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_agency_review(p_id uuid, p_status text, p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.bix_agency_applications%ROWTYPE; v_lic text;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF p_status NOT IN ('approved','rejected','revoked') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO a FROM public.bix_agency_applications WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  v_lic := a.license_no;
  IF p_status='approved' AND v_lic IS NULL THEN
    v_lic := 'BX-AGENT-' || upper(left(regexp_replace(a.country,'[^A-Za-z]','','g'),3)) || '-' ||
      CASE WHEN a.tier='city' THEN upper(left(regexp_replace(coalesce(a.city,''),'[^A-Za-z]','','g'),3)) ELSE 'NAT' END || '-' ||
      lpad(((SELECT count(*) FROM public.bix_agency_applications WHERE license_no IS NOT NULL)+1)::text,3,'0');
  END IF;
  UPDATE public.bix_agency_applications SET status=p_status, license_no=v_lic, note=left(p_note,300), reviewed_at=now() WHERE id=p_id;
  RETURN jsonb_build_object('status',p_status,'license_no',v_lic);
END $$;
REVOKE ALL ON FUNCTION public.bix_agency_review(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_agency_review(uuid,text,text) TO authenticated;
