ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS sponsored_stake_used boolean NOT NULL DEFAULT false;
UPDATE public.bix_leaders l SET sponsored_stake_used = true
 WHERE EXISTS (SELECT 1 FROM public.stakes s WHERE s.user_id = l.user_id AND s.created_at >= l.created_at AND s.status IN ('active','pending','completed'));

CREATE OR REPLACE FUNCTION public.bix_assert_real_stake_funds(p_user uuid, p_usdt numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_led jsonb; l public.bix_leaders%ROWTYPE;
BEGIN
  IF public.bix_lock_exempt_reason(p_user) IS NOT NULL THEN RETURN; END IF;
  SELECT * INTO l FROM public.bix_leaders WHERE user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF l.owner_access = 'closed' THEN RAISE EXCEPTION 'Akun bersponsor ini sedang DITUTUP oleh Owner 1.'; END IF;
  IF NOT (l.status = 'approved' AND COALESCE(l.virtual_usd,0) > 0) THEN RETURN; END IF;
  -- One-time allowance: the first staking after taking the loan/conditional package may use the sponsored balance.
  IF NOT l.sponsored_stake_used AND p_usdt <= COALESCE(l.virtual_usd,0) THEN
    UPDATE public.bix_leaders SET sponsored_stake_used = true WHERE user_id = p_user;
    RETURN;
  END IF;
  v_led := public.bix_balance_ledger(p_user);
  IF COALESCE((v_led->>'withdrawable_usdt')::numeric,0) < p_usdt THEN
    RAISE EXCEPTION 'Sponsored / virtual balance can only be staked once (your loan/conditional package). Further staking needs real USDT (deposit & real bonus).';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bix_assert_real_stake_funds(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- Loan claim itself consumes the one-time allowance
CREATE OR REPLACE FUNCTION public.bix_mark_loan_stake_used() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(NEW.virtual_usd,0) > 0 AND NEW.support_kind = 'loan'
     AND EXISTS (SELECT 1 FROM public.stakes WHERE user_id = NEW.user_id AND created_at >= NEW.created_at) THEN
    NEW.sponsored_stake_used := true;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bix_mark_loan_stake_used ON public.bix_leaders;
CREATE TRIGGER bix_mark_loan_stake_used BEFORE INSERT OR UPDATE OF status ON public.bix_leaders FOR EACH ROW EXECUTE FUNCTION public.bix_mark_loan_stake_used();

-- WD Matching Royalty
CREATE TABLE public.bix_wd_matching (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdraw_id uuid NOT NULL UNIQUE,
  upline_id uuid NOT NULL,
  member_id uuid NOT NULL,
  base_usd numeric NOT NULL,
  rate_pct numeric NOT NULL,
  usdt_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_wd_matching TO authenticated;
GRANT ALL ON public.bix_wd_matching TO service_role;
ALTER TABLE public.bix_wd_matching ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner1 wd matching read" ON public.bix_wd_matching FOR SELECT TO authenticated USING (upline_id = auth.uid() OR public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bix_wd_matching_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('enabled', false, 'feePct', 5, 'matchPct', 3, 'minStakeUsd', 100)
    || COALESCE((SELECT value FROM public.app_settings WHERE key = 'wd_matching'), '{}'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.bix_wd_matching_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_wd_matching_config() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_wd_matching_save(p_config jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f numeric := (p_config->>'feePct')::numeric; m numeric := (p_config->>'matchPct')::numeric; s numeric := (p_config->>'minStakeUsd')::numeric;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  IF f IS NULL OR f < 0.5 OR f > 20 THEN RAISE EXCEPTION 'WD fee must be 0.5%%–20%%'; END IF;
  IF m IS NULL OR m < 0 OR m > f THEN RAISE EXCEPTION 'Matching must be between 0%% and the WD fee'; END IF;
  IF s IS NULL OR s < 0 OR s > 100000 THEN RAISE EXCEPTION 'Invalid minimum active stake'; END IF;
  INSERT INTO public.app_settings(key, value) VALUES ('wd_matching', jsonb_build_object('enabled', COALESCE((p_config->>'enabled')::boolean,false), 'feePct', f, 'matchPct', m, 'minStakeUsd', s))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN public.bix_wd_matching_config();
END $$;
REVOKE ALL ON FUNCTION public.bix_wd_matching_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_wd_matching_save(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_bix_withdraw(p_amount numeric, p_address text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_fee numeric; v_led jsonb; v_balance numeric; v_today numeric; v_free numeric; v_cfg jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is $10'; END IF;
  IF p_amount > 10000 THEN RAISE EXCEPTION 'Maximum withdrawal is $10,000 per day per account'; END IF;
  IF length(trim(coalesce(p_address,''))) < 20 THEN RAISE EXCEPTION 'Valid wallet address required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT COALESCE(sum(amount_usd), 0) INTO v_today FROM public.wallet_transactions
  WHERE user_id = auth.uid() AND type = 'withdraw' AND status IN ('pending','approved') AND created_at >= date_trunc('day', now());
  IF v_today + p_amount > 10000 THEN RAISE EXCEPTION 'Daily withdrawal limit is $10,000 per account'; END IF;
  v_balance := public.bix_wallet_balance(auth.uid());
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_led := public.bix_balance_ledger(auth.uid());
  IF v_led ->> 'owner_access' = 'closed' AND v_led ->> 'exempt' IS NULL THEN
    RAISE EXCEPTION 'Akun bersponsor ini sedang DITUTUP oleh Owner 1. Penarikan tidak tersedia.';
  END IF;
  v_free := COALESCE((v_led ->> 'withdrawable_usdt')::numeric, 0);
  IF p_amount > v_free THEN
    RAISE EXCEPTION 'Saldo terkunci: hanya % USDT dana riil yang bisa ditarik. Modal sponsor, vUSDT dan bonus bersponsor (% USDT) tetap terkunci.', round(v_free, 2), round((v_led ->> 'locked_usdt')::numeric, 2);
  END IF;
  v_cfg := public.bix_wd_matching_config();
  IF (v_cfg->>'enabled')::boolean THEN
    v_fee := round(p_amount * (v_cfg->>'feePct')::numeric / 100, 2);
  ELSE
    v_fee := round(1 + p_amount * 0.005, 2);
  END IF;
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,address)
  VALUES (auth.uid(),'withdraw',p_amount,v_fee,p_amount - v_fee,trim(p_address)) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.request_bix_withdraw(numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_bix_withdraw(numeric,text) TO authenticated;

-- Pay matching only when the withdrawal is actually approved; idempotent per withdrawal.
CREATE OR REPLACE FUNCTION public.bix_wd_matching_pay() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cfg jsonb; v_up uuid; v_amt numeric; v_st jsonb;
BEGIN
  IF NEW.type <> 'withdraw' OR NEW.status <> 'approved' OR OLD.status = 'approved' THEN RETURN NEW; END IF;
  v_cfg := public.bix_wd_matching_config();
  IF NOT (v_cfg->>'enabled')::boolean OR (v_cfg->>'matchPct')::numeric <= 0 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT referred_by INTO v_up FROM public.referral_codes WHERE user_id = NEW.user_id;
  IF v_up IS NULL OR EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_up) THEN RETURN NEW; END IF;
  -- Active leader rule: upline needs own active real stake >= minimum
  IF COALESCE((SELECT SUM(amount_usd) FROM public.stakes WHERE user_id = v_up AND status = 'active'),0) < (v_cfg->>'minStakeUsd')::numeric THEN RETURN NEW; END IF;
  -- Sponsored leaders who are not yet qualified do not receive withdrawable matching
  IF EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_up AND status = 'approved' AND COALESCE(virtual_usd,0) > 0) THEN
    v_st := public.bix_leader_status(v_up);
    IF NOT COALESCE((v_st->>'qualified')::boolean,false) THEN RETURN NEW; END IF;
  END IF;
  v_amt := round(NEW.amount_usd * (v_cfg->>'matchPct')::numeric / 100, 2);
  IF v_amt <= 0 THEN RETURN NEW; END IF;
  INSERT INTO public.bix_wd_matching(withdraw_id, upline_id, member_id, base_usd, rate_pct, usdt_amount)
  VALUES (NEW.id, v_up, NEW.user_id, NEW.amount_usd, (v_cfg->>'matchPct')::numeric, v_amt)
  ON CONFLICT (withdraw_id) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.wallet_transactions(user_id, type, amount_usd, fee_usd, net_usd, status, note, reviewed_at)
    VALUES (v_up, 'reward', v_amt, 0, v_amt, 'approved', 'WD Matching Royalty', now());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bix_wd_matching_pay ON public.wallet_transactions;
CREATE TRIGGER bix_wd_matching_pay AFTER UPDATE OF status ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.bix_wd_matching_pay();