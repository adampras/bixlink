-- Run with the privileged database test connection.
-- Every fixture and financial write is rolled back, including failed assertions.
BEGIN;
DO $$
DECLARE
 owner_id uuid; leader_id uuid:=gen_random_uuid(); loan_id uuid:=gen_random_uuid();
 real_member uuid:=gen_random_uuid(); sponsored_member uuid:=gen_random_uuid();
 real_stake uuid:=gen_random_uuid(); sponsored_stake uuid:=gen_random_uuid();
 ledger jsonb; failed boolean;
BEGIN
 SELECT u.user_id INTO owner_id FROM public.user_roles u WHERE public.bix_is_owner1_user(u.user_id) LIMIT 1;
 SELECT user_id,id INTO real_member,real_stake FROM public.stakes WHERE public.bix_active_bonus_real_source(user_id,id) LIMIT 1;
 SELECT user_id,id INTO sponsored_member,sponsored_stake FROM public.stakes WHERE funded_vusdt LIMIT 1;
 IF owner_id IS NULL OR real_stake IS NULL OR sponsored_stake IS NULL THEN RAISE EXCEPTION 'Owner and existing real/virtual stake fixtures required'; END IF;
 INSERT INTO public.bix_leaders(user_id,status,virtual_usd,require_turnover,created_at,support_kind)
 VALUES(leader_id,'approved',1000,true,now()-interval '1 day','virtual'),(loan_id,'approved',1000,true,now()-interval '1 day','loan');
 IF NOT public.bix_active_bonus_real_source(real_member,real_stake) THEN RAISE EXCEPTION 'FAIL: real USDT source'; END IF;
 IF public.bix_active_bonus_real_source(sponsored_member,sponsored_stake) THEN RAISE EXCEPTION 'FAIL: vUSDT source'; END IF;
 IF public.bix_active_bonus_real_source(real_member,NULL) OR public.bix_active_bonus_real_source(sponsored_member,real_stake) THEN RAISE EXCEPTION 'FAIL: missing/mismatched source'; END IF;
 PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
 failed:=false;
 BEGIN PERFORM public.bix_leader_set_access(leader_id,'active_bonus'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'FAIL: non-owner switch'; END IF;
 INSERT INTO public.bix_pending_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd)
 VALUES(leader_id,real_member,real_stake,'direct',1,current_date,100,10,100,70,30,1),
       (leader_id,sponsored_member,sponsored_stake,'direct',1,current_date,100,10,28,20,8,1);
 INSERT INTO public.wallet_transactions(user_id,type,amount_usd,net_usd,status,created_at)
 VALUES(leader_id,'reward',40,40,'approved',now());
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bix_leader_set_access(leader_id,'active_bonus');
 IF (SELECT count(*) FROM public.bix_pending_network_bonuses WHERE user_id=leader_id)<>1 THEN RAISE EXCEPTION 'FAIL: only real pending bonus released'; END IF;
 IF (SELECT count(*) FROM public.bix_usdt_network_bonuses WHERE user_id=leader_id)<>1 THEN RAISE EXCEPTION 'FAIL: real bonus readback'; END IF;
 ledger:=public.bix_balance_ledger(leader_id);
 IF (ledger->>'withdrawable_usdt')::numeric<>70 OR (ledger->>'locked_usdt')::numeric<>1040 THEN RAISE EXCEPTION 'FAIL: only 70 USDT bonus unlocks, 1000 capital + 40 profit stays locked: %',ledger; END IF;
 IF ledger->>'exempt' IS NOT NULL OR (ledger->>'qualified')::boolean THEN RAISE EXCEPTION 'FAIL: active bonus must not qualify/exempt account'; END IF;
 IF public.bix_locked_bonus_bix(leader_id)<>0 THEN RAISE EXCEPTION 'FAIL: 30 BIX real-USDT bonus remains locked'; END IF;
 PERFORM public.bix_leader_set_access(leader_id,'normal');
 ledger:=public.bix_balance_ledger(leader_id);
 IF (ledger->>'withdrawable_usdt')::numeric<>0 OR public.bix_locked_bonus_bix(leader_id)<>30 THEN RAISE EXCEPTION 'FAIL: Normal restores locks'; END IF;
 PERFORM public.bix_leader_set_access(leader_id,'active_bonus');
 IF (SELECT count(*) FROM public.bix_usdt_network_bonuses WHERE user_id=leader_id)<>1 THEN RAISE EXCEPTION 'FAIL: repeated switch duplicates bonus'; END IF;
 PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
 failed:=false;
 BEGIN PERFORM public.bix_claim_stake_profit(); EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%turnover target%' THEN RAISE; END IF; failed:=true;
 END;
 IF NOT failed THEN RAISE EXCEPTION 'FAIL: assistance profit claim unlocked'; END IF;
 INSERT INTO public.bix_usdt_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd)
 VALUES(leader_id,real_member,real_stake,'matching',1,current_date,100,10,10,7,3,1);
 IF (SELECT count(*) FROM public.bix_usdt_network_bonuses WHERE user_id=leader_id)<>2 THEN RAISE EXCEPTION 'FAIL: future real matching held'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bix_leader_set_access(leader_id,'closed');
 ledger:=public.bix_balance_ledger(leader_id);
 IF (ledger->>'withdrawable_usdt')::numeric<>0 THEN RAISE EXCEPTION 'FAIL: Closed bypass'; END IF;
 PERFORM public.bix_leader_set_access(loan_id,'active_bonus');
 INSERT INTO public.bix_usdt_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd)
 VALUES(loan_id,real_member,real_stake,'direct',1,current_date,100,10,100,70,30,1);
 ledger:=public.bix_balance_ledger(loan_id);
 IF (ledger->>'withdrawable_usdt')::numeric<>70 OR (ledger->>'locked_usdt')::numeric<>1000 OR (ledger->>'qualified')::boolean THEN RAISE EXCEPTION 'FAIL: loan bonus-only access'; END IF;
 INSERT INTO public.bix_clone_accounts(user_id,email,label,created_by) VALUES(real_member,'rollback-test@bixlink.internal','Rollback source test',owner_id);
 IF public.bix_active_bonus_real_source(real_member,real_stake) THEN RAISE EXCEPTION 'FAIL: clone source'; END IF;
 RAISE NOTICE 'PASS: leader/loan bonus-only access, real-source filtering, owner gate, profit lock, pending release, future matching, Normal/Closed and idempotency';
END $$;
ROLLBACK;