CREATE TABLE public.deposit_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_code text NOT NULL,
  network text NOT NULL,
  address text NOT NULL,
  amount_exact numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours',
  credited_at timestamptz
);
GRANT SELECT ON public.deposit_intents TO authenticated;
GRANT ALL ON public.deposit_intents TO service_role;
ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin intent read" ON public.deposit_intents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE UNIQUE INDEX deposit_intents_pending_amount ON public.deposit_intents (wallet_code, amount_exact) WHERE status = 'pending';