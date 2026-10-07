CREATE TABLE public.bix_usdt_network_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  source_stake_id uuid NOT NULL REFERENCES public.stakes(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('direct','matching')),
  level integer NOT NULL DEFAULT 0,
  bonus_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Makassar')::date),
  base_usd numeric NOT NULL,
  rate_pct numeric NOT NULL,
  total_usd numeric NOT NULL,
  usdt_amount numeric NOT NULL,
  bix_amount numeric NOT NULL,
  bix_price_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_stake_id, user_id, kind, level, bonus_date)
);
CREATE INDEX bix_usdt_network_bonuses_user_idx ON public.bix_usdt_network_bonuses(user_id, created_at DESC);
GRANT SELECT ON public.bix_usdt_network_bonuses TO authenticated;
GRANT ALL ON public.bix_usdt_network_bonuses TO service_role;
ALTER TABLE public.bix_usdt_network_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin network bonus read" ON public.bix_usdt_network_bonuses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_network_bonus_split(p_total numeric, OUT usdt numeric, OUT bix numeric, OUT price numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ref jsonb; v_split numeric;
BEGIN
  SELECT value INTO v_ref FROM app_settings WHERE key='referrals';
  v_split := LEAST(100, GREATEST(0, COALESCE((v_ref->>'splitUsdt')::numeric, 70)));
  SELECT NULLIF((value->>'priceUsd')::numeric,0) INTO price FROM app_settings WHERE key='bix_market';
  price := COALESCE(price, 0.84291);
  usdt := round(p_total * v_split / 100, 4);
  bix := round((p_total - p_total * v_split / 100) / price, 8);
END $$;

CREATE OR REPLACE FUNCTION public.bix_credit_usdt_direct_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_sponsor uuid; v_pct numeric; v_total numeric; s record;
BEGIN
  IF NEW.status <> 'active' OR (TG_OP = 'UPDATE' AND OLD.status = 'active') THEN RETURN NEW; END IF;
  SELECT referred_by INTO v_sponsor FROM referral_codes WHERE user_id = NEW.user_id;
  IF v_sponsor IS NULL OR v_sponsor = NEW.user_id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM bix_clone_accounts WHERE user_id = NEW.user_id) THEN RETURN NEW; END IF;
  SELECT LEAST(100, GREATEST(0, COALESCE((value->>'direct')::numeric, 10))) INTO v_pct FROM app_settings WHERE key='referrals';
  v_pct := COALESCE(v_pct, 10);
  v_total := round(NEW.amount_usd * v_pct / 100, 2);
  IF v_total > 0 THEN
    SELECT * INTO s FROM bix_network_bonus_split(v_total);
    INSERT INTO bix_usdt_network_bonuses(user_id, member_id, source_stake_id, kind, level, base_usd, rate_pct, total_usd, usdt_amount, bix_amount, bix_price_usd)
    VALUES (v_sponsor, NEW.user_id, NEW.id, 'direct', 1, NEW.amount_usd, v_pct, v_total, s.usdt, s.bix, s.price)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

INSERT INTO public.bix_usdt_network_bonuses(user_id, member_id, source_stake_id, kind, level, bonus_date, base_usd, rate_pct, total_usd, usdt_amount, bix_amount, bix_price_usd, created_at)
SELECT w.user_id, st.user_id, w.source_stake_id, 'direct', 1, (w.created_at AT TIME ZONE 'Asia/Makassar')::date, st.amount_usd, COALESCE(w.reward_rate_pct,10), w.amount_usd, sp.usdt, sp.bix, sp.price, w.created_at
FROM public.wallet_transactions w JOIN public.stakes st ON st.id = w.source_stake_id
CROSS JOIN LATERAL public.bix_network_bonus_split(w.amount_usd) sp
WHERE w.type='reward' AND w.source_stake_id IS NOT NULL AND w.status='approved'
ON CONFLICT DO NOTHING;
UPDATE public.wallet_transactions SET status='rejected', note = 'Moved to 70/30 network bonus ledger'
WHERE type='reward' AND source_stake_id IS NOT NULL AND status='approved';

CREATE OR REPLACE FUNCTION public.bix_settle_matching_daily(p_day date DEFAULT ((now() AT TIME ZONE 'Asia/Makassar')::date - 1))
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_levels jsonb; v_count integer := 0; r record; v_anc uuid; v_member uuid; v_lvl integer; v_pct numeric; v_daily numeric; v_total numeric; v_directs integer; s record; v_seen uuid[]; v_rows integer;
BEGIN
  SELECT value->'levels' INTO v_levels FROM app_settings WHERE key='referrals';
  v_levels := COALESCE(v_levels,'[12,6,3,2,1]'::jsonb);
  FOR r IN SELECT st.* FROM stakes st
    WHERE st.status='active' AND st.activated_at IS NOT NULL
      AND (st.activated_at AT TIME ZONE 'Asia/Makassar')::date <= p_day
      AND (st.activated_at AT TIME ZONE 'Asia/Makassar')::date + st.lock_days > p_day
      AND NOT EXISTS (SELECT 1 FROM bix_clone_accounts c WHERE c.user_id = st.user_id)
  LOOP
    v_daily := r.amount_usd * r.apy / 100 / 365;
    v_member := r.user_id; v_seen := ARRAY[r.user_id];
    FOR v_lvl IN 1..jsonb_array_length(v_levels) LOOP
      v_anc := NULL;
      SELECT referred_by INTO v_anc FROM referral_codes WHERE user_id = v_member;
      EXIT WHEN v_anc IS NULL OR v_anc = ANY(v_seen);
      v_seen := v_seen || v_anc;
      v_pct := COALESCE((v_levels->>(v_lvl-1))::numeric, 0);
      SELECT count(DISTINCT rc.user_id) INTO v_directs FROM referral_codes rc
        JOIN stakes x ON x.user_id = rc.user_id AND x.status='active'
        WHERE rc.referred_by = v_anc AND NOT EXISTS (SELECT 1 FROM bix_clone_accounts c WHERE c.user_id = rc.user_id);
      v_total := round(v_daily * v_pct / 100, 4);
      IF v_directs >= v_lvl AND v_total > 0 THEN
        SELECT * INTO s FROM bix_network_bonus_split(v_total);
        INSERT INTO bix_usdt_network_bonuses(user_id, member_id, source_stake_id, kind, level, bonus_date, base_usd, rate_pct, total_usd, usdt_amount, bix_amount, bix_price_usd)
        VALUES (v_anc, r.user_id, r.id, 'matching', v_lvl, p_day, round(v_daily,4), v_pct, v_total, s.usdt, s.bix, s.price)
        ON CONFLICT DO NOTHING;
        GET DIAGNOSTICS v_rows = ROW_COUNT; v_count := v_count + v_rows;
      END IF;
      v_member := v_anc;
    END LOOP;
  END LOOP;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.bix_settle_matching_daily(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bix_network_bonus_split(numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid) RETURNS TABLE(usdt_balance numeric,bix_balance numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,public.bix_wallet_balance(p_user)+COALESCE((SELECT SUM(CASE WHEN direction='BIX_TO_USDT' AND status='approved' THEN amount_out WHEN direction='USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)) ELSE NULL END,
CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,
COALESCE((SELECT SUM(CASE WHEN direction='USDT_TO_BIX' AND status='approved' THEN amount_out WHEN direction='BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_bix ELSE -amount_bix END) FROM public.bix_transfers WHERE status='completed' AND(sender_id=p_user OR recipient_id=p_user)),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id=p_user),0)
+COALESCE((SELECT balance_bix FROM public.owner_bix_vault WHERE owner_id=p_user AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin')),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user),0)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)) ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
    (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
    + public.bix_vusdt_component(p_user)
    + COALESCE((SELECT SUM(usdt_amount) FROM public.bix_usdt_network_bonuses WHERE user_id = p_user), 0)
  ELSE NULL END
$function$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'bix-matching-daily';
SELECT cron.schedule('bix-matching-daily', '5 16 * * *', $$SELECT public.bix_settle_matching_daily();$$);