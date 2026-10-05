CREATE TABLE public.bix_leaders (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  virtual_usd numeric NOT NULL DEFAULT 0 CHECK (virtual_usd >= 0),
  require_turnover boolean NOT NULL DEFAULT true,
  turnover_multiple numeric NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.bix_leaders TO authenticated;
GRANT ALL ON public.bix_leaders TO service_role;
ALTER TABLE public.bix_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin leader read" ON public.bix_leaders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_leader_status(p_user uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  WITH l AS (SELECT * FROM public.bix_leaders WHERE user_id = p_user),
  own AS (SELECT COALESCE(max(amount_usd),0) v FROM public.stakes WHERE user_id = p_user AND status = 'active'),
  turn AS (SELECT COALESCE(sum(s.amount_usd),0) v FROM public.stakes s JOIN public.referral_codes r ON r.user_id = s.user_id WHERE r.referred_by = p_user AND s.status = 'active')
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR (auth.uid() IS NULL AND current_user = 'postgres') THEN
    jsonb_build_object(
      'status', (SELECT status FROM l),
      'virtual_usd', COALESCE((SELECT virtual_usd FROM l WHERE status='approved'),0),
      'require_turnover', COALESCE((SELECT require_turnover FROM l), true),
      'multiple', COALESCE((SELECT turnover_multiple FROM l), 3),
      'own_stake', (SELECT v FROM own),
      'turnover', (SELECT v FROM turn),
      'target', (SELECT v FROM own) * COALESCE((SELECT turnover_multiple FROM l), 3),
      'qualified', CASE WHEN NOT EXISTS (SELECT 1 FROM l WHERE status='approved') THEN true
                        WHEN NOT (SELECT require_turnover FROM l) THEN true
                        ELSE (SELECT v FROM own) > 0 AND (SELECT v FROM turn) >= (SELECT v FROM own) * (SELECT turnover_multiple FROM l) END
    ) ELSE NULL END
$f$;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
    (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
  ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.apply_bix_leader()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  INSERT INTO public.bix_leaders(user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET status = 'pending', reviewed_at = NULL WHERE public.bix_leaders.status = 'rejected';
END $f$;

CREATE OR REPLACE FUNCTION public.admin_review_bix_leader(p_user uuid, p_status text, p_virtual numeric, p_require boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE v_pool numeric; v_used numeric; v_count int;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF p_status NOT IN ('approved','rejected','pending') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_virtual IS NULL OR p_virtual < 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_leader_pool'));
  IF p_status = 'approved' THEN
    SELECT count(*) INTO v_count FROM public.bix_leaders WHERE status = 'approved' AND user_id <> p_user;
    IF v_count >= 100 THEN RAISE EXCEPTION 'Leader limit (100) reached'; END IF;
    SELECT COALESCE((value ->> 'poolUsd')::numeric, 1000000) INTO v_pool FROM public.app_settings WHERE key = 'leader_pool';
    v_pool := COALESCE(v_pool, 1000000);
    SELECT COALESCE(sum(virtual_usd),0) INTO v_used FROM public.bix_leaders WHERE status = 'approved' AND user_id <> p_user;
    IF v_used + p_virtual > v_pool THEN RAISE EXCEPTION 'Owner virtual pool exceeded (remaining %)', v_pool - v_used; END IF;
  END IF;
  UPDATE public.bix_leaders SET status = p_status, virtual_usd = CASE WHEN p_status='approved' THEN p_virtual ELSE 0 END, require_turnover = COALESCE(p_require, true), reviewed_at = now() WHERE user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Leader application not found'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION public.request_bix_withdraw(p_amount numeric, p_address text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_fee numeric; v_status jsonb; v_balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 5 THEN RAISE EXCEPTION 'Minimum withdrawal is $5'; END IF;
  IF length(trim(coalesce(p_address,''))) < 20 THEN RAISE EXCEPTION 'Valid wallet address required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  v_balance := public.bix_wallet_balance(auth.uid());
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_status := public.bix_leader_status(auth.uid());
  IF NOT (v_status ->> 'qualified')::boolean AND p_amount > v_balance - (v_status ->> 'virtual_usd')::numeric THEN
    RAISE EXCEPTION 'Leader virtual balance unlocks after network turnover reaches %x your stake package', v_status ->> 'multiple';
  END IF;
  v_fee := round(1 + p_amount * 0.005, 2);
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,address)
  VALUES (auth.uid(),'withdraw',p_amount,v_fee,p_amount - v_fee,trim(p_address)) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;