CREATE TABLE public.bix_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  sender_code text NOT NULL,
  recipient_code text NOT NULL,
  amount_bix numeric NOT NULL CHECK (amount_bix > 0),
  note text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz
);
GRANT SELECT, UPDATE ON public.bix_transfers TO authenticated;
GRANT ALL ON public.bix_transfers TO service_role;
ALTER TABLE public.bix_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Party and admin transfer read" ON public.bix_transfers FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Admin transfer update" ON public.bix_transfers FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE INDEX bix_transfers_sender_idx ON public.bix_transfers(sender_id, created_at DESC);
CREATE INDEX bix_transfers_recipient_idx ON public.bix_transfers(recipient_id, created_at DESC);

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
      )
    ELSE NULL END AS bix_balance
$function$;

CREATE OR REPLACE FUNCTION public.bix_pay_lookup(p_code text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.referral_codes WHERE code = upper(trim(p_code)) AND user_id <> auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.bix_pay_send(p_code text, p_amount numeric, p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_enabled boolean; v_to uuid; v_to_code text; v_from_code text; v_bix numeric; v_today numeric; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE((value ->> 'enabled')::boolean, false) INTO v_enabled FROM public.app_settings WHERE key = 'bix_pay';
  IF NOT COALESCE(v_enabled, false) THEN RAISE EXCEPTION 'Coming soon — BIX PAY is not open yet'; END IF;
  IF p_amount IS NULL OR p_amount < 0.0001 THEN RAISE EXCEPTION 'Minimum payment is 0.0001 BIX'; END IF;
  IF p_amount > 100000 THEN RAISE EXCEPTION 'Maximum payment is 100,000 BIX per transaction'; END IF;
  SELECT user_id, code INTO v_to, v_to_code FROM public.referral_codes WHERE code = upper(trim(p_code));
  IF v_to IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF v_to = auth.uid() THEN RAISE EXCEPTION 'You cannot pay yourself'; END IF;
  SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id = auth.uid();
  IF v_from_code IS NULL THEN RAISE EXCEPTION 'Your member code is not ready yet'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT bix_balance INTO v_bix FROM public.bix_asset_balances(auth.uid());
  IF COALESCE(v_bix,0) < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
  SELECT COALESCE(SUM(amount_bix),0) INTO v_today FROM public.bix_transfers WHERE sender_id = auth.uid() AND status = 'completed' AND created_at > now() - interval '24 hours';
  IF v_today + p_amount > 500000 THEN RAISE EXCEPTION 'Daily BIX PAY limit (500,000 BIX) reached'; END IF;
  INSERT INTO public.bix_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_bix, note)
  VALUES (auth.uid(), v_to, v_from_code, v_to_code, p_amount, NULLIF(left(trim(coalesce(p_note,'')),120),''))
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;