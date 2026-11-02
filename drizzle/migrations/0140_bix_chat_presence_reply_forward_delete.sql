ALTER TABLE public.bix_messages
  ADD COLUMN IF NOT EXISTS reply_to uuid,
  ADD COLUMN IF NOT EXISTS reply_body text,
  ADD COLUMN IF NOT EXISTS forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by uuid[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.bix_chat_presence (
  user_id uuid PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now(),
  typing_to uuid,
  typing_at timestamptz
);
GRANT ALL ON public.bix_chat_presence TO service_role;
ALTER TABLE public.bix_chat_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bix chat delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bix-chat' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.bix_chat_reply_snip(p_me uuid, p_peer uuid, p_reply uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN m.deleted_at IS NOT NULL THEN 'Pesan dihapus' ELSE left(m.body, 120) END
  FROM bix_messages m WHERE m.id = p_reply
    AND ((m.sender_id = p_me AND m.recipient_id = p_peer) OR (m.sender_id = p_peer AND m.recipient_id = p_me));
$$;
REVOKE EXECUTE ON FUNCTION public.bix_chat_reply_snip(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.bix_chat_send(uuid, text);
CREATE FUNCTION public.bix_chat_send(p_to uuid, p_body text, p_reply uuid DEFAULT NULL, p_forwarded boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); b text := left(trim(coalesce(p_body,'')), 1000); r bix_messages; snip text;
BEGIN
  PERFORM bix_chat_guard(me, p_to);
  IF b = '' THEN RAISE EXCEPTION 'Message is empty'; END IF;
  IF p_reply IS NOT NULL THEN snip := bix_chat_reply_snip(me, p_to, p_reply); IF snip IS NULL THEN RAISE EXCEPTION 'Invalid reply'; END IF; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body, reply_to, reply_body, forwarded)
  VALUES (me, p_to, b, p_reply, snip, coalesce(p_forwarded,false)) RETURNING * INTO r;
  UPDATE bix_chat_presence SET typing_to = NULL WHERE user_id = me;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bix_chat_send(uuid, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_send(uuid, text, uuid, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.bix_chat_send_media(uuid, text, text, text);
CREATE FUNCTION public.bix_chat_send_media(p_to uuid, p_kind text, p_path text, p_body text DEFAULT '', p_reply uuid DEFAULT NULL, p_forwarded boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages; b text := left(trim(coalesce(p_body,'')), 300); snip text;
BEGIN
  PERFORM bix_chat_guard(me, p_to);
  IF p_kind NOT IN ('image','voice') THEN RAISE EXCEPTION 'Invalid attachment type'; END IF;
  IF p_path IS NULL OR p_path NOT LIKE me::text || '/' || p_to::text || '/%' OR p_path LIKE '%..%' THEN RAISE EXCEPTION 'Invalid attachment'; END IF;
  IF p_reply IS NOT NULL THEN snip := bix_chat_reply_snip(me, p_to, p_reply); IF snip IS NULL THEN RAISE EXCEPTION 'Invalid reply'; END IF; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body, kind, media_path, reply_to, reply_body, forwarded)
  VALUES (me, p_to, CASE WHEN b <> '' THEN b WHEN p_kind = 'image' THEN '📷 Foto' ELSE '🎤 Pesan suara' END, p_kind, p_path, p_reply, snip, coalesce(p_forwarded,false)) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.bix_chat_send_media(uuid, text, text, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_send_media(uuid, text, text, text, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_delete(p_id uuid, p_everyone boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); m bix_messages; old_path text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO m FROM bix_messages WHERE id = p_id AND me IN (sender_id, recipient_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF coalesce(p_everyone,false) THEN
    IF m.sender_id <> me THEN RAISE EXCEPTION 'Only the sender can delete for everyone'; END IF;
    IF m.kind = 'pay' THEN RAISE EXCEPTION 'BIX PAY receipts cannot be deleted'; END IF;
    old_path := m.media_path;
    UPDATE bix_messages SET deleted_at = now(), body = 'Pesan dihapus', media_path = NULL, kind = 'text', meta = NULL WHERE id = p_id;
    RETURN jsonb_build_object('ok', true, 'path', old_path);
  END IF;
  UPDATE bix_messages SET hidden_by = array_append(hidden_by, me) WHERE id = p_id AND NOT (me = ANY(hidden_by));
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.bix_chat_delete(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_delete(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_sync(p_peer uuid DEFAULT NULL, p_typing boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); pr bix_chat_presence; linked boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO bix_chat_presence (user_id, last_seen, typing_to, typing_at)
  VALUES (me, now(), CASE WHEN p_typing THEN p_peer END, CASE WHEN p_typing THEN now() END)
  ON CONFLICT (user_id) DO UPDATE SET last_seen = now(),
    typing_to = CASE WHEN p_typing THEN p_peer END,
    typing_at = CASE WHEN p_typing THEN now() ELSE bix_chat_presence.typing_at END;
  IF p_peer IS NULL OR p_peer = me THEN RETURN jsonb_build_object('ok', true); END IF;
  linked := EXISTS (SELECT 1 FROM bix_messages WHERE (sender_id = me AND recipient_id = p_peer) OR (sender_id = p_peer AND recipient_id = me))
            OR bix_call_allowed(me, p_peer);
  IF NOT linked THEN RETURN jsonb_build_object('ok', true); END IF;
  SELECT * INTO pr FROM bix_chat_presence WHERE user_id = p_peer;
  RETURN jsonb_build_object('ok', true,
    'online', coalesce(pr.last_seen > now() - interval '30 seconds', false),
    'last_seen', pr.last_seen,
    'typing', coalesce(pr.typing_to = me AND pr.typing_at > now() - interval '6 seconds', false));
END $$;
REVOKE ALL ON FUNCTION public.bix_chat_sync(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_sync(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_threads() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (
    SELECT DISTINCT ON (peer) peer, body, created_at, sender_id
    FROM (SELECT CASE WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END AS peer, body, created_at, sender_id
          FROM bix_messages WHERE auth.uid() IN (sender_id, recipient_id) AND NOT (auth.uid() = ANY(hidden_by))) x
    ORDER BY peer, created_at DESC)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('peer', m.peer, 'name', coalesce(nullif(p.username,''), p.full_name, 'Member'), 'body', m.body, 'at', m.created_at, 'mine', m.sender_id = auth.uid(),
     'online', coalesce((SELECT last_seen > now() - interval '30 seconds' FROM bix_chat_presence WHERE user_id = m.peer), false),
     'unread', (SELECT count(*) FROM bix_messages u WHERE u.sender_id = m.peer AND u.recipient_id = auth.uid() AND u.read_at IS NULL AND u.deleted_at IS NULL)) ORDER BY m.created_at DESC), '[]'::jsonb)
  FROM m LEFT JOIN profiles p ON p.user_id = m.peer WHERE auth.uid() IS NOT NULL;
$$;