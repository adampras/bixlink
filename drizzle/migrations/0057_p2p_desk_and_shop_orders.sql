CREATE TABLE public.bix_shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  items jsonb NOT NULL,
  subtotal_usd numeric NOT NULL CHECK (subtotal_usd >= 0),
  region text NOT NULL CHECK (region IN ('local','international')),
  courier text NOT NULL,
  shipping_usd numeric NOT NULL CHECK (shipping_usd >= 0),
  recipient text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  postal_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','completed','cancelled')),
  tracking_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bix_shop_orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.bix_shop_orders TO authenticated;
GRANT UPDATE ON public.bix_shop_orders TO authenticated;
CREATE POLICY "own shop orders read" ON public.bix_shop_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "own shop orders insert" ON public.bix_shop_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND tracking_number IS NULL);
CREATE POLICY "admin shop orders update" ON public.bix_shop_orders FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());

CREATE TABLE public.bix_p2p_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  side text NOT NULL CHECK (side IN ('SELL','BUY')),
  price_usd numeric NOT NULL CHECK (price_usd > 0),
  amount_bix numeric NOT NULL CHECK (amount_bix > 0),
  remaining_bix numeric NOT NULL CHECK (remaining_bix >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.bix_p2p_offers (status, side, price_usd);
ALTER TABLE public.bix_p2p_offers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.bix_p2p_offers TO authenticated;
CREATE POLICY "members read offers" ON public.bix_p2p_offers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bix_p2p_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.bix_p2p_offers(id),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  amount_bix numeric NOT NULL CHECK (amount_bix > 0),
  price_usd numeric NOT NULL,
  total_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bix_p2p_fills ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.bix_p2p_fills TO authenticated;
CREATE POLICY "members read fills" ON public.bix_p2p_fills FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.bix_p2p_usdt_delta(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT SUM(CASE WHEN seller_id=p_user THEN total_usd ELSE 0 END) - SUM(CASE WHEN buyer_id=p_user THEN total_usd ELSE 0 END) FROM public.bix_p2p_fills WHERE seller_id=p_user OR buyer_id=p_user),0)
   - COALESCE((SELECT SUM(remaining_bix*price_usd) FROM public.bix_p2p_offers WHERE user_id=p_user AND side='BUY' AND status='open'),0)
$$;
CREATE OR REPLACE FUNCTION public.bix_p2p_bix_delta(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT SUM(CASE WHEN buyer_id=p_user THEN amount_bix ELSE 0 END) - SUM(CASE WHEN seller_id=p_user THEN amount_bix ELSE 0 END) FROM public.bix_p2p_fills WHERE seller_id=p_user OR buyer_id=p_user),0)
   - COALESCE((SELECT SUM(remaining_bix) FROM public.bix_p2p_offers WHERE user_id=p_user AND side='SELL' AND status='open'),0)
$$;
REVOKE EXECUTE ON FUNCTION public.bix_p2p_usdt_delta(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bix_p2p_bix_delta(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
    (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
    + public.bix_vusdt_component(p_user)
    + COALESCE((SELECT SUM(usdt_amount) FROM public.bix_usdt_network_bonuses WHERE user_id = p_user), 0)
    - public.bix_presale_paid(p_user)
    + public.bix_presale_dividend(p_user)
    + public.bix_p2p_usdt_delta(p_user)
  ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
+public.bix_p2p_bix_delta(p_user)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)) ELSE NULL END;
$function$;

CREATE OR REPLACE FUNCTION public.bix_p2p_post(p_side text, p_price numeric, p_amount numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_bal record; v_id uuid; v_open boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE((value->>'enabled')::boolean, true) INTO v_open FROM public.app_settings WHERE key='p2p_market';
  IF NOT COALESCE(v_open, true) THEN RAISE EXCEPTION 'P2P desk is paused by the owner'; END IF;
  IF p_side NOT IN ('SELL','BUY') THEN RAISE EXCEPTION 'Invalid side'; END IF;
  IF p_price IS NULL OR p_price < 0.35 OR p_price > 0.50 THEN RAISE EXCEPTION 'Price must be between $0.35 and $0.50'; END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN RAISE EXCEPTION 'Amount must be 1 – 1,000,000 BIX'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF (SELECT count(*) FROM public.bix_p2p_offers WHERE user_id=auth.uid() AND status='open') >= 10 THEN RAISE EXCEPTION 'Maximum 10 open offers'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT * INTO v_bal FROM public.bix_asset_balances(auth.uid());
  IF p_side='SELL' AND COALESCE(v_bal.bix_balance,0) < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
  IF p_side='BUY' AND COALESCE(v_bal.usdt_balance,0) < round(p_amount*p_price,6) THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
  INSERT INTO public.bix_p2p_offers(user_id, side, price_usd, amount_bix, remaining_bix) VALUES (auth.uid(), p_side, round(p_price,6), p_amount, p_amount) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.bix_p2p_take(p_offer uuid, p_amount numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o public.bix_p2p_offers; v_bal record; v_total numeric; v_id uuid; v_open boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT COALESCE((value->>'enabled')::boolean, true) INTO v_open FROM public.app_settings WHERE key='p2p_market';
  IF NOT COALESCE(v_open, true) THEN RAISE EXCEPTION 'P2P desk is paused by the owner'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  SELECT * INTO o FROM public.bix_p2p_offers WHERE id=p_offer FOR UPDATE;
  IF o.id IS NULL OR o.status<>'open' THEN RAISE EXCEPTION 'Offer is no longer available'; END IF;
  IF o.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot take your own offer'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > o.remaining_bix THEN RAISE EXCEPTION 'Amount exceeds offer'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  v_total := round(p_amount*o.price_usd,6);
  SELECT * INTO v_bal FROM public.bix_asset_balances(auth.uid());
  IF o.side='SELL' AND COALESCE(v_bal.usdt_balance,0) < v_total THEN RAISE EXCEPTION 'Insufficient USDT balance'; END IF;
  IF o.side='BUY' AND COALESCE(v_bal.bix_balance,0) < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
  INSERT INTO public.bix_p2p_fills(offer_id, seller_id, buyer_id, amount_bix, price_usd, total_usd)
  VALUES (o.id, CASE WHEN o.side='SELL' THEN o.user_id ELSE auth.uid() END, CASE WHEN o.side='SELL' THEN auth.uid() ELSE o.user_id END, p_amount, o.price_usd, v_total) RETURNING id INTO v_id;
  UPDATE public.bix_p2p_offers SET remaining_bix=remaining_bix-p_amount, status=CASE WHEN remaining_bix-p_amount<=0 THEN 'filled' ELSE 'open' END, updated_at=now() WHERE id=o.id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.bix_p2p_cancel(p_offer uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.bix_p2p_offers SET status='cancelled', updated_at=now() WHERE id=p_offer AND status='open' AND (user_id=auth.uid() OR public.is_bix_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_p2p_post(text,numeric,numeric), public.bix_p2p_take(uuid,numeric), public.bix_p2p_cancel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_p2p_post(text,numeric,numeric), public.bix_p2p_take(uuid,numeric), public.bix_p2p_cancel(uuid) TO authenticated;