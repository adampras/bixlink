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
  IF OLD.funded_vusdt AND NOT NEW.funded_vusdt AND NOT NEW.wallet_debit_preserved THEN RAISE EXCEPTION 'Historical wallet debit must be preserved'; END IF;
  IF NEW.wallet_debit_preserved THEN
   IF NOT OLD.funded_vusdt OR NEW.funded_vusdt OR NEW.funding_reconciliation->>'original_funded_vusdt' IS DISTINCT FROM 'true' OR
      NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=(NEW.funding_reconciliation->>'reviewed_by')::uuid AND public.bix_is_owner1_user(r.user_id)) THEN RAISE EXCEPTION 'Invalid funding reconciliation'; END IF;
   IF public.bix_is_sponsored_source(NEW.user_id,NULL) OR
      NOT EXISTS(SELECT 1 FROM public.wallet_transactions w WHERE w.id=(NEW.funding_reconciliation->>'verified_deposit_id')::uuid AND w.user_id=NEW.user_id AND w.type='deposit' AND w.status='approved' AND w.verified_at IS NOT NULL AND w.tx_hash ~ '^0x[0-9a-fA-F]{64}$' AND w.net_usd>=NEW.amount_usd AND w.created_at<OLD.created_at) THEN RAISE EXCEPTION 'Verified real deposit backing required'; END IF;
   IF EXISTS(SELECT 1 FROM public.stakes s WHERE s.id<>NEW.id AND s.wallet_debit_preserved AND s.funding_reconciliation->>'verified_deposit_id'=NEW.funding_reconciliation->>'verified_deposit_id') THEN RAISE EXCEPTION 'Deposit evidence already used'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;