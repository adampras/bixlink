CREATE TABLE public.bix_stakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_bix numeric NOT NULL CHECK (amount_bix > 0),
  apy numeric NOT NULL,
  lock_days int NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','unstaked')),
  penalty_bix numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT ON public.bix_stakes TO authenticated;
GRANT ALL ON public.bix_stakes TO service_role;
ALTER TABLE public.bix_stakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bix stakes" ON public.bix_stakes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
      GREATEST(0,
        public.bix_wallet_balance(p_user)
        + COALESCE((SELECT SUM(CASE
            WHEN direction = 'BIX_TO_USDT' AND status = 'approved' THEN amount_out
            WHEN direction = 'USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in
            ELSE 0 END)
          FROM public.swap_requests WHERE user_id = p_user), 0)
      )
    ELSE NULL END AS usdt_balance,
    CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
      GREATEST(0,
        COALESCE((SELECT SUM(CASE
            WHEN direction = 'USDT_TO_BIX' AND status = 'approved' THEN amount_out
            WHEN direction = 'BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in
            ELSE 0 END)
          FROM public.swap_requests WHERE user_id = p_user), 0)
        + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_bix ELSE -amount_bix END)
          FROM public.bix_transfers WHERE status = 'completed' AND (sender_id = p_user OR recipient_id = p_user)), 0)
        + COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id = p_user), 0)
        + COALESCE((SELECT v.balance_bix FROM public.owner_bix_vault v
            WHERE v.owner_id = p_user AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user AND r.role = 'admin')), 0)
        - COALESCE((SELECT SUM(CASE WHEN status = 'active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id = p_user), 0)
      )
    ELSE NULL END AS bix_balance
$function$;

CREATE OR REPLACE FUNCTION public.bix_stake_apy(p_amount numeric, p_days int)
 RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT LEAST(25, (CASE WHEN p_days >= 540 THEN 20 WHEN p_days >= 360 THEN 17 WHEN p_days >= 180 THEN 14 WHEN p_days >= 90 THEN 11 ELSE 8 END)
    + (CASE WHEN p_amount >= 10000 THEN 5 WHEN p_amount >= 5000 THEN 4 WHEN p_amount >= 1000 THEN 3 WHEN p_amount >= 500 THEN 2 WHEN p_amount >= 100 THEN 1 ELSE 0 END))::numeric
$$;

CREATE OR REPLACE FUNCTION public.bix_stake_bix(p_amount numeric, p_days int)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_bal numeric; new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_days NOT IN (30,90,180,360,540) THEN RAISE EXCEPTION 'Invalid lock period'; END IF;
  IF p_amount IS NULL OR p_amount < 10 THEN RAISE EXCEPTION 'Minimum stake is 10 BIX'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix' || auth.uid()::text));
  SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(auth.uid());
  IF COALESCE(v_bal,0) < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance (have %)', round(COALESCE(v_bal,0),2); END IF;
  INSERT INTO public.bix_stakes (user_id, amount_bix, apy, lock_days) VALUES (auth.uid(), p_amount, public.bix_stake_apy(p_amount, p_days), p_days) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.bix_unstake_bix(p_stake uuid)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s public.bix_stakes%ROWTYPE; v_pen numeric := 0;
BEGIN
  SELECT * INTO s FROM public.bix_stakes WHERE id = p_stake AND user_id = auth.uid() AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stake not found'; END IF;
  IF now() < s.created_at + make_interval(days => s.lock_days) THEN v_pen := round(s.amount_bix * 0.10, 6); END IF;
  UPDATE public.bix_stakes SET status = CASE WHEN v_pen > 0 THEN 'unstaked' ELSE 'completed' END, penalty_bix = v_pen, ended_at = now() WHERE id = s.id;
  RETURN v_pen;
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_stake_bix(numeric,int), public.bix_unstake_bix(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bix_stake_bix(numeric,int), public.bix_unstake_bix(uuid) TO authenticated;