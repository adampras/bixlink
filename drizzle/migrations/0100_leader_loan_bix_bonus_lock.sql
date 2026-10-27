CREATE OR REPLACE FUNCTION public.bix_locked_bonus_bix(p_user uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; v_q boolean;
BEGIN
  SELECT * INTO l FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved';
  IF NOT FOUND OR NOT l.require_turnover THEN RETURN 0; END IF;
  v_q := COALESCE((public.bix_leader_status(p_user) ->> 'qualified')::boolean, false);
  IF v_q THEN RETURN 0; END IF;
  RETURN COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved' AND created_at >= l.created_at),0)
    + COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved' AND created_at >= l.created_at),0)
    + COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user AND created_at >= l.created_at),0)
    + COALESCE((SELECT SUM(amount_bix) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX' AND created_at >= l.created_at),0);
END $$;
REVOKE ALL ON FUNCTION public.bix_locked_bonus_bix(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_locked_bonus_bix(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_assert_bix_unlocked(p_user uuid, p_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_locked numeric; v_bal numeric;
BEGIN
  v_locked := public.bix_locked_bonus_bix(p_user);
  IF v_locked <= 0 THEN RETURN; END IF;
  SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(p_user);
  IF COALESCE(p_amount,0) > COALESCE(v_bal,0) - v_locked THEN
    RAISE EXCEPTION 'BIX bonus escrow locked: % BIX from sponsor/staking bonuses unlocks after your leader target (3x personal or 5x team) is qualified', round(v_locked, 4);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bix_assert_bix_unlocked(uuid, numeric) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_bonus_lock_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'bix_transfers' THEN
    PERFORM public.bix_assert_bix_unlocked(NEW.sender_id, NEW.amount_bix);
  ELSIF TG_TABLE_NAME = 'bix_p2p_offers' THEN
    IF NEW.side = 'sell' THEN PERFORM public.bix_assert_bix_unlocked(NEW.user_id, NEW.amount_bix); END IF;
  ELSIF TG_TABLE_NAME = 'swap_requests' THEN
    IF NEW.direction = 'BIX_TO_USDT' THEN PERFORM public.bix_assert_bix_unlocked(NEW.user_id, NEW.amount_in); END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bix_bonus_lock_transfers ON public.bix_transfers;
CREATE TRIGGER bix_bonus_lock_transfers BEFORE INSERT ON public.bix_transfers FOR EACH ROW EXECUTE FUNCTION public.bix_bonus_lock_guard();
DROP TRIGGER IF EXISTS bix_bonus_lock_p2p ON public.bix_p2p_offers;
CREATE TRIGGER bix_bonus_lock_p2p BEFORE INSERT ON public.bix_p2p_offers FOR EACH ROW EXECUTE FUNCTION public.bix_bonus_lock_guard();
DROP TRIGGER IF EXISTS bix_bonus_lock_swaps ON public.swap_requests;
CREATE TRIGGER bix_bonus_lock_swaps BEFORE INSERT ON public.swap_requests FOR EACH ROW EXECUTE FUNCTION public.bix_bonus_lock_guard();