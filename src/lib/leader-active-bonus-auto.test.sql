-- Privileged test connection only; all fixtures roll back in a subtransaction.
DO $$
DECLARE
 owner_id uuid; leader_id uuid:=gen_random_uuid(); loan_id uuid:=gen_random_uuid(); closed_id uuid:=gen_random_uuid();
 real_member uuid; real_stake uuid; mixed_member uuid; mixed_stake uuid;
 led jsonb; denied boolean; before_count bigint;
BEGIN
 BEGIN
 SELECT user_id INTO owner_id FROM public.user_roles WHERE public.bix_is_owner1_user(user_id) LIMIT 1;
 SELECT user_id,id INTO real_member,real_stake FROM public.stakes WHERE public.bix_active_bonus_real_source(user_id,id) LIMIT 1;
 SELECT user_id,id INTO mixed_member,mixed_stake FROM public.stakes WHERE funded_vusdt LIMIT 1;
 IF owner_id IS NULL OR real_stake IS NULL OR mixed_stake IS NULL THEN RAISE EXCEPTION 'Verified owner and real/mixed source fixtures required'; END IF;
 INSERT INTO public.bix_leaders(user_id,status,virtual_usd,require_turnover,created_at,support_kind,owner_access)
 VALUES(leader_id,'approved',1000,true,now()-interval '1 day','virtual','normal'),
       (loan_id,'approved',1000,true,now()-interval '1 day','loan','normal'),
       (closed_id,'approved',1000,true,now()-interval '1 day','loan','closed');
 PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
 denied:=false;
 BEGIN PERFORM public.bix_active_bonus_auto_set(true); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: non-owner changed global switch'; END IF;
 denied:=false;
 BEGIN PERFORM public.bix_active_bonus_auto_admin(); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: non-owner read global switch'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bix_active_bonus_auto_set(false);
 IF public.bix_active_bonus_access(leader_id) THEN RAISE EXCEPTION 'FAIL: OFF grants normal leader access'; END IF;
 INSERT INTO public.bix_pending_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd)
 VALUES(leader_id,real_member,real_stake,'direct',1,current_date,100,10,100,70,30,1),
       (leader_id,mixed_member,mixed_stake,'direct',1,current_date,100,10,28,20,8,1),
       (loan_id,real_member,real_stake,'direct',1,current_date,100,10,100,70,30,1),
       (closed_id,real_member,real_stake,'direct',1,current_date,100,10,100,70,30,1);
 INSERT INTO public.wallet_transactions(user_id,type,amount_usd,net_usd,status) VALUES(leader_id,'reward',40,40,'approved');
 PERFORM public.bix_active_bonus_auto_set(true);
 IF NOT (public.bix_active_bonus_auto_admin()->>'enabled')::boolean THEN RAISE EXCEPTION 'FAIL: switch ON readback'; END IF;
 IF (SELECT count(*) FROM public.bix_pending_network_bonuses WHERE user_id=leader_id)<>1 OR
    (SELECT count(*) FROM public.bix_usdt_network_bonuses WHERE user_id=leader_id)<>1 THEN RAISE EXCEPTION 'FAIL: mixed-source pending release'; END IF;
 IF NOT (SELECT funded_vusdt FROM public.stakes WHERE id=mixed_stake) THEN RAISE EXCEPTION 'FAIL: mixed stake reclassified'; END IF;
 led:=public.bix_balance_ledger(leader_id);
 IF (led->>'withdrawable_usdt')::numeric<>70 OR (led->>'locked_usdt')::numeric<>1040 THEN RAISE EXCEPTION 'FAIL: expected 70 bonus unlocked, 1000 capital and 40 profit locked: %',led; END IF;
 IF public.bix_locked_bonus_bix(leader_id)<>0 THEN RAISE EXCEPTION 'FAIL: real 30 BIX bonus locked'; END IF;
 IF (led->>'qualified')::boolean OR led->>'exempt' IS NOT NULL THEN RAISE EXCEPTION 'FAIL: global grants full qualification'; END IF;
 led:=public.bix_balance_ledger(loan_id);
 IF (led->>'withdrawable_usdt')::numeric<>70 OR (led->>'locked_usdt')::numeric<>1000 THEN RAISE EXCEPTION 'FAIL: loan bonus not automatically unlocked'; END IF;
 IF public.bix_active_bonus_access(closed_id) OR (SELECT count(*) FROM public.bix_pending_network_bonuses WHERE user_id=closed_id)<>1 THEN RAISE EXCEPTION 'FAIL: explicit Closed bypass'; END IF;
 SELECT count(*) INTO before_count FROM public.bix_usdt_network_bonuses WHERE user_id IN(leader_id,loan_id,closed_id);
 PERFORM public.bix_active_bonus_auto_set(true);
 IF (SELECT count(*) FROM public.bix_usdt_network_bonuses WHERE user_id IN(leader_id,loan_id,closed_id))<>before_count THEN RAISE EXCEPTION 'FAIL: repeated ON duplicates credit'; END IF;
 INSERT INTO public.bix_usdt_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd)
 VALUES(leader_id,real_member,real_stake,'matching',1,current_date,100,10,10,7,3,1);
 IF (SELECT count(*) FROM public.bix_usdt_network_bonuses WHERE user_id=leader_id)<>2 THEN RAISE EXCEPTION 'FAIL: future real matching held'; END IF;
 led:=public.bix_balance_ledger(leader_id);
 IF (led->>'withdrawable_usdt')::numeric<>77 THEN RAISE EXCEPTION 'FAIL: future 7 USDT bonus locked'; END IF;
 PERFORM set_config('request.jwt.claim.sub',leader_id::text,true);
 denied:=false;
 BEGIN PERFORM public.bix_claim_stake_profit(); EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%turnover target%' THEN RAISE; END IF; denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'FAIL: assistance profit unlocked'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM public.bix_active_bonus_auto_set(false);
 led:=public.bix_balance_ledger(leader_id);
 IF (led->>'withdrawable_usdt')::numeric<>0 OR public.bix_locked_bonus_bix(leader_id)<>33 THEN RAISE EXCEPTION 'FAIL: OFF restores original locks'; END IF;
 PERFORM public.bix_leader_set_access(loan_id,'active_bonus');
 IF NOT public.bix_active_bonus_access(loan_id) THEN RAISE EXCEPTION 'FAIL: OFF disables individual ON'; END IF;
 RAISE NOTICE 'PASS: global ON/OFF, owner-only access, real/mixed separation, leader/loan, 70+7 USDT and 30+3 BIX, 1000 capital/40 profit lock, Closed, idempotency, future credits and individual overrides';
 RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Rollback successful regression fixtures';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $$;