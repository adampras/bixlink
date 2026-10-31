CREATE TABLE public.bixtrade_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  request_id uuid NOT NULL REFERENCES public.bixtrade_requests(id),
  kind text NOT NULL DEFAULT 'sponsor',
  level int NOT NULL DEFAULT 1,
  rate_pct numeric NOT NULL,
  amount_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (request_id, user_id, kind)
);
GRANT SELECT ON public.bixtrade_bonuses TO authenticated;
GRANT ALL ON public.bixtrade_bonuses TO service_role;
ALTER TABLE public.bixtrade_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read bixtrade bonuses" ON public.bixtrade_bonuses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bixtrade_bonus_review(p_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  UPDATE public.bixtrade_bonuses SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, reviewed_at = now()
   WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bonus not found or already reviewed'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixtrade_bonus_review(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtrade_bonus_review(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtrade_review(p_id uuid, p_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r public.bixtrade_requests%ROWTYPE; cfg jsonb; v_fee numeric; v_lock int;
  v_bal numeric; v_cap numeric; v_last timestamptz; v_amt numeric; v_early numeric := 0; v_sp uuid; v_rate numeric;
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
    IF r.funding = 'real' THEN
      SELECT usdt_balance INTO v_bal FROM public.bix_asset_balances(r.user_id);
      IF COALESCE(v_bal, 0) < r.amount_usd THEN
        RAISE EXCEPTION 'Saldo USDT wallet utama member kurang (tersedia % USDT)', round(COALESCE(v_bal, 0), 2);
      END IF;
    END IF;
    v_amt := r.amount_usd;
  ELSE
    SELECT COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount_usd ELSE -amount_usd END), 0),
           MAX(settled_at) FILTER (WHERE kind = 'deposit')
      INTO v_cap, v_last
      FROM public.bixtrade_requests WHERE user_id = r.user_id AND settled_at IS NOT NULL AND funding = r.funding;
    IF v_cap < r.amount_usd THEN RAISE EXCEPTION 'Modal bot member kurang (tersedia % USDT)', round(v_cap, 2); END IF;
    IF v_last IS NOT NULL AND v_last + make_interval(days => v_lock) > now() THEN
      IF COALESCE((cfg->>'earlyExitEnabled')::boolean, false) THEN
        v_early := LEAST(GREATEST(COALESCE((cfg->>'earlyExitPct')::numeric, 5), 0), 50);
      ELSE
        RAISE EXCEPTION 'Modal bot masih terkunci sampai %', to_char(v_last + make_interval(days => v_lock), 'YYYY-MM-DD HH24:MI');
      END IF;
    END IF;
    v_amt := round(r.amount_usd * (1 - (v_fee + v_early) / 100), 2);
  END IF;

  UPDATE public.bixtrade_requests
     SET status = 'approved', admin_note = left(p_note, 200), reviewed_at = now(), settled_usd = v_amt, settled_at = now()
   WHERE id = p_id;

  -- Sponsor bonus: recorded pending for owner review, never auto-credited; real funding only, clones excluded.
  IF r.kind = 'deposit' AND r.funding = 'real' AND COALESCE((cfg->>'sponsorBonusEnabled')::boolean, false) THEN
    SELECT referred_by INTO v_sp FROM public.referral_codes WHERE user_id = r.user_id;
    v_rate := LEAST(GREATEST(COALESCE((cfg->>'sponsorBonusPct')::numeric, 2), 0), 20);
    IF v_sp IS NOT NULL AND v_rate > 0 AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id IN (v_sp, r.user_id)) THEN
      INSERT INTO public.bixtrade_bonuses (user_id, member_id, request_id, kind, level, rate_pct, amount_usd)
      VALUES (v_sp, r.user_id, r.id, 'sponsor', 1, v_rate, round(r.amount_usd * v_rate / 100, 2))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN jsonb_build_object('status', 'approved', 'kind', r.kind, 'funding', r.funding, 'settled_usd', v_amt, 'early_pct', v_early);
END $function$;