CREATE TABLE public.bix_stake_profit_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stake_id uuid NOT NULL REFERENCES public.bix_stakes(id),
  asset text NOT NULL CHECK (asset IN ('BIX','USDT')),
  amount_bix numeric NOT NULL,
  amount_usdt numeric NOT NULL DEFAULT 0,
  price_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_stake_profit_withdrawals TO authenticated;
GRANT ALL ON public.bix_stake_profit_withdrawals TO service_role;
ALTER TABLE public.bix_stake_profit_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profit withdrawals" ON public.bix_stake_profit_withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_booster_withdraw_config()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('bix', COALESCE((SELECT (value->>'bix')::boolean FROM app_settings WHERE key='booster_withdraw'), false),
                            'usdt', COALESCE((SELECT (value->>'usdt')::boolean FROM app_settings WHERE key='booster_withdraw'), false))
$$;

CREATE OR REPLACE FUNCTION public.bix_withdraw_stake_profit(p_stake uuid, p_asset text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.bix_stakes%ROWTYPE; cfg jsonb; v_days numeric; v_earned numeric; v_taken numeric; v_avail numeric; v_price numeric; v_owner uuid; v_vault numeric; v_usdt numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_asset NOT IN ('BIX','USDT') THEN RAISE EXCEPTION 'Invalid asset'; END IF;
  cfg := public.bix_booster_withdraw_config();
  IF NOT (cfg->>lower(p_asset))::boolean THEN RAISE EXCEPTION 'Withdraw % is closed', p_asset; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
  SELECT * INTO s FROM bix_stakes WHERE id=p_stake AND user_id=auth.uid() AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active stake not found'; END IF;
  v_days := LEAST(EXTRACT(EPOCH FROM (now()-s.created_at))/86400, s.lock_days);
  v_earned := s.amount_bix * s.apy / 100 * v_days / 365;
  SELECT COALESCE(sum(amount_bix),0) INTO v_taken FROM bix_stake_profit_withdrawals WHERE stake_id=s.id;
  v_avail := round(v_earned - v_taken, 6);
  IF v_avail < s.amount_bix * 0.10 THEN RAISE EXCEPTION 'Minimum withdraw is 10%% of stake (% BIX); available % BIX', round(s.amount_bix*0.10,4), GREATEST(v_avail,0); END IF;
  SELECT COALESCE(NULLIF((value->>'priceUsd')::numeric,0),0.84291) INTO v_price FROM app_settings WHERE key='bix_market';
  v_price := COALESCE(v_price,0.84291);
  SELECT owner_id, balance_bix INTO v_owner, v_vault FROM owner_bix_vault ORDER BY generated_at LIMIT 1 FOR UPDATE;
  IF v_owner IS NULL OR v_vault < v_avail THEN RAISE EXCEPTION 'Owner reserve unavailable'; END IF;
  UPDATE owner_bix_vault SET balance_bix = balance_bix - v_avail, updated_at=now() WHERE owner_id=v_owner;
  IF p_asset='USDT' THEN v_usdt := round(v_avail * v_price, 4); END IF;
  INSERT INTO bix_stake_profit_withdrawals(user_id, stake_id, asset, amount_bix, amount_usdt, price_usd) VALUES (auth.uid(), s.id, p_asset, v_avail, v_usdt, v_price);
  RETURN jsonb_build_object('amount_bix', v_avail, 'amount_usdt', v_usdt, 'asset', p_asset);
END $$;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
SELECT CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,public.bix_wallet_balance(p_user)+COALESCE((SELECT SUM(CASE WHEN direction='BIX_TO_USDT' AND status='approved' THEN amount_out WHEN direction='USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(amount_usdt) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='USDT'),0)) ELSE NULL END,
CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,
COALESCE((SELECT SUM(CASE WHEN direction='USDT_TO_BIX' AND status='approved' THEN amount_out WHEN direction='BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_bix ELSE -amount_bix END) FROM public.bix_transfers WHERE status='completed' AND(sender_id=p_user OR recipient_id=p_user)),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id=p_user),0)
+COALESCE((SELECT balance_bix FROM public.owner_bix_vault WHERE owner_id=p_user AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin')),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(bix_amount) FROM public.bix_usdt_network_bonuses WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX'),0)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)) ELSE NULL END;
$function$;

CREATE OR REPLACE FUNCTION public.request_bix_duration_stake(p_package text, p_days integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.packages%ROWTYPE; new_id uuid; v_bal numeric; v_apy numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_days IS NULL OR NOT(p_days=ANY(ARRAY[30,60,90,180,360])) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
 SELECT * INTO p FROM public.packages WHERE id=p_package AND enabled AND NOT retired FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable or closed'; END IF;
 -- package rate is monthly; stakes store the annual equivalent so all existing formulas stay unchanged
 v_apy := (p.duration_apys->>p_days::text)::numeric * 12;
 IF v_apy IS NULL THEN RAISE EXCEPTION 'Duration unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||auth.uid()::text));
 v_bal := COALESCE(public.bix_vusdt_balance(auth.uid()),0);
 IF v_bal<p.price_usd THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
 INSERT INTO public.stakes(user_id,package_id,amount_usd,apy,lock_days,status,activated_at,funded_vusdt) VALUES(auth.uid(),p.id,p.price_usd,v_apy,p_days,'active',now(),true) RETURNING id INTO new_id;
 RETURN new_id;
END $function$;