ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS comm_chat_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS comm_chat_min_usd numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS comm_voice_min_usd numeric NOT NULL DEFAULT 30;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS comm_video_min_usd numeric NOT NULL DEFAULT 100;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS comm_vip_min_usd numeric NOT NULL DEFAULT 500;

CREATE OR REPLACE FUNCTION public.bix_comm_tier(p_uid uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT COALESCE((SELECT SUM(amount_usd) FROM stakes WHERE user_id = p_uid AND status = 'active'),0) AS usd),
       c AS (SELECT * FROM bixtok_config WHERE id = 1)
  SELECT jsonb_build_object(
    'stake', s.usd,
    'chat', c.comm_chat_enabled AND s.usd >= c.comm_chat_min_usd,
    'voice', s.usd >= c.comm_voice_min_usd AND s.usd > 0 OR c.comm_voice_min_usd = 0,
    'video', s.usd >= c.comm_video_min_usd AND s.usd > 0 OR c.comm_video_min_usd = 0,
    'vip', s.usd >= c.comm_vip_min_usd AND s.usd > 0,
    'tier', CASE WHEN s.usd >= c.comm_vip_min_usd AND s.usd > 0 THEN 'vip' WHEN s.usd >= c.comm_video_min_usd AND s.usd > 0 THEN 'video' WHEN s.usd >= c.comm_voice_min_usd AND s.usd > 0 THEN 'voice' ELSE 'free' END,
    'min', jsonb_build_object('chat', c.comm_chat_min_usd, 'voice', c.comm_voice_min_usd, 'video', c.comm_video_min_usd, 'vip', c.comm_vip_min_usd),
    'chat_enabled', c.comm_chat_enabled)
  FROM s, c WHERE p_uid IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.bix_comm_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_comm_tier(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_comm_me() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT bix_comm_tier(auth.uid()); $$;
REVOKE ALL ON FUNCTION public.bix_comm_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_comm_me() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_start(p_callee uuid, p_kind text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid; t jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_callee IS NULL OR p_callee = me THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  IF p_kind NOT IN ('voice','video') THEN RAISE EXCEPTION 'Invalid call type'; END IF;
  t := bix_comm_tier(me);
  IF p_kind = 'voice' AND NOT (t->>'voice')::boolean THEN RAISE EXCEPTION 'Voice call needs at least $% active staking', t->'min'->>'voice'; END IF;
  IF p_kind = 'video' AND NOT (t->>'video')::boolean THEN RAISE EXCEPTION 'Video call needs at least $% active staking', t->'min'->>'video'; END IF;
  IF NOT bix_call_allowed(me, p_callee) THEN RAISE EXCEPTION 'This member does not accept calls from you'; END IF;
  IF (SELECT count(*) FROM bix_calls WHERE caller_id = me AND created_at > now() - interval '1 hour') >= 30 THEN RAISE EXCEPTION 'Too many calls, try again later'; END IF;
  UPDATE bix_calls SET status = 'missed', ended_at = now() WHERE status = 'ringing' AND created_at < now() - interval '45 seconds';
  INSERT INTO bix_calls (caller_id, callee_id, kind) VALUES (me, p_callee, p_kind) RETURNING id INTO cid;
  RETURN cid;
END $$;

CREATE TABLE public.bix_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX bix_messages_pair_idx ON public.bix_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX bix_messages_recipient_idx ON public.bix_messages (recipient_id, created_at DESC);
GRANT SELECT ON public.bix_messages TO authenticated;
GRANT ALL ON public.bix_messages TO service_role;
ALTER TABLE public.bix_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat participants read" ON public.bix_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE OR REPLACE FUNCTION public.bix_chat_send(p_to uuid, p_body text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); b text := trim(coalesce(p_body,'')); r bix_messages;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_to IS NULL OR p_to = me OR NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_to) THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  IF length(b) = 0 OR length(b) > 1000 THEN RAISE EXCEPTION 'Message must be 1-1000 characters'; END IF;
  IF NOT (bix_comm_tier(me)->>'chat')::boolean THEN RAISE EXCEPTION 'BIX CHAT is not available for your account'; END IF;
  IF NOT bix_call_allowed(me, p_to) AND NOT EXISTS (SELECT 1 FROM bix_messages WHERE sender_id = p_to AND recipient_id = me) THEN RAISE EXCEPTION 'This member does not accept messages from you'; END IF;
  IF (SELECT count(*) FROM bix_messages WHERE sender_id = me AND created_at > now() - interval '1 minute') >= 20 THEN RAISE EXCEPTION 'Too many messages, slow down'; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body) VALUES (me, p_to, b) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bix_chat_send(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_send(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_read(p_peer uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE bix_messages SET read_at = now() WHERE recipient_id = auth.uid() AND sender_id = p_peer AND read_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.bix_chat_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_threads() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (
    SELECT DISTINCT ON (peer) peer, body, created_at, sender_id
    FROM (SELECT CASE WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END AS peer, body, created_at, sender_id
          FROM bix_messages WHERE auth.uid() IN (sender_id, recipient_id)) x
    ORDER BY peer, created_at DESC)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('peer', m.peer, 'name', coalesce(nullif(p.username,''), p.full_name, 'Member'), 'body', m.body, 'at', m.created_at, 'mine', m.sender_id = auth.uid(),
     'unread', (SELECT count(*) FROM bix_messages u WHERE u.sender_id = m.peer AND u.recipient_id = auth.uid() AND u.read_at IS NULL)) ORDER BY m.created_at DESC), '[]'::jsonb)
  FROM m LEFT JOIN profiles p ON p.user_id = m.peer WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.bix_chat_threads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_threads() TO authenticated;