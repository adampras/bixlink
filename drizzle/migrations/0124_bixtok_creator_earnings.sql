ALTER TABLE public.bixtok_gift_tx ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
UPDATE public.bixtok_gift_tx SET claimed_at = created_at WHERE claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS bixtok_gift_tx_unclaimed_idx ON public.bixtok_gift_tx(recipient_id) WHERE claimed_at IS NULL;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
-COALESCE((SELECT SUM(amount) FROM public.bixtok_gift_tx WHERE recipient_id=p_user AND currency='BIX' AND claimed_at IS NULL),0)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)
-COALESCE((SELECT SUM(CASE WHEN status='unstaked' AND amount_usd>0 THEN bix_paid*(1-COALESCE(refund_usd,0)/amount_usd) ELSE bix_paid END) FROM public.stakes WHERE user_id=p_user AND payment_mode='hybrid'),0)) ELSE NULL END;
$function$;

CREATE OR REPLACE FUNCTION public.bixtok_send_gift_to(p_gift uuid, p_live uuid, p_video uuid, p_to uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bixtok_config; g public.bixtok_gifts; v_to uuid; v_host uuid; v_bal numeric; v_from_code text; v_to_code text; v_name text; v_to_name text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.bixtok_config WHERE id = 1;
  IF NOT c.enabled OR NOT c.gifts_enabled THEN RAISE EXCEPTION 'Gifts are closed right now'; END IF;
  SELECT * INTO g FROM public.bixtok_gifts WHERE id = p_gift AND enabled;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Gift not available'; END IF;
  IF g.currency = 'BIXP' AND NOT COALESCE((c.features->>'bixp_gifts')::boolean, true) THEN RAISE EXCEPTION 'BIXP gifts are closed'; END IF;
  IF g.currency = 'BIX' AND NOT COALESCE((c.features->>'bix_gifts')::boolean, true) THEN RAISE EXCEPTION 'BIX gifts are closed'; END IF;
  IF p_live IS NOT NULL THEN
    SELECT host_id INTO v_host FROM public.bixtok_lives WHERE id = p_live AND status = 'live';
    IF v_host IS NULL THEN RAISE EXCEPTION 'LIVE not active'; END IF;
    IF p_to IS NULL OR p_to = v_host THEN v_to := v_host;
    ELSIF EXISTS (SELECT 1 FROM public.bixtok_stage_requests WHERE live_id = p_live AND user_id = p_to AND status = 'approved') THEN v_to := p_to;
    ELSE RAISE EXCEPTION 'Recipient is not on stage'; END IF;
    IF auth.uid() = v_host AND NOT COALESCE(c.host_gifts, true) THEN RAISE EXCEPTION 'Host gifts are closed'; END IF;
  ELSIF p_video IS NOT NULL THEN SELECT creator_id INTO v_to FROM public.bixtok_videos WHERE id = p_video AND enabled; END IF;
  IF v_to IS NULL THEN RAISE EXCEPTION 'This creator cannot receive gifts yet'; END IF;
  IF v_to = auth.uid() THEN RAISE EXCEPTION 'You cannot gift yourself'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  IF g.currency = 'BIXP' THEN
    SELECT COALESCE(SUM(amount_vbix),0) INTO v_bal FROM public.bix_vbix_ledger WHERE user_id = auth.uid();
    IF v_bal < g.price THEN RAISE EXCEPTION 'Insufficient BIXP'; END IF;
    -- Sender is debited now; the creator is credited only when they withdraw BIXTOK earnings.
    INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (auth.uid(), v_to, 'bixtok', 0, -g.price);
  ELSE
    SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(v_bal,0) < g.price THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
    SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id = auth.uid();
    SELECT code INTO v_to_code FROM public.referral_codes WHERE user_id = v_to;
    IF v_from_code IS NULL OR v_to_code IS NULL THEN RAISE EXCEPTION 'Member code not ready'; END IF;
    -- Held for the creator: excluded from their wallet balance until claimed.
    INSERT INTO public.bix_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_bix, note) VALUES (auth.uid(), v_to, v_from_code, v_to_code, g.price, 'BIXTOK gift: ' || g.name);
  END IF;
  INSERT INTO public.bixtok_gift_tx(sender_id, recipient_id, gift_id, gift_name, currency, amount, live_id, video_id) VALUES (auth.uid(), v_to, g.id, g.name, g.currency, g.price, p_live, p_video) RETURNING id INTO v_id;
  IF p_live IS NOT NULL THEN
    SELECT COALESCE(NULLIF(username,''),'member') INTO v_name FROM public.profiles WHERE user_id = auth.uid();
    SELECT COALESCE(NULLIF(username,''),'member') INTO v_to_name FROM public.profiles WHERE user_id = v_to;
    INSERT INTO public.bixtok_live_messages(live_id, user_id, name, body, kind) VALUES (p_live, auth.uid(), COALESCE(v_name,'member'),
      g.emoji || ' sent ' || g.name || CASE WHEN v_to <> v_host THEN ' to @' || COALESCE(v_to_name,'guest') ELSE '' END || ' · ' || g.price || ' ' || g.currency, 'gift');
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_send_gift_to(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_send_gift_to(uuid, uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_my_earnings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'bix', COALESCE((SELECT SUM(amount) FROM bixtok_gift_tx WHERE recipient_id = auth.uid() AND currency='BIX' AND claimed_at IS NULL),0),
    'bixp', COALESCE((SELECT SUM(amount) FROM bixtok_gift_tx WHERE recipient_id = auth.uid() AND currency='BIXP' AND claimed_at IS NULL),0),
    'claimed_bix', COALESCE((SELECT SUM(amount) FROM bixtok_gift_tx WHERE recipient_id = auth.uid() AND currency='BIX' AND claimed_at IS NOT NULL),0),
    'claimed_bixp', COALESCE((SELECT SUM(amount) FROM bixtok_gift_tx WHERE recipient_id = auth.uid() AND currency='BIXP' AND claimed_at IS NOT NULL),0),
    'recent', COALESCE((SELECT jsonb_agg(r) FROM (SELECT t.gift_name, t.currency, t.amount, t.created_at, t.claimed_at, COALESCE(NULLIF(p.username,''),'member') AS sender
       FROM bixtok_gift_tx t LEFT JOIN profiles p ON p.user_id = t.sender_id WHERE t.recipient_id = auth.uid() ORDER BY t.created_at DESC LIMIT 20) r), '[]'::jsonb))
  WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.bixtok_my_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_my_earnings() TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_claim_earnings() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bix numeric; v_bixp numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bixtok-claim-' || auth.uid()::text));
  WITH c AS (UPDATE bixtok_gift_tx SET claimed_at = now() WHERE recipient_id = auth.uid() AND claimed_at IS NULL RETURNING currency, amount)
  SELECT COALESCE(SUM(amount) FILTER (WHERE currency='BIX'),0), COALESCE(SUM(amount) FILTER (WHERE currency='BIXP'),0) INTO v_bix, v_bixp FROM c;
  IF v_bix = 0 AND v_bixp = 0 THEN RAISE EXCEPTION 'No BIXTOK earnings to withdraw'; END IF;
  IF v_bixp > 0 THEN INSERT INTO bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (auth.uid(), auth.uid(), 'bixtok', 0, v_bixp); END IF;
  RETURN jsonb_build_object('bix', v_bix, 'bixp', v_bixp);
END $$;
REVOKE ALL ON FUNCTION public.bixtok_claim_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_claim_earnings() TO authenticated;