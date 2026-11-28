ALTER TABLE public.stakes ADD COLUMN wallet_auto_debit boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.stakes.wallet_auto_debit IS 'Server-created automatic wallet debit independent of source classification; immutable after insert; historical stakes unchanged.';
CREATE OR REPLACE FUNCTION public.bix_verified_stake_funds(p_user uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE verified numeric; unverified numeric; used numeric; withdrawn numeric; capacity numeric; spendable numeric;
BEGIN
 IF EXISTS(SELECT 1 FROM public.bix_clone_accounts WHERE user_id=p_user) OR EXISTS(SELECT 1 FROM public.bix_leaders WHERE user_id=p_user AND status='approved' AND virtual_usd>0) THEN RETURN 0; END IF;
 SELECT COALESCE(SUM(net_usd) FILTER(WHERE verified_at IS NOT NULL AND tx_hash ~ '^0x[0-9a-fA-F]{64}$'),0),COALESCE(SUM(net_usd) FILTER(WHERE verified_at IS NULL OR tx_hash IS NULL OR tx_hash !~ '^0x[0-9a-fA-F]{64}$'),0) INTO verified,unverified FROM public.wallet_transactions WHERE user_id=p_user AND type='deposit' AND status='approved';
 SELECT COALESCE(SUM(GREATEST(amount_usd-CASE WHEN status='unstaked' THEN refund_usd ELSE 0 END,0)),0) INTO used FROM public.stakes WHERE user_id=p_user AND status<>'rejected';
 SELECT COALESCE(SUM(amount_usd),0) INTO withdrawn FROM public.wallet_transactions WHERE user_id=p_user AND type='withdraw' AND status IN ('approved','pending');
 capacity:=verified-used-withdrawn-COALESCE(public.bix_presale_paid(p_user),0)+LEAST(COALESCE(public.bix_p2p_usdt_delta(p_user),0),0)+LEAST(COALESCE(public.bix_bixtrade_usdt_delta(p_user),0),0)+LEAST(COALESCE(public.bix_bixgo_usdt_delta(p_user),0),0)+LEAST(COALESCE(public.bix_usdt_member_delta(p_user),0),0);
 spendable:=LEAST(COALESCE((public.bix_balance_ledger(p_user)->>'withdrawable_usdt')::numeric,0),COALESCE((SELECT usdt_balance FROM public.bix_asset_balances(p_user)),0))-unverified;
 RETURN GREATEST(LEAST(capacity,spendable),0);
END $$;
REVOKE ALL ON FUNCTION public.bix_verified_stake_funds(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.bix_stake_auto_funding_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE required_usdt numeric;
BEGIN
 IF TG_OP='UPDATE' THEN
 IF NEW.wallet_auto_debit IS DISTINCT FROM OLD.wallet_auto_debit OR (OLD.wallet_auto_debit AND (NEW.funded_vusdt IS DISTINCT FROM OLD.funded_vusdt OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd OR NEW.payment_mode IS DISTINCT FROM OLD.payment_mode OR NEW.user_id IS DISTINCT FROM OLD.user_id)) THEN RAISE EXCEPTION 'Automatic stake funding and debit are immutable'; END IF;
 RETURN NEW; END IF;
 IF NOT NEW.wallet_auto_debit THEN RETURN NEW; END IF;
 IF auth.uid() IS DISTINCT FROM NEW.user_id OR NEW.status<>'active' OR NEW.payment_mode NOT IN ('usdt','hybrid') OR NEW.amount_usd<=0 THEN RAISE EXCEPTION 'Authenticated automatic staking required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||NEW.user_id::text));
 required_usdt:=NEW.amount_usd*CASE WHEN NEW.payment_mode='hybrid' THEN 0.7 ELSE 1 END;
 NEW.funded_vusdt:=public.bix_verified_stake_funds(NEW.user_id)<required_usdt;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bix_stake_auto_funding_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER stakes_00_auto_funding BEFORE INSERT OR UPDATE ON public.stakes FOR EACH ROW EXECUTE FUNCTION public.bix_stake_auto_funding_guard();
DO $$
DECLARE original text; changed text;
BEGIN
 original:=pg_get_functiondef('public.bix_vusdt_component(uuid)'::regprocedure);
 changed:=replace(original,'(funded_vusdt OR wallet_debit_preserved)','(funded_vusdt OR wallet_debit_preserved OR wallet_auto_debit)');
 IF changed=original THEN RAISE EXCEPTION 'Existing debit expression missing'; END IF; EXECUTE changed;
 original:=pg_get_functiondef('public.request_bix_duration_stake(text,integer)'::regprocedure);
 changed:=replace(original,'activated_at,funded_vusdt) VALUES','activated_at,funded_vusdt,wallet_auto_debit) VALUES');
 changed:=replace(changed,$match$'active',now(),true) RETURNING$match$,$match$'active',now(),true,true) RETURNING$match$);
 IF changed=original OR position('wallet_auto_debit' IN changed)=0 THEN RAISE EXCEPTION 'USDT staking insert missing'; END IF; EXECUTE changed;
 original:=pg_get_functiondef('public.request_bix_duration_stake_mode(text,integer,text)'::regprocedure);
 changed:=replace(original,'payment_mode,bix_paid,bix_price_usd)','payment_mode,bix_paid,bix_price_usd,wallet_auto_debit)');
 changed:=replace(changed,$match$true,'hybrid',v_bix,v_price)$match$,$match$true,'hybrid',v_bix,v_price,true)$match$);
 IF changed=original OR position('wallet_auto_debit' IN changed)=0 THEN RAISE EXCEPTION 'Hybrid staking insert missing'; END IF; EXECUTE changed;
END $$;