ALTER TABLE public.bixtrade_requests ADD COLUMN IF NOT EXISTS settled_usd numeric(14,2), ADD COLUMN IF NOT EXISTS settled_at timestamptz;
REVOKE UPDATE ON public.bixtrade_requests FROM authenticated;
DROP POLICY IF EXISTS "bixtrade admin review" ON public.bixtrade_requests;

CREATE OR REPLACE FUNCTION public.bix_bixtrade_usdt_delta(p_user uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(CASE WHEN kind = 'deposit' THEN -settled_usd ELSE settled_usd END), 0)
  FROM public.bixtrade_requests WHERE user_id = p_user AND settled_at IS NOT NULL
$$;
REVOKE EXECUTE ON FUNCTION public.bix_bixtrade_usdt_delta(uuid) FROM PUBLIC, anon, authenticated;

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
    - public.bix_presale_paid(p_user)
    + public.bix_presale_dividend(p_user)
    + public.bix_p2p_usdt_delta(p_user)
    + public.bix_bixtrade_usdt_delta(p_user)
  ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.bixtrade_review(p_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r public.bixtrade_requests%ROWTYPE; cfg jsonb; v_fee numeric; v_lock int;
  v_bal numeric; v_cap numeric; v_last timestamptz; v_amt numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF p_status NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO r FROM public.bixtrade_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bixtrade:' || r.user_id::text));

  IF p_status = 'rejected' THEN
    UPDATE public.bixtrade_requests SET status = 'rejected', admin_note = left(p_note, 200), reviewed_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('status', 'rejected');
  END IF;

  SELECT value INTO cfg FROM public.app_settings WHERE key = 'bixtrade';
  v_fee := LEAST(GREATEST(COALESCE((cfg->>'withdrawFeePct')::numeric, 2), 0), 20);
  v_lock := LEAST(GREATEST(COALESCE((cfg->>'lockDays')::int, 7), 0), 365);

  IF r.kind = 'deposit' THEN
    SELECT usdt_balance INTO v_bal FROM public.bix_asset_balances(r.user_id);
    IF COALESCE(v_bal, 0) < r.amount_usd THEN
      RAISE EXCEPTION 'Saldo USDT wallet utama member kurang (tersedia % USDT)', round(COALESCE(v_bal, 0), 2);
    END IF;
    v_amt := r.amount_usd;
  ELSE
    SELECT COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount_usd ELSE -amount_usd END), 0),
           MAX(settled_at) FILTER (WHERE kind = 'deposit')
      INTO v_cap, v_last
      FROM public.bixtrade_requests WHERE user_id = r.user_id AND settled_at IS NOT NULL;
    IF v_cap < r.amount_usd THEN RAISE EXCEPTION 'Modal bot member kurang (tersedia % USDT)', round(v_cap, 2); END IF;
    IF v_last IS NOT NULL AND v_last + make_interval(days => v_lock) > now() THEN
      RAISE EXCEPTION 'Modal bot masih terkunci sampai %', to_char(v_last + make_interval(days => v_lock), 'YYYY-MM-DD HH24:MI');
    END IF;
    v_amt := round(r.amount_usd * (1 - v_fee / 100), 2);
  END IF;

  UPDATE public.bixtrade_requests
     SET status = 'approved', admin_note = left(p_note, 200), reviewed_at = now(), settled_usd = v_amt, settled_at = now()
   WHERE id = p_id;
  RETURN jsonb_build_object('status', 'approved', 'kind', r.kind, 'settled_usd', v_amt);
END $$;
REVOKE EXECUTE ON FUNCTION public.bixtrade_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtrade_review(uuid, text, text) TO authenticated;