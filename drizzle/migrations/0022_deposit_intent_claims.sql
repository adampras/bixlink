ALTER TABLE public.deposit_intents ADD COLUMN claim_tx_id uuid;
ALTER TABLE public.deposit_intents ADD COLUMN claimed_at timestamptz;