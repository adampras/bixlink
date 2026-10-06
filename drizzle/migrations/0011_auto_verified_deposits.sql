ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS wallet_code text;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS network text;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS verified_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_tx_verified_hash_uniq ON public.wallet_transactions (lower(tx_hash)) WHERE type = 'deposit' AND verified_at IS NOT NULL;