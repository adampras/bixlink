CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('deposit','withdraw','reward')),
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  fee_usd numeric NOT NULL DEFAULT 0,
  net_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  tx_hash text,
  address text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX wallet_transactions_user_idx ON public.wallet_transactions(user_id, created_at DESC);
GRANT SELECT, UPDATE, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and admin wallet read" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Admin wallet update" ON public.wallet_transactions FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE POLICY "Admin reward insert" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (public.is_bix_admin() AND type = 'reward');

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(CASE
    WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
    WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
    ELSE 0 END), 0)
  FROM public.wallet_transactions WHERE user_id = p_user
$$;

CREATE OR REPLACE FUNCTION public.request_bix_deposit(p_amount numeric, p_tx_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 1 THEN RAISE EXCEPTION 'Minimum deposit is $1'; END IF;
  IF length(trim(coalesce(p_tx_hash,''))) < 8 THEN RAISE EXCEPTION 'Transaction hash required'; END IF;
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,tx_hash)
  VALUES (auth.uid(),'deposit',p_amount,0,p_amount,trim(p_tx_hash)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.request_bix_withdraw(p_amount numeric, p_address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_fee numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 5 THEN RAISE EXCEPTION 'Minimum withdrawal is $5'; END IF;
  IF length(trim(coalesce(p_address,''))) < 20 THEN RAISE EXCEPTION 'Valid wallet address required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  IF public.bix_wallet_balance(auth.uid()) < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_fee := round(1 + p_amount * 0.005, 2);
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,address)
  VALUES (auth.uid(),'withdraw',p_amount,v_fee,p_amount - v_fee,trim(p_address)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.bix_wallet_balance(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_wallet_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_bix_deposit(numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_bix_withdraw(numeric,text) TO authenticated;