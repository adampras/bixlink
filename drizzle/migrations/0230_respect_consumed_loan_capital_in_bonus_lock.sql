DO $$
DECLARE original text; changed text;
BEGIN
 original:=pg_get_functiondef('public.bix_balance_ledger(uuid)'::regprocedure);
 changed:=replace(original,'v_locked:=v_vusdt+v_virtual+v_rew_since+v_bu_real_since+v_bu_unreal-v_active_release;','v_locked:=GREATEST(v_virtual+public.bix_vusdt_component(p_user),0)+v_rew_since+v_bu_real_since+v_bu_unreal-v_active_release;');
 IF changed=original THEN RAISE EXCEPTION 'Sponsored lock calculation not found'; END IF;
 EXECUTE changed;
END $$;