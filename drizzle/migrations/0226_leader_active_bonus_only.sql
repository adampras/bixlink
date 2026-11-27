ALTER TABLE public.bix_leaders DROP CONSTRAINT bix_leaders_owner_access_chk;
ALTER TABLE public.bix_leaders ADD CONSTRAINT bix_leaders_owner_access_chk CHECK (owner_access IN ('normal','active_bonus','open','closed'));

CREATE OR REPLACE FUNCTION public.bix_active_bonus_real_source(p_member uuid, p_stake uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT NOT public.bix_is_sponsored_source(p_member,p_stake)
 AND EXISTS (SELECT 1 FROM public.stakes s WHERE s.id=p_stake AND s.user_id=p_member AND s.amount_usd>0 AND NOT s.funded_vusdt AND s.payment_mode IN ('usdt','hybrid'))
$$;
REVOKE ALL ON FUNCTION public.bix_active_bonus_real_source(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_active_bonus_real_source(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bix_leader_set_access(p_user uuid,p_access text,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 IF p_access IS NULL OR p_access NOT IN ('normal','active_bonus','open','closed') THEN RAISE EXCEPTION 'Invalid access mode'; END IF;
 UPDATE public.bix_leaders SET owner_access=p_access,owner_access_note=left(COALESCE(p_note,''),200),owner_access_at=now() WHERE user_id=p_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sponsored account not found'; END IF;
 IF p_access='active_bonus' AND EXISTS(SELECT 1 FROM public.bix_leaders WHERE user_id=p_user AND status='approved') THEN
  WITH moved AS (
   DELETE FROM public.bix_pending_network_bonuses WHERE user_id=p_user AND public.bix_active_bonus_real_source(member_id,source_stake_id) RETURNING *
  )
  INSERT INTO public.bix_usdt_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd,created_at)
  SELECT user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd,created_at FROM moved ON CONFLICT DO NOTHING;
 END IF;
 RETURN jsonb_build_object('user_id',p_user,'owner_access',p_access);
END $$;

CREATE OR REPLACE FUNCTION public.bix_hold_network_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF public.bix_bonus_qualified(NEW.user_id) OR (
  EXISTS(SELECT 1 FROM public.bix_leaders WHERE user_id=NEW.user_id AND status='approved' AND owner_access='active_bonus')
  AND public.bix_active_bonus_real_source(NEW.member_id,NEW.source_stake_id)
 ) THEN RETURN NEW; END IF;
 INSERT INTO public.bix_pending_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd,created_at)
 VALUES(NEW.user_id,NEW.member_id,NEW.source_stake_id,NEW.kind,NEW.level,NEW.bonus_date,NEW.base_usd,NEW.rate_pct,NEW.total_usd,NEW.usdt_amount,NEW.bix_amount,NEW.bix_price_usd,COALESCE(NEW.created_at,now())) ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.bix_balance_ledger(p_user uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
 l record; v_found boolean; v_ex text; v_total numeric; v_dep numeric; v_rew numeric; v_rew_since numeric := 0;
 v_virtual numeric := 0; v_vusdt numeric; v_bu_real numeric; v_bu_unreal numeric; v_bu_real_since numeric := 0;
 v_bb_real numeric; v_bb_unreal numeric; v_status jsonb; v_q boolean; v_locked numeric := 0; v_locked_bix numeric; v_recent jsonb;
 v_active_release numeric := 0;
BEGIN
 IF NOT (p_user=auth.uid() OR public.is_bix_admin() OR (auth.uid() IS NULL AND current_user='postgres')) THEN RETURN NULL; END IF;
 SELECT * INTO l FROM public.bix_leaders WHERE user_id=p_user; v_found:=FOUND;
 v_ex:=public.bix_lock_exempt_reason(p_user);
 v_total:=COALESCE(public.bix_wallet_balance(p_user),0);
 SELECT COALESCE(SUM(net_usd) FILTER (WHERE type='deposit'),0),COALESCE(SUM(net_usd) FILTER (WHERE type='reward'),0)
 INTO v_dep,v_rew FROM public.wallet_transactions WHERE user_id=p_user AND status='approved';
 IF v_found AND l.status='approved' THEN
  v_virtual:=COALESCE(l.virtual_usd,0);
  SELECT COALESCE(SUM(net_usd),0) INTO v_rew_since FROM public.wallet_transactions WHERE user_id=p_user AND type='reward' AND status='approved' AND created_at>=l.created_at;
 END IF;
 v_vusdt:=GREATEST(public.bix_vusdt_component(p_user)-CASE WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin') THEN 1000000 ELSE 0 END,0);
 SELECT COALESCE(SUM(usdt_amount) FILTER(WHERE NOT public.bix_is_sponsored_source(member_id,source_stake_id)),0),
 COALESCE(SUM(usdt_amount) FILTER(WHERE public.bix_is_sponsored_source(member_id,source_stake_id)),0),
 COALESCE(SUM(bix_amount) FILTER(WHERE NOT public.bix_is_sponsored_source(member_id,source_stake_id)),0),
 COALESCE(SUM(bix_amount) FILTER(WHERE public.bix_is_sponsored_source(member_id,source_stake_id)),0)
 INTO v_bu_real,v_bu_unreal,v_bb_real,v_bb_unreal FROM public.bix_usdt_network_bonuses WHERE user_id=p_user;
 IF v_found AND l.status='approved' THEN
  SELECT COALESCE(SUM(usdt_amount),0) INTO v_bu_real_since FROM public.bix_usdt_network_bonuses WHERE user_id=p_user AND created_at>=l.created_at AND NOT public.bix_is_sponsored_source(member_id,source_stake_id);
  IF l.owner_access='active_bonus' THEN
   SELECT COALESCE(SUM(usdt_amount),0) INTO v_active_release FROM public.bix_usdt_network_bonuses WHERE user_id=p_user AND created_at>=l.created_at AND public.bix_active_bonus_real_source(member_id,source_stake_id);
  END IF;
 END IF;
 v_bb_real:=v_bb_real+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved' AND NOT public.bix_is_sponsored_source(member_id,NULL)),0);
 v_bb_unreal:=v_bb_unreal+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved' AND public.bix_is_sponsored_source(member_id,NULL)),0);
 v_status:=public.bix_leader_status(p_user);
 v_q:=COALESCE((v_status->>'qualified')::boolean,true);
 IF v_ex IS NOT NULL THEN v_locked:=0;
 ELSIF v_found AND l.owner_access='closed' THEN v_locked:=v_total;
 ELSIF v_found AND l.status='approved' AND l.require_turnover AND NOT v_q THEN
  v_locked:=v_vusdt+v_virtual+v_rew_since+v_bu_real_since+v_bu_unreal-v_active_release;
 ELSIF v_found AND l.status='approved' THEN v_locked:=v_vusdt;
 ELSE v_locked:=v_vusdt+v_bu_unreal;
 END IF;
 v_locked:=LEAST(GREATEST(v_locked,0),GREATEST(v_total,0));
 v_locked_bix:=public.bix_locked_bonus_bix(p_user);
 SELECT COALESCE(jsonb_agg(x ORDER BY x->>'at' DESC),'[]'::jsonb) INTO v_recent FROM (
 SELECT jsonb_build_object('at',b.created_at,'kind',b.kind,'level',b.level,'usdt',b.usdt_amount,'bix',b.bix_amount,'member',COALESCE(rc.code,'BIX-??????'),'real',NOT public.bix_is_sponsored_source(b.member_id,b.source_stake_id)) x
 FROM public.bix_usdt_network_bonuses b LEFT JOIN public.referral_codes rc ON rc.user_id=b.member_id WHERE b.user_id=p_user ORDER BY b.created_at DESC LIMIT 40) s;
 RETURN jsonb_build_object('total_usdt',round(v_total,4),'real_deposit_usdt',round(v_dep,4),'staking_reward_usdt',round(v_rew,4),'sponsor_capital_usdt',round(v_virtual,4),'vusdt_usdt',round(v_vusdt,4),'bonus_real_usdt',round(v_bu_real,4),'bonus_unreal_usdt',round(v_bu_unreal,4),'bonus_real_bix',round(v_bb_real,6),'bonus_unreal_bix',round(v_bb_unreal,6),'locked_usdt',round(v_locked,4),'withdrawable_usdt',round(GREATEST(v_total-v_locked,0),4),'locked_bix',round(COALESCE(v_locked_bix,0),6),'is_leader',v_found AND l.status='approved','qualified',v_q,'exempt',v_ex,'owner_access',CASE WHEN v_found THEN l.owner_access ELSE 'normal' END,'recent',v_recent);
END $$;

CREATE OR REPLACE FUNCTION public.bix_locked_bonus_bix(p_user uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE l record; v_q boolean;
BEGIN
 IF public.bix_lock_exempt_reason(p_user) IS NOT NULL THEN RETURN 0; END IF;
 SELECT * INTO l FROM public.bix_leaders WHERE user_id=p_user;
 IF FOUND AND l.owner_access='closed' THEN RETURN GREATEST(COALESCE((SELECT bix_balance FROM public.bix_asset_balances(p_user)),0),0); END IF;
 IF NOT FOUND OR l.status<>'approved' THEN RETURN public.bix_unreal_bonus_bix(p_user,NULL); END IF;
 IF NOT l.require_turnover THEN RETURN 0; END IF;
 v_q:=COALESCE((public.bix_leader_status(p_user)->>'qualified')::boolean,false);
 IF v_q THEN RETURN 0; END IF;
 RETURN COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved' AND created_at>=l.created_at),0)
 +COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved' AND created_at>=l.created_at),0)
 +COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user AND created_at>=l.created_at AND NOT(l.owner_access='active_bonus' AND public.bix_active_bonus_real_source(member_id,source_stake_id))),0)
 +COALESCE((SELECT SUM(amount_bix) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX' AND created_at>=l.created_at),0)
 +public.bix_unreal_bonus_bix(p_user,l.created_at);
END $$;