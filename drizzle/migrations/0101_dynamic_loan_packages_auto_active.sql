CREATE OR REPLACE FUNCTION public.bix_loan_package_config() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v jsonb;
BEGIN
 SELECT value->'packages' INTO v FROM app_settings WHERE key='loan_packages';
 IF jsonb_typeof(v)='array' THEN
  RETURN jsonb_build_object('packages', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',x->>'id','usd',(x->>'usd')::numeric,'enabled',(x->>'enabled')::boolean,'quota',COALESCE((x->>'quota')::int,10)) ORDER BY (x->>'usd')::numeric) FROM jsonb_array_elements(v) x),'[]'::jsonb));
 END IF;
 RETURN jsonb_build_object('packages', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'usd',COALESCE((v->p.id->>'usd')::numeric,p.price_usd),'enabled',COALESCE((v->p.id->>'enabled')::boolean,true) AND p.enabled AND NOT p.retired,'quota',CASE p.id WHEN 'BUILDER' THEN 1 WHEN 'PIONEER' THEN 2 ELSE 10 END) ORDER BY p.price_usd) FROM packages p WHERE p.id IN ('EXPLORER','PIONEER','BUILDER')),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_package_config() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_package_config() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bix_loan_package_save(p_config jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; ids text[] := '{}'; out jsonb := '[]'::jsonb; amount numeric; q int; pid text;
BEGIN
 IF NOT public.is_bix_admin() OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)='bixdevpras@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 IF jsonb_typeof(p_config->'packages') IS DISTINCT FROM 'array' OR jsonb_array_length(p_config->'packages')<1 OR jsonb_array_length(p_config->'packages')>20 THEN RAISE EXCEPTION 'Between 1 and 20 loan packages required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('bix_leader_pool'));
 FOR r IN SELECT * FROM jsonb_array_elements(p_config->'packages') LOOP
  pid := upper(trim(r->>'id'));
  IF pid IS NULL OR pid !~ '^[A-Z0-9_-]{2,24}$' OR pid = ANY(ids) OR jsonb_typeof(r->'usd') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid loan package %', COALESCE(pid,''); END IF;
  amount := (r->>'usd')::numeric; q := COALESCE((r->>'quota')::int,10);
  IF amount<=0 OR amount>1000000 OR amount<>round(amount,2) THEN RAISE EXCEPTION 'Invalid loan value'; END IF;
  IF q<1 OR q>1000 THEN RAISE EXCEPTION 'Invalid sponsor quota'; END IF;
  ids := ids || pid;
  out := out || jsonb_build_array(jsonb_build_object('id',pid,'usd',amount,'enabled',(r->>'enabled')::boolean,'quota',q));
 END LOOP;
 INSERT INTO app_settings(key,value) VALUES('loan_packages',jsonb_build_object('packages',out)) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;
 RETURN public.bix_loan_package_config();
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_package_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_package_save(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_claim_conditional_leader(p_package text,p_days integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); r jsonb; p public.packages%ROWTYPE; v_price numeric; v_pool numeric; v_used numeric; v_stake uuid; v_sponsor uuid; v_max int; v_taken int; v_apy numeric; v_pkg text;
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
 v_price:=(r->>'usd')::numeric; v_max:=COALESCE((r->>'quota')::int,10);
 -- Stakes need a catalog package for APY: use the matching package, else the closest enabled package by price.
 SELECT * INTO p FROM packages WHERE id=p_package AND enabled AND NOT retired;
 IF p.id IS NULL THEN SELECT * INTO p FROM packages WHERE enabled AND NOT retired AND clone_of IS NULL AND duration_apys ? '360' ORDER BY abs(price_usd-v_price) LIMIT 1; END IF;
 v_apy:=(p.duration_apys->>'360')::numeric;
 IF p.id IS NULL OR v_apy IS NULL THEN RAISE EXCEPTION 'Loan duration unavailable'; END IF;
 v_pkg:=p.id;
 SELECT referred_by INTO v_sponsor FROM referral_codes WHERE user_id=v_user;
 IF EXISTS(SELECT 1 FROM bix_leaders WHERE user_id=v_sponsor AND support_kind='loan' AND status='approved') THEN
  SELECT count(*) INTO v_taken FROM bix_leaders l JOIN referral_codes rc ON rc.user_id=l.user_id WHERE rc.referred_by=v_sponsor AND l.support_kind='loan' AND l.status='approved' AND l.loan_package_id=p_package;
  IF v_taken>=v_max THEN RAISE EXCEPTION 'Sponsor loan tier quota is full'; END IF;
 END IF;
 IF (SELECT count(*) FROM bix_leaders WHERE status='approved')>=100 THEN RAISE EXCEPTION 'Leader limit (100) reached'; END IF;
 SELECT COALESCE((value->>'poolUsd')::numeric,1000000) INTO v_pool FROM app_settings WHERE key='leader_pool';
 SELECT COALESCE(sum(virtual_usd),0) INTO v_used FROM bix_leaders WHERE status='approved';
 IF v_used+v_price>COALESCE(v_pool,1000000) THEN RAISE EXCEPTION 'Leader pool is full'; END IF;
 INSERT INTO bix_leaders(user_id,status,virtual_usd,require_turnover,turnover_multiple,scope,reviewed_at,support_kind,loan_package_id) VALUES(v_user,'approved',v_price,true,5,'global',now(),'loan',p_package);
 INSERT INTO stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt,payment_mode) VALUES(v_user,v_pkg,v_price,v_apy,360,'active',now(),true,'usdt') RETURNING id INTO v_stake;
 RETURN jsonb_build_object('stake_id',v_stake,'package',p_package,'value_usd',v_price,'target_usd',v_price*5,'days',360,'sponsor_id',v_sponsor);
END $$;
REVOKE ALL ON FUNCTION public.bix_claim_conditional_leader(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_claim_conditional_leader(text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_loan_quota(p_sponsor uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.uid()<>p_sponsor AND NOT public.is_bix_admin()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
 SELECT jsonb_agg(jsonb_build_object('price',(x->>'usd')::numeric,'max',COALESCE((x->>'quota')::int,10),'used',(SELECT count(*) FROM bix_leaders l JOIN referral_codes rc ON rc.user_id=l.user_id WHERE rc.referred_by=p_sponsor AND l.support_kind='loan' AND l.status='approved' AND l.loan_package_id=x->>'id')) ORDER BY (x->>'usd')::numeric DESC) INTO r FROM jsonb_array_elements(public.bix_loan_package_config()->'packages') x WHERE (x->>'enabled')::boolean;
 RETURN jsonb_build_object('sponsor_is_loan',EXISTS(SELECT 1 FROM bix_leaders WHERE user_id=p_sponsor AND support_kind='loan' AND status='approved'),'quota',r);
END $$;
REVOKE ALL ON FUNCTION public.bix_loan_quota(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_loan_quota(uuid) TO authenticated,service_role;