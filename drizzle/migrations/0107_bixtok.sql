ALTER TABLE public.bix_vbix_ledger DROP CONSTRAINT bix_vbix_ledger_kind_check;
ALTER TABLE public.bix_vbix_ledger ADD CONSTRAINT bix_vbix_ledger_kind_check CHECK (kind = ANY (ARRAY['mining','network','quest','bixtok']));

CREATE TABLE public.bixtok_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  live_enabled boolean NOT NULL DEFAULT true,
  gifts_enabled boolean NOT NULL DEFAULT true,
  live_min_stake_usd numeric NOT NULL DEFAULT 0,
  live_max_minutes integer NOT NULL DEFAULT 120,
  features jsonb NOT NULL DEFAULT '{"likes":true,"comments":true,"share":true,"bixp_gifts":true,"bix_gifts":true}'::jsonb,
  menus jsonb NOT NULL DEFAULT '[{"key":"foryou","label":"For You","enabled":true},{"key":"live","label":"LIVE","enabled":true},{"key":"following","label":"Following","enabled":true}]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.bixtok_config(id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, UPDATE ON public.bixtok_config TO authenticated;
GRANT ALL ON public.bixtok_config TO service_role;
ALTER TABLE public.bixtok_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok config read" ON public.bixtok_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "bixtok config admin write" ON public.bixtok_config FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());

CREATE TABLE public.bixtok_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎁',
  currency text NOT NULL DEFAULT 'BIXP' CHECK (currency IN ('BIXP','BIX')),
  price numeric NOT NULL CHECK (price > 0 AND price <= 100000),
  enabled boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.bixtok_gifts(name, emoji, currency, price, sort) VALUES
 ('BIX Coffee','☕','BIXP',1,1),('Cyber Rose','🌹','BIXP',5,2),('Fox Rocket','🚀','BIXP',20,3),
 ('Grand Dragon','🐉','BIX',10,4),('Sovereign Crown','👑','BIX',50,5);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bixtok_gifts TO authenticated;
GRANT ALL ON public.bixtok_gifts TO service_role;
ALTER TABLE public.bixtok_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok gifts read" ON public.bixtok_gifts FOR SELECT TO authenticated USING (enabled OR public.is_bix_admin());
CREATE POLICY "bixtok gifts admin ins" ON public.bixtok_gifts FOR INSERT TO authenticated WITH CHECK (public.is_bix_admin());
CREATE POLICY "bixtok gifts admin upd" ON public.bixtok_gifts FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE POLICY "bixtok gifts admin del" ON public.bixtok_gifts FOR DELETE TO authenticated USING (public.is_bix_admin());

CREATE TABLE public.bixtok_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid,
  creator_name text NOT NULL DEFAULT 'BIXLINK',
  caption text NOT NULL DEFAULT '',
  video_url text NOT NULL CHECK (video_url ~ '^https://'),
  poster_url text,
  enabled boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.bixtok_videos(creator_name, caption, video_url, sort) VALUES
 ('BIXLINK','Welcome to BIXTOK — gift creators with BIXP & BIX. #BIXLINK','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',1),
 ('BIXLINK','Stake, earn projections, go LIVE. #Web3','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',2),
 ('BIXLINK','Fox Arena season is on. #FoxArena','https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',3);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bixtok_videos TO authenticated;
GRANT ALL ON public.bixtok_videos TO service_role;
ALTER TABLE public.bixtok_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok videos read" ON public.bixtok_videos FOR SELECT TO authenticated USING (enabled OR public.is_bix_admin());
CREATE POLICY "bixtok videos admin ins" ON public.bixtok_videos FOR INSERT TO authenticated WITH CHECK (public.is_bix_admin());
CREATE POLICY "bixtok videos admin upd" ON public.bixtok_videos FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE POLICY "bixtok videos admin del" ON public.bixtok_videos FOR DELETE TO authenticated USING (public.is_bix_admin());

CREATE TABLE public.bixtok_lives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  host_name text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','ended')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
GRANT SELECT ON public.bixtok_lives TO authenticated;
GRANT ALL ON public.bixtok_lives TO service_role;
ALTER TABLE public.bixtok_lives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok lives read" ON public.bixtok_lives FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bixtok_live_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.bixtok_lives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 200),
  kind text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat','gift')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bixtok_live_messages TO authenticated;
GRANT ALL ON public.bixtok_live_messages TO service_role;
ALTER TABLE public.bixtok_live_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok msgs read" ON public.bixtok_live_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "bixtok msgs insert" ON public.bixtok_live_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND kind = 'chat' AND EXISTS (SELECT 1 FROM public.bixtok_lives l WHERE l.id = live_id AND l.status = 'live'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.bixtok_live_messages;

CREATE TABLE public.bixtok_gift_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  gift_id uuid NOT NULL,
  gift_name text NOT NULL,
  currency text NOT NULL,
  amount numeric NOT NULL,
  live_id uuid,
  video_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bixtok_gift_tx TO authenticated;
GRANT ALL ON public.bixtok_gift_tx TO service_role;
ALTER TABLE public.bixtok_gift_tx ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok gifts own or admin" ON public.bixtok_gift_tx FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bixtok_my_stake_usd() RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount_usd),0) FROM public.stakes WHERE user_id = auth.uid() AND status = 'active'
$$;
GRANT EXECUTE ON FUNCTION public.bixtok_my_stake_usd() TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_start_live(p_title text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bixtok_config; v_stake numeric; v_name text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.bixtok_config WHERE id = 1;
  IF NOT c.enabled OR NOT c.live_enabled THEN RAISE EXCEPTION 'Go LIVE is closed right now'; END IF;
  SELECT COUNT(*) FILTER (WHERE true), COALESCE(SUM(amount_usd),0) INTO v_stake, v_stake FROM public.stakes WHERE user_id = auth.uid() AND status = 'active';
  SELECT COALESCE(SUM(amount_usd),0) INTO v_stake FROM public.stakes WHERE user_id = auth.uid() AND status = 'active';
  IF NOT EXISTS (SELECT 1 FROM public.stakes WHERE user_id = auth.uid() AND status = 'active') OR v_stake < c.live_min_stake_usd THEN
    RAISE EXCEPTION 'Go LIVE requires an active staking package of at least $%', c.live_min_stake_usd;
  END IF;
  UPDATE public.bixtok_lives SET status = 'ended', ended_at = now() WHERE host_id = auth.uid() AND status = 'live';
  SELECT COALESCE(NULLIF(username,''), 'member') INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.bixtok_lives(host_id, host_name, title) VALUES (auth.uid(), COALESCE(v_name,'member'), COALESCE(NULLIF(left(trim(p_title),80),''),'BIXTOK LIVE')) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_start_live(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_end_live(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bixtok_lives SET status = 'ended', ended_at = now() WHERE id = p_id AND status = 'live' AND (host_id = auth.uid() OR public.is_bix_admin());
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_end_live(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_send_gift(p_gift uuid, p_live uuid, p_video uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bixtok_config; g public.bixtok_gifts; v_to uuid; v_bal numeric; v_from_code text; v_to_code text; v_name text; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.bixtok_config WHERE id = 1;
  IF NOT c.enabled OR NOT c.gifts_enabled THEN RAISE EXCEPTION 'Gifts are closed right now'; END IF;
  SELECT * INTO g FROM public.bixtok_gifts WHERE id = p_gift AND enabled;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Gift not available'; END IF;
  IF g.currency = 'BIXP' AND NOT COALESCE((c.features->>'bixp_gifts')::boolean, true) THEN RAISE EXCEPTION 'BIXP gifts are closed'; END IF;
  IF g.currency = 'BIX' AND NOT COALESCE((c.features->>'bix_gifts')::boolean, true) THEN RAISE EXCEPTION 'BIX gifts are closed'; END IF;
  IF p_live IS NOT NULL THEN SELECT host_id INTO v_to FROM public.bixtok_lives WHERE id = p_live AND status = 'live';
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
    INSERT INTO public.bixtok_live_messages(live_id, user_id, name, body, kind) VALUES (p_live, auth.uid(), COALESCE(v_name,'member'), g.emoji || ' sent ' || g.name || ' · ' || g.price || ' ' || g.currency, 'gift');
  END IF;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_send_gift(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_like(p_video uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.bixtok_videos SET likes = likes + 1 WHERE id = p_video AND enabled AND auth.uid() IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION public.bixtok_like(uuid) TO authenticated;