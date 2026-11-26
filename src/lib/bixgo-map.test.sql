-- Full transactional regression: all fixtures, settings and ledger writes roll back.
BEGIN;
DO $$
DECLARE owner_id uuid; member_id uuid; a uuid; b uuid; result jsonb; failed boolean; before_balance numeric; after_balance numeric;
BEGIN
 SELECT u.id INTO owner_id FROM auth.users u WHERE lower(email)='bixdevpras@gmail.com';
 SELECT u.id INTO member_id FROM auth.users u WHERE email_confirmed_at IS NOT NULL AND lower(email) NOT LIKE '%@wallet.bixlink.invalid' AND id<>owner_id AND NOT EXISTS(SELECT 1 FROM public.bix_clone_accounts WHERE user_id=u.id) ORDER BY created_at LIMIT 1;
 IF owner_id IS NULL OR member_id IS NULL THEN RAISE EXCEPTION 'Verified owner and member fixtures required'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bixgo_map_save(true,2,2,1000);
 PERFORM set_config('request.jwt.claim.sub',member_id::text,true);
 failed:=false; BEGIN PERFORM public.bixgo_map_save(true,1000,20,1000000); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'FAIL: non-owner settings access'; END IF;
 a:=public.bixgo_map_submit('BIXGO Regression Private '||substr(gen_random_uuid()::text,1,8),'entrance',0,0,'Test location','Wait at gate','',false);
 failed:=false; BEGIN PERFORM public.bixgo_map_submit((SELECT name FROM public.bixgo_map_points WHERE id=a),'entrance',0.00001,0.00001,'','','',false); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'FAIL: duplicate location accepted'; END IF;
 failed:=false; BEGIN PERFORM public.bixgo_map_review(a,'approved',''); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'FAIL: non-owner review access'; END IF;
 result:=public.bixgo_map_claim(); IF (result->>'claimed')::numeric<>0 THEN RAISE EXCEPTION 'FAIL: pending reward claimed'; END IF;
 b:=public.bixgo_map_submit('BIXGO Regression Public '||substr(gen_random_uuid()::text,1,8),'entrance',0.001,0.001,'Test location','Wait at gate','',true);
 failed:=false; BEGIN PERFORM public.bixgo_map_submit('BIXGO Regression Quota','entrance',0.01,0.01,'','','',true); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'FAIL: daily quota bypass'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bixgo_map_review(a,'approved',''); PERFORM public.bixgo_map_review(a,'approved',''); PERFORM public.bixgo_map_review(b,'approved','');
 IF EXISTS(SELECT 1 FROM public.bixgo_map_search('BIXGO Regression',NULL,NULL) WHERE id=a) THEN RAISE EXCEPTION 'FAIL: private point exposed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.bixgo_map_search('BIXGO Regression',NULL,NULL) WHERE id=b) THEN RAISE EXCEPTION 'FAIL: approved point missing'; END IF;
 PERFORM set_config('request.jwt.claim.sub',member_id::text,true);
 SELECT bix_balance INTO before_balance FROM public.bix_asset_balances(member_id);
 result:=public.bixgo_map_claim(); IF (result->>'claimed')::numeric<>4 THEN RAISE EXCEPTION 'FAIL: reward must be exactly 4 BIX'; END IF;
 result:=public.bixgo_map_claim(); IF (result->>'claimed')::numeric<>0 THEN RAISE EXCEPTION 'FAIL: repeated claim credited'; END IF;
 SELECT bix_balance INTO after_balance FROM public.bix_asset_balances(member_id);
 IF after_balance-before_balance<>4 THEN RAISE EXCEPTION 'FAIL: wallet credit delta'; END IF;
 IF EXISTS(SELECT 1 FROM public.bixgo_map_points WHERE id IN (a,b) AND claim_id IS NULL) THEN RAISE EXCEPTION 'FAIL: missing audit linkage'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bixgo_map_review(b,'archived','Outdated location');
 IF EXISTS(SELECT 1 FROM public.bixgo_map_search('BIXGO Regression',NULL,NULL) WHERE id=b) THEN RAISE EXCEPTION 'FAIL: archived point public'; END IF;
 RAISE NOTICE 'PASS: owner controls, duplicate prevention, quota, private/public search, review idempotency, pending gate, 4 BIX credit, repeat claim, audit linkage and archive';
END $$;
ROLLBACK;