CREATE TABLE public.swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('USDT_TO_BIX','BIX_TO_USDT')),
  amount_in numeric NOT NULL CHECK (amount_in > 0),
  amount_out numeric NOT NULL CHECK (amount_out > 0),
  price_usd numeric NOT NULL DEFAULT 0.10 CHECK (price_usd = 0.10),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.swap_requests TO authenticated;
GRANT ALL ON public.swap_requests TO service_role;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and admin swap read" ON public.swap_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Admin swap update" ON public.swap_requests FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
RETURNS TABLE (usdt_balance numeric, bix_balance numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      )
    ELSE NULL END AS bix_balance
$$;

CREATE OR REPLACE FUNCTION public.request_bix_swap(p_direction text, p_amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_usdt numeric;
  v_bix numeric;
  v_out numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_direction NOT IN ('USDT_TO_BIX','BIX_TO_USDT') THEN RAISE EXCEPTION 'Invalid swap direction'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT usdt_balance, bix_balance INTO v_usdt, v_bix FROM public.bix_asset_balances(auth.uid());
  IF p_direction = 'USDT_TO_BIX' THEN
    IF v_usdt < p_amount THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
    v_out := round(p_amount / 0.10, 8);
  ELSE
    IF v_bix < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
    v_out := round(p_amount * 0.10, 8);
  END IF;
  INSERT INTO public.swap_requests(user_id,direction,amount_in,amount_out,price_usd)
  VALUES (auth.uid(),p_direction,p_amount,v_out,0.10) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.bix_asset_balances(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_bix_swap(text,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_asset_balances(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_bix_swap(text,numeric) TO authenticated;