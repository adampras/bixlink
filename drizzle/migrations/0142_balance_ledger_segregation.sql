ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS owner_access text NOT NULL DEFAULT 'normal';
ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS owner_access_note text;
ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS owner_access_at timestamptz;
ALTER TABLE public.bix_leaders DROP CONSTRAINT IF EXISTS bix_leaders_owner_access_chk;
ALTER TABLE public.bix_leaders ADD CONSTRAINT bix_leaders_owner_access_chk CHECK (owner_access IN ('normal','open','closed'));

CREATE OR REPLACE FUNCTION public.bix_is_owner1_user(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin')
     AND EXISTS (SELECT 1 FROM auth.users WHERE id = p_user AND lower(email) = 'bixdevpras@gmail.com' AND email_confirmed_at IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.bix_is_owner1_user(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_lock_exempt_reason(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.bix_is_owner1_user(p_user) THEN 'owner1'
    WHEN EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = p_user) THEN 'clone'
    WHEN EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_user AND owner_access = 'open') THEN 'owner_open'
    ELSE NULL END
$$;
REVOKE ALL ON FUNCTION public.bix_lock_exempt_reason(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_is_sponsored_source(p_member uuid, p_stake uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = p_member)
      OR EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_member AND status = 'approved' AND virtual_usd > 0)
      OR (p_stake IS NOT NULL AND EXISTS (SELECT 1 FROM public.stakes WHERE id = p_stake AND funded_vusdt))
$$;
REVOKE ALL ON FUNCTION public.bix_is_sponsored_source(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_leader_status(p_user uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH l AS (SELECT * FROM public.bix_leaders WHERE user_id = p_user),
  ex AS (SELECT public.bix_lock_exempt_reason(p_user) r),
  own AS (SELECT COALESCE(max(amount_usd),0) v FROM public.stakes WHERE user_id = p_user AND status = 'active'),
  own_real AS (SELECT COALESCE(sum(amount_usd),0) v FROM public.stakes WHERE user_id = p_user AND status = 'active' AND NOT funded_vusdt),
  base AS (SELECT COALESCE(NULLIF((SELECT virtual_usd FROM l WHERE status='approved'),0), (SELECT v FROM own)) v),
  turn AS (SELECT COALESCE(sum(s.amount_usd),0) v FROM public.stakes s JOIN public.referral_codes r ON r.user_id = s.user_id
           WHERE r.referred_by = p_user AND s.status = 'active' AND NOT s.funded_vusdt
             AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = s.user_id)
             AND NOT EXISTS (SELECT 1 FROM public.bix_leaders bl WHERE bl.user_id = s.user_id AND bl.status = 'approved' AND bl.virtual_usd > 0)),
  esc AS (SELECT COALESCE(sum(w.net_usd),0) v FROM public.wallet_transactions w, l WHERE w.user_id = p_user AND w.type='reward' AND w.status='approved' AND w.created_at >= l.created_at),
  q AS (SELECT CASE WHEN (SELECT r FROM ex) IS NOT NULL THEN true
                    WHEN EXISTS (SELECT 1 FROM l WHERE owner_access = 'closed') THEN false
                    WHEN NOT EXISTS (SELECT 1 FROM l WHERE status='approved') THEN true
                    WHEN NOT (SELECT require_turnover FROM l) THEN true
                    ELSE (SELECT v FROM base) > 0 AND ((SELECT v FROM own_real) >= (SELECT v FROM base) * 3 OR (SELECT v FROM turn) >= (SELECT v FROM base) * 5) END v)
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'reviewer') OR (auth.uid() IS NULL AND current_user = 'postgres') THEN
    jsonb_build_object('status', (SELECT status FROM l), 'kind', (SELECT support_kind FROM l),
      'virtual_usd', COALESCE((SELECT virtual_usd FROM l WHERE status='approved'),0),
      'require_turnover', CASE WHEN (SELECT r FROM ex) IS NOT NULL THEN false ELSE COALESCE((SELECT require_turnover FROM l), true) END,
      'multiple', 5, 'personal_multiple', 3,
      'own_stake', (SELECT v FROM own), 'personal_turnover', (SELECT v FROM own_real),
      'personal_target', (SELECT v FROM base) * 3,
      'base', (SELECT v FROM base), 'turnover', (SELECT v FROM turn),
      'target', (SELECT v FROM base) * 5,
      'escrow_usd', CASE WHEN (SELECT v FROM q) THEN 0 ELSE (SELECT v FROM esc) END,
      'exempt', (SELECT r FROM ex),
      'owner_access', COALESCE((SELECT owner_access FROM l), 'normal'),
      'qualified', (SELECT v FROM q)) ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.bix_unreal_bonus_bix(p_user uuid, p_before timestamptz)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id = p_user AND status = 'approved'
            AND (p_before IS NULL OR created_at < p_before) AND public.bix_is_sponsored_source(member_id, NULL)),0)
       + COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id = p_user
            AND (p_before IS NULL OR created_at < p_before) AND public.bix_is_sponsored_source(member_id, source_stake_id)),0)
$$;
REVOKE ALL ON FUNCTION public.bix_unreal_bonus_bix(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_locked_bonus_bix(p_user uuid)
 RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l record; v_q boolean;
BEGIN
  IF public.bix_lock_exempt_reason(p_user) IS NOT NULL THEN RETURN 0; END IF;
  SELECT * INTO l FROM public.bix_leaders WHERE user_id = p_user;
  IF FOUND AND l.owner_access = 'closed' THEN
    RETURN GREATEST(COALESCE((SELECT bix_balance FROM public.bix_asset_balances(p_user)), 0), 0);
  END IF;
  IF NOT FOUND OR l.status <> 'approved' THEN
    RETURN public.bix_unreal_bonus_bix(p_user, NULL);
  END IF;
  IF NOT l.require_turnover THEN RETURN 0; END IF;
  v_q := COALESCE((public.bix_leader_status(p_user) ->> 'qualified')::boolean, false);
  IF v_q THEN RETURN 0; END IF;
  RETURN COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved' AND created_at >= l.created_at),0)
    + COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved' AND created_at >= l.created_at),0)
    + COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user AND created_at >= l.created_at),0)
    + COALESCE((SELECT SUM(amount_bix) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX' AND created_at >= l.created_at),0)
    + public.bix_unreal_bonus_bix(p_user, l.created_at);
END $function$;

CREATE OR REPLACE FUNCTION public.bix_assert_bix_unlocked(p_user uuid, p_amount numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_locked numeric; v_bal numeric;
BEGIN
  IF public.bix_lock_exempt_reason(p_user) IS NOT NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = p_user AND owner_access = 'closed') THEN
    RAISE EXCEPTION 'Akun bersponsor ini sedang DITUTUP oleh Owner 1. Saldo tidak dapat dipindahkan.';
  END IF;
  v_locked := public.bix_locked_bonus_bix(p_user);
  IF v_locked <= 0 THEN RETURN; END IF;
  SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(p_user);
  IF COALESCE(p_amount,0) > COALESCE(v_bal,0) - v_locked THEN
    RAISE EXCEPTION 'BIX terkunci escrow: % BIX berasal dari bonus bersponsor/leader dan belum dapat dipindahkan. Bonus dari member real tetap terpisah.', round(v_locked, 4);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.bix_balance_ledger(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  l record; v_found boolean; v_ex text; v_total numeric; v_dep numeric; v_rew numeric; v_rew_since numeric := 0;
  v_virtual numeric := 0; v_vusdt numeric; v_bu_real numeric; v_bu_unreal numeric; v_bu_real_since numeric := 0;
  v_bb_real numeric; v_bb_unreal numeric; v_status jsonb; v_q boolean; v_locked numeric := 0; v_locked_bix numeric; v_recent jsonb;
BEGIN
  IF NOT (p_user = auth.uid() OR public.is_bix_admin() OR (auth.uid() IS NULL AND current_user = 'postgres')) THEN RETURN NULL; END IF;
  SELECT * INTO l FROM public.bix_leaders WHERE user_id = p_user; v_found := FOUND;
  v_ex := public.bix_lock_exempt_reason(p_user);
  v_total := COALESCE(public.bix_wallet_balance(p_user), 0);
  SELECT COALESCE(SUM(net_usd) FILTER (WHERE type='deposit'),0), COALESCE(SUM(net_usd) FILTER (WHERE type='reward'),0)
    INTO v_dep, v_rew FROM public.wallet_transactions WHERE user_id = p_user AND status = 'approved';
  IF v_found AND l.status = 'approved' THEN
    v_virtual := COALESCE(l.virtual_usd, 0);
    SELECT COALESCE(SUM(net_usd),0) INTO v_rew_since FROM public.wallet_transactions WHERE user_id = p_user AND type='reward' AND status='approved' AND created_at >= l.created_at;
  END IF;
  v_vusdt := GREATEST(public.bix_vusdt_component(p_user) - CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role='admin') THEN 1000000 ELSE 0 END, 0);
  SELECT COALESCE(SUM(usdt_amount) FILTER (WHERE NOT public.bix_is_sponsored_source(member_id, source_stake_id)),0),
         COALESCE(SUM(usdt_amount) FILTER (WHERE public.bix_is_sponsored_source(member_id, source_stake_id)),0),
         COALESCE(SUM(bix_amount) FILTER (WHERE NOT public.bix_is_sponsored_source(member_id, source_stake_id)),0),
         COALESCE(SUM(bix_amount) FILTER (WHERE public.bix_is_sponsored_source(member_id, source_stake_id)),0)
    INTO v_bu_real, v_bu_unreal, v_bb_real, v_bb_unreal FROM public.bix_usdt_network_bonuses WHERE user_id = p_user;
  IF v_found AND l.status = 'approved' THEN
    SELECT COALESCE(SUM(usdt_amount),0) INTO v_bu_real_since FROM public.bix_usdt_network_bonuses
      WHERE user_id = p_user AND created_at >= l.created_at AND NOT public.bix_is_sponsored_source(member_id, source_stake_id);
  END IF;
  v_bb_real := v_bb_real + COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id = p_user AND status='approved' AND NOT public.bix_is_sponsored_source(member_id, NULL)),0);
  v_bb_unreal := v_bb_unreal + COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id = p_user AND status='approved' AND public.bix_is_sponsored_source(member_id, NULL)),0);
  v_status := public.bix_leader_status(p_user);
  v_q := COALESCE((v_status ->> 'qualified')::boolean, true);

  IF v_ex IS NOT NULL THEN v_locked := 0;
  ELSIF v_found AND l.owner_access = 'closed' THEN v_locked := v_total;
  ELSIF v_found AND l.status = 'approved' AND l.require_turnover AND NOT v_q THEN
    v_locked := v_vusdt + v_virtual + v_rew_since + v_bu_real_since + v_bu_unreal;
  ELSIF v_found AND l.status = 'approved' THEN
    v_locked := v_vusdt;
  ELSE
    v_locked := v_vusdt + v_bu_unreal;
  END IF;
  v_locked := LEAST(GREATEST(v_locked, 0), GREATEST(v_total, 0));
  v_locked_bix := public.bix_locked_bonus_bix(p_user);

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'at' DESC), '[]'::jsonb) INTO v_recent FROM (
    SELECT jsonb_build_object('at', b.created_at, 'kind', b.kind, 'level', b.level, 'usdt', b.usdt_amount, 'bix', b.bix_amount,
      'member', COALESCE(rc.code, 'BIX-??????'), 'real', NOT public.bix_is_sponsored_source(b.member_id, b.source_stake_id)) x
    FROM public.bix_usdt_network_bonuses b LEFT JOIN public.referral_codes rc ON rc.user_id = b.member_id
    WHERE b.user_id = p_user ORDER BY b.created_at DESC LIMIT 40) s;

  RETURN jsonb_build_object(
    'total_usdt', round(v_total, 4),
    'real_deposit_usdt', round(v_dep, 4),
    'staking_reward_usdt', round(v_rew, 4),
    'sponsor_capital_usdt', round(v_virtual, 4),
    'vusdt_usdt', round(v_vusdt, 4),
    'bonus_real_usdt', round(v_bu_real, 4),
    'bonus_unreal_usdt', round(v_bu_unreal, 4),
    'bonus_real_bix', round(v_bb_real, 6),
    'bonus_unreal_bix', round(v_bb_unreal, 6),
    'locked_usdt', round(v_locked, 4),
    'withdrawable_usdt', round(GREATEST(v_total - v_locked, 0), 4),
    'locked_bix', round(COALESCE(v_locked_bix, 0), 6),
    'is_leader', v_found AND l.status = 'approved',
    'qualified', v_q,
    'exempt', v_ex,
    'owner_access', CASE WHEN v_found THEN l.owner_access ELSE 'normal' END,
    'recent', v_recent);
END $$;
REVOKE ALL ON FUNCTION public.bix_balance_ledger(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_balance_ledger(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_bix_withdraw(p_amount numeric, p_address text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_fee numeric; v_led jsonb; v_balance numeric; v_today numeric; v_free numeric;
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
  v_fee := round(1 + p_amount * 0.005, 2);
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,address)
  VALUES (auth.uid(),'withdraw',p_amount,v_fee,p_amount - v_fee,trim(p_address)) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.bix_leader_set_access(p_user uuid, p_access text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  IF p_access NOT IN ('normal','open','closed') THEN RAISE EXCEPTION 'Invalid access mode'; END IF;
  UPDATE public.bix_leaders SET owner_access = p_access, owner_access_note = left(COALESCE(p_note, ''), 200), owner_access_at = now() WHERE user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sponsored account not found'; END IF;
  RETURN jsonb_build_object('user_id', p_user, 'owner_access', p_access);
END $$;
REVOKE ALL ON FUNCTION public.bix_leader_set_access(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_leader_set_access(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_claim_stake_profit()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record; v_status jsonb; v_price numeric; v_split numeric; v_total numeric := 0; v_usdt numeric := 0; v_bix numeric := 0;
  v_earned numeric; v_taken numeric; v_avail numeric; v_owner uuid; v_vault numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF public.bix_lock_exempt_reason(auth.uid()) IS NULL THEN
    IF EXISTS (SELECT 1 FROM bix_leaders WHERE user_id = auth.uid() AND owner_access = 'closed') THEN RAISE EXCEPTION 'Akun bersponsor ini sedang DITUTUP oleh Owner 1.'; END IF;
    v_status := public.bix_leader_status(auth.uid());
    IF NOT COALESCE((v_status->>'qualified')::boolean, true) THEN RAISE EXCEPTION 'Leader withdraw locked until turnover target is reached'; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('profit'||auth.uid()::text));
  SELECT COALESCE(NULLIF((value->>'priceUsd')::numeric,0),0.84291) INTO v_price FROM app_settings WHERE key='bix_market';
  v_price := COALESCE(v_price,0.84291);
  SELECT COALESCE(NULLIF((value->>'splitUsdt')::numeric,0),70)/100 INTO v_split FROM app_settings WHERE key='referrals';
  v_split := LEAST(GREATEST(COALESCE(v_split,0.7),0),1);
  FOR r IN SELECT * FROM stakes WHERE user_id = auth.uid() AND status='active' AND activated_at IS NOT NULL LOOP
    v_earned := r.amount_usd * r.apy / 100 * LEAST(EXTRACT(EPOCH FROM (now()-r.activated_at))/86400, r.lock_days) / 365;
    SELECT COALESCE(sum(profit_usd),0) INTO v_taken FROM bix_profit_claims WHERE stake_id = r.id;
    v_avail := round(v_earned - v_taken, 6);
    IF v_avail > 0.000001 THEN
      INSERT INTO bix_profit_claims(user_id, stake_id, profit_usd, usdt_amount, bix_amount, price_usd)
        VALUES (auth.uid(), r.id, v_avail, round(v_avail*v_split,6), round(v_avail*(1-v_split)/v_price,6), v_price);
      v_total := v_total + v_avail; v_usdt := v_usdt + round(v_avail*v_split,6); v_bix := v_bix + round(v_avail*(1-v_split)/v_price,6);
    END IF;
  END LOOP;
  IF v_total < 0.01 THEN RAISE EXCEPTION 'Minimum withdraw is $0.01 profit'; END IF;
  IF v_usdt > 0 THEN
    INSERT INTO wallet_transactions(user_id, type, amount_usd, fee_usd, net_usd, status, note, reviewed_at)
      VALUES (auth.uid(), 'reward', v_usdt, 0, v_usdt, 'approved', 'Staking profit withdraw (USDT)', now());
  END IF;
  IF v_bix > 0 THEN
    SELECT owner_id, balance_bix INTO v_owner, v_vault FROM owner_bix_vault ORDER BY generated_at LIMIT 1 FOR UPDATE;
    IF v_owner IS NULL OR v_vault < v_bix THEN RAISE EXCEPTION 'Owner reserve unavailable'; END IF;
    UPDATE owner_bix_vault SET balance_bix = balance_bix - v_bix, updated_at = now() WHERE owner_id = v_owner;
    INSERT INTO bix_allocations(user_id, amount_bix, note, created_by) VALUES (auth.uid(), v_bix, 'Staking profit withdraw (BIX)', v_owner);
  END IF;
  RETURN jsonb_build_object('profit_usd', v_total, 'usdt', v_usdt, 'bix', v_bix);
END $function$;