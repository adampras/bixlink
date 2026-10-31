ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS stage_max integer NOT NULL DEFAULT 5;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS live_cta boolean NOT NULL DEFAULT true;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS host_gifts boolean NOT NULL DEFAULT true;
ALTER TABLE public.bixtok_config DROP CONSTRAINT IF EXISTS bixtok_config_stage_max_chk;
ALTER TABLE public.bixtok_config ADD CONSTRAINT bixtok_config_stage_max_chk CHECK (stage_max BETWEEN 1 AND 5);

CREATE OR REPLACE FUNCTION public.bixtok_stage_decide(p_req uuid, p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r bixtok_stage_requests; v_max int;
BEGIN
  IF p_status NOT IN ('approved','rejected','left') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO r FROM bixtok_stage_requests WHERE id = p_req;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_bix_admin() OR EXISTS (SELECT 1 FROM bixtok_lives WHERE id = r.live_id AND host_id = auth.uid()) OR (r.user_id = auth.uid() AND p_status = 'left')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT LEAST(5, GREATEST(1, COALESCE(stage_max, 5))) INTO v_max FROM bixtok_config WHERE id = 1;
  v_max := COALESCE(v_max, 5);
  IF p_status = 'approved' AND (SELECT count(*) FROM bixtok_stage_requests WHERE live_id = r.live_id AND status = 'approved' AND id <> r.id) >= v_max THEN RAISE EXCEPTION 'Stage is full (max % guests)', v_max; END IF;
  UPDATE bixtok_stage_requests SET status = p_status WHERE id = p_req;
END $$;

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
    INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (auth.uid(), v_to, 'bixtok', 0, -g.price), (v_to, auth.uid(), 'bixtok', 0, g.price);
  ELSE
    SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(auth.uid());
    IF COALESCE(v_bal,0) < g.price THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
    SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id = auth.uid();
    SELECT code INTO v_to_code FROM public.referral_codes WHERE user_id = v_to;
    IF v_from_code IS NULL OR v_to_code IS NULL THEN RAISE EXCEPTION 'Member code not ready'; END IF;
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