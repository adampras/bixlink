CREATE TABLE public.vusdt_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  sender_code text NOT NULL,
  recipient_code text NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vusdt_transfers TO authenticated;
GRANT ALL ON public.vusdt_transfers TO service_role;
ALTER TABLE public.vusdt_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Party and admin vusdt read" ON public.vusdt_transfers FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_vusdt_balance(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() THEN
    (CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin') THEN 1000000 ELSE 0 END)
    + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_usd ELSE -amount_usd END)
        FROM public.vusdt_transfers WHERE sender_id = p_user OR recipient_id = p_user), 0)
  ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.bix_vusdt_send(p_code text, p_amount numeric, p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_enabled boolean; v_to uuid; v_to_code text; v_from_code text; v_bal numeric; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE((value->>'enabled')::boolean, false) INTO v_enabled FROM public.app_settings WHERE key = 'usdt_transfer';
  IF NOT COALESCE(v_enabled, false) THEN RAISE EXCEPTION 'Coming soon — transfer is not open yet'; END IF;
  IF p_amount IS NULL OR p_amount < 0.01 THEN RAISE EXCEPTION 'Minimum transfer is $0.01'; END IF;
  IF p_amount > 1000000 THEN RAISE EXCEPTION 'Amount too large'; END IF;
  SELECT user_id, code INTO v_to, v_to_code FROM public.referral_codes WHERE code = upper(trim(p_code));
  IF v_to IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF v_to = auth.uid() THEN RAISE EXCEPTION 'You cannot transfer to yourself'; END IF;
  SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id = auth.uid();
  IF v_from_code IS NULL THEN RAISE EXCEPTION 'Your member code is not ready yet'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vusdt' || auth.uid()::text));
  v_bal := public.bix_vusdt_balance(auth.uid());
  IF COALESCE(v_bal, 0) < p_amount THEN RAISE EXCEPTION 'Insufficient virtual USDT balance'; END IF;
  INSERT INTO public.vusdt_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_usd, note)
  VALUES (auth.uid(), v_to, v_from_code, v_to_code, p_amount, NULLIF(left(trim(coalesce(p_note,'')),120),''))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_vusdt_send(text, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bix_vusdt_balance(uuid) FROM anon;