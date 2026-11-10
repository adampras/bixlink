CREATE OR REPLACE FUNCTION public.bix_support_inbox(p_op uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bix_support_operators WHERE user_id = p_op) THEN RAISE EXCEPTION 'Not an operator'; END IF;
  WITH m AS (
    SELECT CASE WHEN sender_id = p_op THEN recipient_id ELSE sender_id END AS peer, *
    FROM bix_messages WHERE (sender_id = p_op OR recipient_id = p_op) AND deleted_at IS NULL
  ), t AS (
    SELECT DISTINCT ON (peer) peer, body, kind, created_at, sender_id FROM m ORDER BY peer, created_at DESC
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'peer', t.peer, 'name', coalesce(p.username, p.full_name, 'Member'), 'last', left(coalesce(t.body, t.kind), 120),
    'at', t.created_at, 'mine', t.sender_id = p_op,
    'unread', (SELECT count(*) FROM bix_messages x WHERE x.sender_id = t.peer AND x.recipient_id = p_op AND x.read_at IS NULL AND x.deleted_at IS NULL),
    'network', CASE WHEN bix_growth_excluded(t.peer) THEN 'admin2' ELSE 'admin1' END
  ) ORDER BY t.created_at DESC), '[]'::jsonb) INTO res
  FROM t LEFT JOIN profiles p ON p.user_id = t.peer;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.bix_support_thread(p_op uuid, p_peer uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE res jsonb;
BEGIN
  IF NOT bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bix_support_operators WHERE user_id = p_op) THEN RAISE EXCEPTION 'Not an operator'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'mine', sender_id = p_op, 'body', coalesce(body, '['||kind||']'), 'at', created_at) ORDER BY created_at), '[]'::jsonb) INTO res
  FROM (SELECT * FROM bix_messages WHERE deleted_at IS NULL AND ((sender_id = p_op AND recipient_id = p_peer) OR (sender_id = p_peer AND recipient_id = p_op)) ORDER BY created_at DESC LIMIT 200) s;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.bix_support_reply(p_op uuid, p_peer uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b text := left(trim(coalesce(p_body,'')), 1000); r bix_messages;
BEGIN
  IF NOT bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM bix_support_operators WHERE user_id = p_op) THEN RAISE EXCEPTION 'Not an operator'; END IF;
  IF b = '' THEN RAISE EXCEPTION 'Message is empty'; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body, meta) VALUES (p_op, p_peer, b, jsonb_build_object('via','owner1_desk')) RETURNING * INTO r;
  UPDATE bix_messages SET read_at = now() WHERE sender_id = p_peer AND recipient_id = p_op AND read_at IS NULL;
  RETURN to_jsonb(r);
END $$;

REVOKE ALL ON FUNCTION public.bix_support_inbox(uuid), public.bix_support_thread(uuid,uuid), public.bix_support_reply(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_support_inbox(uuid), public.bix_support_thread(uuid,uuid), public.bix_support_reply(uuid,uuid,text) TO authenticated;