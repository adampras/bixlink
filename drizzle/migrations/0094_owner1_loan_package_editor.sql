ALTER TABLE public.bix_leaders ADD COLUMN loan_package_id text;
UPDATE public.bix_leaders SET loan_package_id = CASE virtual_usd WHEN 100 THEN 'EXPLORER' WHEN 500 THEN 'PIONEER' WHEN 1000 THEN 'BUILDER' END WHERE support_kind='loan';
CREATE OR REPLACE FUNCTION public.bix_loan_package_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('packages', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'usd',COALESCE((s.value->'packages'->p.id->>'usd')::numeric,p.price_usd),'enabled',COALESCE((s.value->'packages'->p.id->>'enabled')::boolean,true) AND p.enabled AND NOT p.retired) ORDER BY p.price_usd) FROM public.packages p LEFT JOIN public.app_settings s ON s.key='loan_packages' WHERE p.id IN ('EXPLORER','PIONEER','BUILDER')), '[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.bix_loan_package_config() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_package_config() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.bix_loan_package_save(p_config jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; v jsonb := '{}'::jsonb; amount numeric;
BEGIN
 IF NOT public.is_bix_admin() OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)='bixdevpras@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 IF jsonb_typeof(p_config->'packages') IS DISTINCT FROM 'array' OR jsonb_array_length(p_config->'packages')<>3 THEN RAISE EXCEPTION 'Three loan packages required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('bix_leader_pool'));
 FOR r IN SELECT * FROM jsonb_array_elements(p_config->'packages') LOOP
  IF r->>'id' NOT IN ('EXPLORER','PIONEER','BUILDER') OR r->>'id' IS NULL OR v ? (r->>'id') OR jsonb_typeof(r->'usd') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid loan package'; END IF;
  amount := (r->>'usd')::numeric;
  IF amount<=0 OR amount>1000000 OR amount<>round(amount,2) THEN RAISE EXCEPTION 'Invalid loan value'; END IF;
  v := v || jsonb_build_object(r->>'id',jsonb_build_object('usd',amount,'enabled',r->'enabled'));
 END LOOP;
 INSERT INTO public.app_settings(key,value) VALUES('loan_packages',jsonb_build_object('packages',v)) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
 RETURN public.bix_loan_package_config();
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_package_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_package_save(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.bix_claim_conditional_leader(p_package text,p_days integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); r jsonb; p public.packages%ROWTYPE; v_price numeric; v_pool numeric; v_used numeric; v_stake uuid; v_sponsor uuid; v_max int; v_taken int; v_apy numeric;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_days IS DISTINCT FROM 360 THEN RAISE EXCEPTION 'Loan duration is 360 days'; END IF;
 IF COALESCE((SELECT (value->>'loanEnabled')::boolean FROM app_settings WHERE key='readiness'),true)=false THEN RAISE EXCEPTION 'Loan program is currently closed'; END IF;
 IF NOT public.bix_in_owner1_network() OR EXISTS(SELECT 1 FROM bix_clone_accounts WHERE user_id=v_user) THEN RAISE EXCEPTION 'Not available for your account or network'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bix_loan_devices WHERE user_id=v_user) THEN RAISE EXCEPTION 'Register your loan device first'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('bix_leader_pool'));
 IF EXISTS(SELECT 1 FROM bix_leaders WHERE user_id=v_user) THEN RAISE EXCEPTION 'Conditional leader account already claimed'; END IF;
 SELECT x INTO r FROM jsonb_array_elements(public.bix_loan_package_config()->'packages') x WHERE x->>'id'=p_package AND (x->>'enabled')::boolean;
 IF r IS NULL THEN RAISE EXCEPTION 'Loan package unavailable or closed'; END IF;
 v_price:=(r->>'usd')::numeric;
 SELECT * INTO p FROM packages WHERE id=p_package AND enabled AND NOT retired FOR SHARE;
 v_apy:=(p.duration_apys->>'360')::numeric;
 IF v_apy IS NULL THEN RAISE EXCEPTION 'Loan duration unavailable'; END IF;
 SELECT referred_by INTO v_sponsor FROM referral_codes WHERE user_id=v_user;
 v_max:=CASE p_package WHEN 'BUILDER' THEN 1 WHEN 'PIONEER' THEN 2 ELSE 10 END;
 IF EXISTS(SELECT 1 FROM bix_leaders WHERE user_id=v_sponsor AND support_kind='loan' AND status='approved') THEN
  SELECT count(*) INTO v_taken FROM bix_leaders l JOIN referral_codes rc ON rc.user_id=l.user_id WHERE rc.referred_by=v_sponsor AND l.support_kind='loan' AND l.status='approved' AND l.loan_package_id=p_package;
  IF v_taken>=v_max THEN RAISE EXCEPTION 'Sponsor loan tier quota is full'; END IF;
 END IF;
 IF (SELECT count(*) FROM bix_leaders WHERE status='approved')>=100 THEN RAISE EXCEPTION 'Leader limit (100) reached'; END IF;
 SELECT COALESCE((value->>'poolUsd')::numeric,1000000) INTO v_pool FROM app_settings WHERE key='leader_pool';
 SELECT COALESCE(sum(virtual_usd),0) INTO v_used FROM bix_leaders WHERE status='approved';
 IF v_used+v_price>COALESCE(v_pool,1000000) THEN RAISE EXCEPTION 'Leader pool is full'; END IF;
 INSERT INTO bix_leaders(user_id,status,virtual_usd,require_turnover,turnover_multiple,scope,reviewed_at,support_kind,loan_package_id) VALUES(v_user,'approved',v_price,true,5,'global',now(),'loan',p_package);
 INSERT INTO stakes(user_id,package_id,amount_usd,apy,lock_days,status,funded_vusdt,payment_mode) VALUES(v_user,p_package,v_price,v_apy,360,'pending',true,'usdt') RETURNING id INTO v_stake;
 RETURN jsonb_build_object('stake_id',v_stake,'package',p_package,'value_usd',v_price,'target_usd',v_price*5,'days',360,'sponsor_id',v_sponsor);
END $$;
REVOKE ALL ON FUNCTION public.bix_claim_conditional_leader(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_claim_conditional_leader(text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.bix_loan_quota(p_sponsor uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.uid()<>p_sponsor AND NOT public.is_bix_admin()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 SELECT jsonb_agg(jsonb_build_object('price',(x->>'usd')::numeric,'max',CASE x->>'id' WHEN 'BUILDER' THEN 1 WHEN 'PIONEER' THEN 2 ELSE 10 END,'used',(SELECT count(*) FROM bix_leaders l JOIN referral_codes rc ON rc.user_id=l.user_id WHERE rc.referred_by=p_sponsor AND l.support_kind='loan' AND l.status='approved' AND l.loan_package_id=x->>'id')) ORDER BY (x->>'usd')::numeric DESC) INTO r FROM jsonb_array_elements(public.bix_loan_package_config()->'packages') x;
 RETURN jsonb_build_object('sponsor_is_loan',EXISTS(SELECT 1 FROM bix_leaders WHERE user_id=p_sponsor AND support_kind='loan' AND status='approved'),'quota',r);
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_quota(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_quota(uuid) TO authenticated,service_role;