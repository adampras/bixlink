-- Privileged connection only. All stake changes and bonus releases roll back.
DO $$
<<test_case>>
DECLARE
 owner_id uuid; member_id uuid:='674b0107-2e03-4fde-8216-53d7c542cc36';
 stake_id uuid:='1ce22ff9-4a50-4e8c-8129-c262a8a4f4b9';
 before_balance numeric; before_component numeric; before_locked numeric;
 denied boolean; led jsonb; before_withdrawable numeric; expected_bonus numeric;
BEGIN
 BEGIN
  SELECT user_id INTO owner_id FROM public.user_roles WHERE public.bix_is_owner1_user(user_id) LIMIT 1;
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Verified Owner 1 fixture required'; END IF;
  before_balance:=public.bix_wallet_balance_internal(member_id);
  before_component:=public.bix_vusdt_component(member_id);
  before_locked:=public.bix_locked_bonus_bix('98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73');
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  before_withdrawable:=(public.bix_balance_ledger('98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73')->>'withdrawable_usdt')::numeric;
  SELECT CASE WHEN funded_vusdt THEN 5.06 ELSE 0 END INTO expected_bonus FROM public.stakes WHERE id=stake_id;
  PERFORM set_config('request.jwt.claim.sub',member_id::text,true);
  denied:=false;
  BEGIN
   UPDATE public.stakes SET funded_vusdt=false,wallet_debit_preserved=true,
    funding_reconciliation=jsonb_build_object('original_funded_vusdt',true,'reviewed_by',owner_id,'verified_deposit_id','271ab444-4f8c-4469-86bd-fc50bb0df6a0')
    WHERE id=stake_id;
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE '%Owner 1 funding review required%' THEN RAISE; END IF;
   denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL: member changed funding source'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  UPDATE public.stakes SET funded_vusdt=false,wallet_debit_preserved=true,
   funding_reconciliation=jsonb_build_object('original_funded_vusdt',true,'reviewed_by',owner_id,'verified_deposit_id','271ab444-4f8c-4469-86bd-fc50bb0df6a0')
   WHERE id=stake_id AND funded_vusdt;
  IF public.bix_wallet_balance_internal(member_id) IS DISTINCT FROM before_balance OR
     public.bix_vusdt_component(member_id) IS DISTINCT FROM before_component THEN
   RAISE EXCEPTION 'FAIL: correcting a 100 USDT stake created extra wallet funds';
  END IF;
  IF NOT public.bix_active_bonus_real_source(member_id,stake_id) THEN RAISE EXCEPTION 'FAIL: verified real stake stays locked'; END IF;
  IF public.bix_active_bonus_real_source('b08bf5c3-9008-43ef-83d3-16378e09c536','2223526e-d5f8-4748-a854-cf2882c9b650') THEN
   RAISE EXCEPTION 'FAIL: 99.94 USDT plus virtual subsidy treated as fully real';
  END IF;
  denied:=false;
  BEGIN
   UPDATE public.stakes SET funded_vusdt=false,wallet_debit_preserved=true,
    funding_reconciliation=jsonb_build_object('original_funded_vusdt',true,'reviewed_by',owner_id,'verified_deposit_id','9d2d1baa-d78d-458f-889f-760b72cb1654')
    WHERE id='2223526e-d5f8-4748-a854-cf2882c9b650';
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE '%Verified real deposit backing required%' THEN RAISE; END IF;
   denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL: 99.94 deposit converted into 100 real USDT'; END IF;
  PERFORM public.bix_leader_set_access('98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73','active_bonus');
  led:=public.bix_balance_ledger('98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73');
  IF (led->>'withdrawable_usdt')::numeric IS DISTINCT FROM before_withdrawable+expected_bonus THEN RAISE EXCEPTION 'FAIL: expected only the unreleased 5.06 USDT Nadi bonus: %',led; END IF;
  IF (led->>'sponsor_capital_usdt')::numeric<>5000 OR
     (led->>'qualified')::boolean THEN RAISE EXCEPTION 'FAIL: 5000 USDT loan capital or qualification changed'; END IF;
  IF (SELECT sum(nb.bix_amount) FROM public.bix_usdt_network_bonuses nb WHERE nb.user_id='98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73' AND nb.member_id=test_case.member_id) IS DISTINCT FROM 10.12::numeric THEN
   RAISE EXCEPTION 'FAIL: expected 10.12 BIX from Nadi';
  END IF;
  IF public.bix_locked_bonus_bix('98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73') IS DISTINCT FROM before_locked THEN
   RAISE EXCEPTION 'FAIL: other BIX locks changed';
  END IF;
  PERFORM set_config('request.jwt.claim.sub','98aa8bbf-eea4-4e6b-bb95-b265b6bb3e73',true);
  denied:=false;
  BEGIN PERFORM public.bix_claim_stake_profit();
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE '%turnover target%' THEN RAISE; END IF;
   denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'FAIL: loan profit unlocked'; END IF;
  RAISE NOTICE 'PASS: Owner 1 source gate, 100 USDT debit conservation, 5.06 USDT + 10.12 BIX bonus, 5000 loan lock, mixed-source hold';
  RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Rollback reconciliation test';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $$;