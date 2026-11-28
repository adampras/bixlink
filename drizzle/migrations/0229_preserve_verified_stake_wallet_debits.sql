ALTER TABLE public.stakes ADD COLUMN wallet_debit_preserved boolean NOT NULL DEFAULT false;
ALTER TABLE public.stakes ADD COLUMN funding_reconciliation jsonb;
ALTER TABLE public.stakes ADD CONSTRAINT stakes_reconciliation_consistency CHECK ((NOT wallet_debit_preserved AND funding_reconciliation IS NULL) OR (wallet_debit_preserved AND NOT funded_vusdt AND payment_mode='usdt' AND funding_reconciliation IS NOT NULL AND jsonb_typeof(funding_reconciliation)='object'));
COMMENT ON COLUMN public.stakes.wallet_debit_preserved IS 'Preserves historical wallet debit when an incorrectly virtual-tagged, verified real USDT stake is reconciled; never an additional deposit.';
COMMENT ON COLUMN public.stakes.funding_reconciliation IS 'Owner-1-reviewed evidence for real funding correction; records original funding tag and verified deposit references. Virtual subsidies cannot be relabeled.';
CREATE OR REPLACE FUNCTION public.bix_stake_funding_reconciliation_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.wallet_debit_preserved OR NEW.funding_reconciliation IS NOT NULL THEN RAISE EXCEPTION 'Funding reconciliation requires an existing stake'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.wallet_debit_preserved IS DISTINCT FROM OLD.wallet_debit_preserved OR NEW.funding_reconciliation IS DISTINCT FROM OLD.funding_reconciliation OR NEW.funded_vusdt IS DISTINCT FROM OLD.funded_vusdt THEN
  IF NOT public.bix_is_owner1() AND NOT (auth.uid() IS NULL AND current_user='postgres') THEN RAISE EXCEPTION 'Owner 1 funding review required'; END IF;
  IF OLD.wallet_debit_preserved THEN RAISE EXCEPTION 'Funding reconciliation is immutable'; END IF;
  IF NEW.wallet_debit_preserved AND (NOT OLD.funded_vusdt OR NEW.funded_vusdt OR NEW.funding_reconciliation->>'original_funded_vusdt' IS DISTINCT FROM 'true' OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=(NEW.funding_reconciliation->>'reviewed_by')::uuid AND public.bix_is_owner1_user(r.user_id))) THEN RAISE EXCEPTION 'Invalid funding reconciliation'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bix_stake_funding_reconciliation_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stakes_funding_reconciliation_guard BEFORE INSERT OR UPDATE ON public.stakes FOR EACH ROW EXECUTE FUNCTION public.bix_stake_funding_reconciliation_guard();
CREATE OR REPLACE FUNCTION public.bix_vusdt_component(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin') THEN 1000000 ELSE 0 END)
 + COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_usd ELSE -amount_usd END) FROM public.vusdt_transfers WHERE sender_id=p_user OR recipient_id=p_user),0)
 - COALESCE((SELECT SUM(amount_usd) FROM public.stakes WHERE user_id=p_user AND (funded_vusdt OR wallet_debit_preserved)),0)
 + COALESCE((SELECT SUM(refund_usd) FROM public.stakes WHERE user_id=p_user AND (funded_vusdt OR wallet_debit_preserved) AND status='unstaked'),0)
$$;