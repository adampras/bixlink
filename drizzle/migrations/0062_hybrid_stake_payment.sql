ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'usdt';
ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS bix_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS bix_price_usd numeric;
ALTER TABLE public.stakes ADD CONSTRAINT stakes_payment_mode_chk CHECK (payment_mode IN ('usdt','hybrid'));

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
SELECT CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,public.bix_wallet_balance(p_user)+COALESCE((SELECT SUM(CASE WHEN direction='BIX_TO_USDT' AND status='approved' THEN amount_out WHEN direction='USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(amount_usdt) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='USDT'),0)
+COALESCE((SELECT SUM(0.3*(amount_usd - CASE WHEN status='unstaked' THEN COALESCE(refund_usd,0) ELSE 0 END)) FROM public.stakes WHERE user_id=p_user AND payment_mode='hybrid'),0)) ELSE NULL END,
CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,
COALESCE((SELECT SUM(CASE WHEN direction='USDT_TO_BIX' AND status='approved' THEN amount_out WHEN direction='BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_bix ELSE -amount_bix END) FROM public.bix_transfers WHERE status='completed' AND(sender_id=p_user OR recipient_id=p_user)),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id=p_user),0)
+COALESCE((SELECT balance_bix FROM public.owner_bix_vault WHERE owner_id=p_user AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin')),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX'),0)
+public.bix_p2p_bix_delta(p_user)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)
-COALESCE((SELECT SUM(CASE WHEN status='unstaked' AND amount_usd>0 THEN bix_paid*(1-COALESCE(refund_usd,0)/amount_usd) ELSE bix_paid END) FROM public.stakes WHERE user_id=p_user AND payment_mode='hybrid'),0)) ELSE NULL END;
$function$;

CREATE OR REPLACE FUNCTION public.request_bix_duration_stake_mode(p_package text, p_days integer, p_mode text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.packages%ROWTYPE; new_id uuid; v_bal record; v_apy numeric; v_price numeric; v_bix numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_mode NOT IN ('usdt','hybrid') THEN RAISE EXCEPTION 'Invalid payment mode'; END IF;
 IF p_mode='usdt' THEN RETURN public.request_bix_duration_stake(p_package,p_days); END IF;
 IF p_days IS NULL OR NOT(p_days=ANY(ARRAY[30,60,90,180,360])) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
 SELECT * INTO p FROM public.packages WHERE id=p_package AND enabled AND NOT retired FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable or closed'; END IF;
 v_apy := (p.duration_apys->>p_days::text)::numeric;
 IF v_apy IS NULL THEN RAISE EXCEPTION 'Duration unavailable'; END IF;
 SELECT NULLIF((value->>'priceUsd')::numeric,0) INTO v_price FROM public.app_settings WHERE key='bix_market';
 IF v_price IS NULL OR v_price<=0 THEN RAISE EXCEPTION 'BIX reference price unavailable'; END IF;
 v_bix := round(p.price_usd*0.3/v_price,6);
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||auth.uid()::text));
 PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
 SELECT * INTO v_bal FROM public.bix_asset_balances(auth.uid());
 IF COALESCE(v_bal.usdt_balance,0) < p.price_usd*0.7 THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
 IF COALESCE(v_bal.bix_balance,0) < v_bix THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt,payment_mode,bix_paid,bix_price_usd)
 VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true,'hybrid',v_bix,v_price) RETURNING id INTO new_id;
 RETURN new_id;
END $function$;
REVOKE ALL ON FUNCTION public.request_bix_duration_stake_mode(text,integer,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.request_bix_duration_stake_mode(text,integer,text) TO authenticated;