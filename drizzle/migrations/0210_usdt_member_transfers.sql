CREATE TABLE public.bix_usdt_member_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  sender_code text NOT NULL,
  recipient_code text NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  bucket text NOT NULL CHECK (bucket IN ('profit','deposit')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_usdt_member_transfers TO authenticated;
GRANT ALL ON public.bix_usdt_member_transfers TO service_role;
ALTER TABLE public.bix_usdt_member_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own USDT transfers" ON public.bix_usdt_member_transfers FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_bix_admin());
CREATE INDEX bix_usdt_mt_sender ON public.bix_usdt_member_transfers(sender_id);
CREATE INDEX bix_usdt_mt_recipient ON public.bix_usdt_member_transfers(recipient_id);

CREATE OR REPLACE FUNCTION public.bix_usdt_member_delta(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(CASE WHEN recipient_id = p_user THEN amount_usd ELSE -amount_usd END), 0)
  FROM public.bix_usdt_member_transfers WHERE sender_id = p_user OR recipient_id = p_user
$$;
REVOKE EXECUTE ON FUNCTION public.bix_usdt_member_delta(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance_internal(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
    + public.bix_vusdt_component(p_user)
    + COALESCE((SELECT SUM(usdt_amount) FROM public.bix_usdt_network_bonuses WHERE user_id = p_user), 0)
    - public.bix_presale_paid(p_user)
    + public.bix_presale_dividend(p_user)
    + public.bix_p2p_usdt_delta(p_user)
    + public.bix_bixtrade_usdt_delta(p_user)
    + public.bix_bixgo_usdt_delta(p_user)
    + public.bix_usdt_member_delta(p_user)
$function$;

-- Nearest Admin 1-approved leader at or above a member.
CREATE OR REPLACE FUNCTION public.bix_team_leader(p_user uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH RECURSIVE up AS (
    SELECT p_user AS uid, 0 AS d, ARRAY[p_user] AS path
    UNION ALL
    SELECT r.referred_by, up.d + 1, up.path || r.referred_by FROM up
    JOIN public.referral_codes r ON r.user_id = up.uid
    WHERE r.referred_by IS NOT NULL AND NOT r.referred_by = ANY(up.path) AND up.d < 200
  )
  SELECT up.uid FROM up JOIN public.bix_leaders l ON l.user_id = up.uid AND l.status = 'approved'
  ORDER BY up.d LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.bix_team_leader(uuid) FROM PUBLIC, anon;

-- True when a member is the leader, above the leader, or anywhere below the leader.
CREATE OR REPLACE FUNCTION public.bix_in_leader_line(p_leader uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH RECURSIVE up AS (
    SELECT p_user AS uid, 0 AS d, ARRAY[p_user] AS path
    UNION ALL
    SELECT r.referred_by, up.d + 1, up.path || r.referred_by FROM up
    JOIN public.referral_codes r ON r.user_id = up.uid
    WHERE r.referred_by IS NOT NULL AND NOT r.referred_by = ANY(up.path) AND up.d < 200
  ), lup AS (
    SELECT p_leader AS uid, 0 AS d, ARRAY[p_leader] AS path
    UNION ALL
    SELECT r.referred_by, lup.d + 1, lup.path || r.referred_by FROM lup
    JOIN public.referral_codes r ON r.user_id = lup.uid
    WHERE r.referred_by IS NOT NULL AND NOT r.referred_by = ANY(lup.path) AND lup.d < 200
  )
  SELECT p_leader IS NOT NULL AND (EXISTS (SELECT 1 FROM up WHERE uid = p_leader) OR EXISTS (SELECT 1 FROM lup WHERE uid = p_user))
$$;
REVOKE EXECUTE ON FUNCTION public.bix_in_leader_line(uuid, uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.bix_same_leader_team(p_a uuid, p_b uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE la uuid := public.bix_team_leader(p_a); lb uuid := public.bix_team_leader(p_b);
BEGIN
  IF la IS NOT NULL AND public.bix_in_leader_line(la, p_a) AND public.bix_in_leader_line(la, p_b) THEN RETURN true; END IF;
  IF lb IS NOT NULL AND public.bix_in_leader_line(lb, p_a) AND public.bix_in_leader_line(lb, p_b) THEN RETURN true; END IF;
  RETURN false;
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_same_leader_team(uuid, uuid) FROM PUBLIC, anon;

-- Per-member transfer quotas: staking profit (team only) and deposit (any member), both capped by real withdrawable USDT.
CREATE OR REPLACE FUNCTION public.bix_usdt_transfer_quota(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_profit numeric; v_dep numeric; v_real numeric;
BEGIN
  IF NOT (p_user = auth.uid() OR public.is_bix_admin()) THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(net_usd) FILTER (WHERE type = 'reward' AND note LIKE 'Staking profit withdraw%'), 0),
         COALESCE(SUM(net_usd) FILTER (WHERE type = 'deposit'), 0)
    INTO v_profit, v_dep FROM public.wallet_transactions WHERE user_id = p_user AND status = 'approved';
  v_profit := v_profit + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_usd ELSE -amount_usd END) FROM public.bix_usdt_member_transfers WHERE bucket = 'profit' AND (sender_id = p_user OR recipient_id = p_user)), 0);
  v_dep := v_dep + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_usd ELSE -amount_usd END) FROM public.bix_usdt_member_transfers WHERE bucket = 'deposit' AND (sender_id = p_user OR recipient_id = p_user)), 0);
  v_real := GREATEST(COALESCE((public.bix_balance_ledger(p_user)->>'withdrawable_usdt')::numeric, 0), 0);
  RETURN jsonb_build_object(
    'profit', round(LEAST(GREATEST(v_profit, 0), v_real), 2),
    'deposit', round(LEAST(GREATEST(v_dep, 0), v_real), 2),
    'real', round(v_real, 2),
    'leader', public.bix_team_leader(p_user) IS NOT NULL);
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_usdt_transfer_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_usdt_transfer_quota(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_usdt_recipient_check(p_code text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_to uuid; v_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT r.user_id, COALESCE(NULLIF(p.username, ''), r.code) INTO v_to, v_name
    FROM public.referral_codes r LEFT JOIN public.profiles p ON p.user_id = r.user_id WHERE r.code = upper(trim(p_code));
  IF v_to IS NULL THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN jsonb_build_object('found', true, 'self', v_to = auth.uid(), 'name', v_name, 'team', v_to <> auth.uid() AND public.bix_same_leader_team(auth.uid(), v_to));
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_usdt_recipient_check(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_usdt_recipient_check(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_usdt_member_send(p_code text, p_amount numeric, p_bucket text, p_note text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_enabled boolean; v_to uuid; v_to_code text; v_from_code text; v_q jsonb; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_bucket NOT IN ('profit','deposit') THEN RAISE EXCEPTION 'Invalid source'; END IF;
  SELECT COALESCE((value->>'enabled')::boolean, false) INTO v_enabled FROM public.app_settings WHERE key = 'usdt_transfer';
  IF NOT COALESCE(v_enabled, false) THEN RAISE EXCEPTION 'USDT transfer is currently closed by Admin 1'; END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount < 1 THEN RAISE EXCEPTION 'Minimum transfer is 1 USDT'; END IF;
  IF p_amount > 100000 THEN RAISE EXCEPTION 'Amount too large'; END IF;
  IF public.bix_lock_exempt_reason(auth.uid()) IS NULL AND EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = auth.uid() AND owner_access = 'closed') THEN
    RAISE EXCEPTION 'Akun bersponsor ini sedang DITUTUP oleh Owner 1.'; END IF;
  SELECT user_id, code INTO v_to, v_to_code FROM public.referral_codes WHERE code = upper(trim(p_code));
  IF v_to IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF v_to = auth.uid() THEN RAISE EXCEPTION 'You cannot transfer to yourself'; END IF;
  SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id = auth.uid();
  IF v_from_code IS NULL THEN RAISE EXCEPTION 'Your member code is not ready yet'; END IF;
  IF p_bucket = 'profit' AND NOT public.bix_same_leader_team(auth.uid(), v_to) THEN
    RAISE EXCEPTION 'Profit staking USDT hanya bisa dikirim ke anggota satu tim leader (leader, upline dan seluruh downline).'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
  v_q := public.bix_usdt_transfer_quota(auth.uid());
  IF COALESCE((v_q->>p_bucket)::numeric, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient % USDT available to transfer (% USDT)', CASE WHEN p_bucket = 'profit' THEN 'staking profit' ELSE 'deposit' END, COALESCE(v_q->>p_bucket, '0'); END IF;
  INSERT INTO public.bix_usdt_member_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_usd, bucket, note)
    VALUES (auth.uid(), v_to, v_from_code, v_to_code, round(p_amount, 2), p_bucket, NULLIF(left(trim(COALESCE(p_note, '')), 120), ''))
    RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_usdt_member_send(text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_usdt_member_send(text, numeric, text, text) TO authenticated;