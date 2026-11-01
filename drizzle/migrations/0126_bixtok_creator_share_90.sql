ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS creator_share_pct numeric NOT NULL DEFAULT 90 CHECK (creator_share_pct BETWEEN 50 AND 100);
ALTER TABLE public.bixtok_gift_tx ADD COLUMN IF NOT EXISTS gross_amount numeric;
UPDATE public.bixtok_gift_tx SET gross_amount = amount WHERE gross_amount IS NULL;

CREATE OR REPLACE FUNCTION public.bixtok_send_gift_to(p_gift uuid, p_live uuid, p_video uuid, p_to uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bixtok_config; g public.bixtok_gifts; v_to uuid; v_host uuid; v_bal numeric; v_from_code text; v_to_code text; v_owner uuid; v_owner_code text; v_name text; v_to_name text; v_id uuid; v_net numeric; v_fee numeric;
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
  v_net := round(g.price * COALESCE(c.creator_share_pct, 90) / 100, 6);
  v_fee := g.price - v_net;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  IF g.currency = 'BIXP' THEN
    SELECT COALESCE(SUM(amount_vbix),0) INTO v_bal FROM public.bix_vbix_ledger WHERE user_id = auth.uid();
    IF v_bal < g.price THEN RAISE EXCEPTION 'Insufficient BIXP'; END IF;
    -- Sender pays the full price; creator is credited the net share on withdrawal; the fee stays out of circulation.
    INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (auth.uid(), v_to, 'bixtok', 0, -g.price);
  ELSE
    SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(v_bal,0) < g.price THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
    SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id = auth.uid();
    SELECT code INTO v_to_code FROM public.referral_codes WHERE user_id = v_to;
    IF v_from_code IS NULL OR v_to_code IS NULL THEN RAISE EXCEPTION 'Member code not ready'; END IF;
    INSERT INTO public.bix_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_bix, note) VALUES (auth.uid(), v_to, v_from_code, v_to_code, v_net, 'BIXTOK gift: ' || g.name);
    IF v_fee > 0 THEN
      SELECT id INTO v_owner FROM auth.users WHERE lower(email)='bixdevpras@gmail.com' LIMIT 1;
      SELECT code INTO v_owner_code FROM public.referral_codes WHERE user_id = v_owner;
      IF v_owner IS NULL OR v_owner_code IS NULL OR v_owner = auth.uid() THEN
        v_net := g.price; v_fee := 0;
        UPDATE public.bix_transfers SET amount_bix = g.price WHERE id = (SELECT id FROM public.bix_transfers WHERE sender_id = auth.uid() AND recipient_id = v_to ORDER BY created_at DESC LIMIT 1);
      ELSE
        INSERT INTO public.bix_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_bix, note) VALUES (auth.uid(), v_owner, v_from_code, v_owner_code, v_fee, 'BIXTOK platform fee: ' || g.name);
      END IF;
    END IF;
  END IF;
  INSERT INTO public.bixtok_gift_tx(sender_id, recipient_id, gift_id, gift_name, currency, amount, gross_amount, live_id, video_id) VALUES (auth.uid(), v_to, g.id, g.name, g.currency, v_net, g.price, p_live, p_video) RETURNING id INTO v_id;
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