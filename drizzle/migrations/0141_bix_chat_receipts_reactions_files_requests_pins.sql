ALTER TABLE public.bix_messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.bix_messages ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.bix_messages ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE public.bix_messages ADD COLUMN IF NOT EXISTS pinned_by uuid;

CREATE OR REPLACE FUNCTION public.bix_chat_delivered()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE bix_messages SET delivered_at = now() WHERE recipient_id = auth.uid() AND delivered_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.bix_chat_read(p_peer uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE bix_messages SET read_at = now(), delivered_at = coalesce(delivered_at, now())
  WHERE recipient_id = auth.uid() AND sender_id = p_peer AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.bix_chat_react(p_id uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_emoji IS NOT NULL AND p_emoji NOT IN ('👍','❤️','😂','😮','🙏','🔥') THEN RAISE EXCEPTION 'Invalid reaction'; END IF;
  SELECT * INTO r FROM bix_messages WHERE id = p_id AND (sender_id = me OR recipient_id = me) AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  UPDATE bix_messages SET reactions = CASE WHEN p_emoji IS NULL OR reactions->>me::text = p_emoji
      THEN reactions - me::text ELSE reactions || jsonb_build_object(me::text, p_emoji) END
  WHERE id = p_id RETURNING * INTO r;
  RETURN r.reactions;
END $$;

CREATE OR REPLACE FUNCTION public.bix_chat_pin(p_id uuid, p_pin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages;
BEGIN
  SELECT * INTO r FROM bix_messages WHERE id = p_id AND (sender_id = me OR recipient_id = me) AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF p_pin THEN
    UPDATE bix_messages SET pinned_at = NULL, pinned_by = NULL
    WHERE pinned_at IS NOT NULL AND ((sender_id = r.sender_id AND recipient_id = r.recipient_id) OR (sender_id = r.recipient_id AND recipient_id = r.sender_id));
    UPDATE bix_messages SET pinned_at = now(), pinned_by = me WHERE id = p_id;
  ELSE
    UPDATE bix_messages SET pinned_at = NULL, pinned_by = NULL WHERE id = p_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bix_chat_send_file(p_to uuid, p_path text, p_name text, p_size bigint, p_mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages; n text := left(regexp_replace(coalesce(p_name,'Dokumen'), '[\r\n/\\]', '', 'g'), 120);
BEGIN
  PERFORM bix_chat_guard(me, p_to);
  IF p_path IS NULL OR p_path NOT LIKE me::text || '/' || p_to::text || '/%' OR p_path LIKE '%..%' THEN RAISE EXCEPTION 'Invalid attachment'; END IF;
  IF p_size IS NULL OR p_size <= 0 OR p_size > 10485760 THEN RAISE EXCEPTION 'File maksimal 10 MB'; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body, kind, media_path, meta)
  VALUES (me, p_to, '📄 ' || n, 'file', p_path, jsonb_build_object('name', n, 'size', p_size, 'mime', left(coalesce(p_mime,''),100)))
  RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.bix_chat_request(p_to uuid, p_amount numeric, p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages;
BEGIN
  PERFORM bix_chat_guard(me, p_to);
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN RAISE EXCEPTION 'Jumlah BIX tidak valid'; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body, kind, meta)
  VALUES (me, p_to, '🧾 Minta ' || trim(to_char(p_amount, 'FM999G999G990D####')) || ' BIX', 'request',
    jsonb_build_object('amount', p_amount, 'note', NULLIF(left(trim(coalesce(p_note,'')),120),''), 'status', 'open'))
  RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.bix_chat_request_act(p_id uuid, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages; v_code text; v_tx uuid; amt numeric; pm bix_messages;
BEGIN
  SELECT * INTO r FROM bix_messages WHERE id = p_id AND kind = 'request' AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tagihan tidak ditemukan'; END IF;
  IF r.meta->>'status' <> 'open' THEN RAISE EXCEPTION 'Tagihan sudah diproses'; END IF;
  IF p_action = 'cancel' THEN
    IF r.sender_id <> me THEN RAISE EXCEPTION 'Not allowed'; END IF;
    UPDATE bix_messages SET meta = meta || '{"status":"cancelled"}' WHERE id = p_id;
    RETURN jsonb_build_object('status','cancelled');
  ELSIF p_action = 'decline' THEN
    IF r.recipient_id <> me THEN RAISE EXCEPTION 'Not allowed'; END IF;
    UPDATE bix_messages SET meta = meta || '{"status":"declined"}' WHERE id = p_id;
    RETURN jsonb_build_object('status','declined');
  ELSIF p_action = 'pay' THEN
    IF r.recipient_id <> me THEN RAISE EXCEPTION 'Not allowed'; END IF;
    PERFORM bix_chat_guard(me, r.sender_id);
    amt := (r.meta->>'amount')::numeric;
    SELECT code INTO v_code FROM referral_codes WHERE user_id = r.sender_id;
    IF v_code IS NULL THEN RAISE EXCEPTION 'Recipient has no member code yet'; END IF;
    v_tx := bix_pay_send(v_code, amt, coalesce(r.meta->>'note', 'Tagihan BIX CALL'));
    UPDATE bix_messages SET meta = meta || jsonb_build_object('status','paid','transfer_id',v_tx,'paid_at',now()) WHERE id = p_id;
    INSERT INTO bix_messages (sender_id, recipient_id, body, kind, meta, reply_to, reply_body)
    VALUES (me, r.sender_id, '🪙 BIX PAY ' || trim(to_char(amt, 'FM999G999G990D####')) || ' BIX', 'pay',
      jsonb_build_object('transfer_id', v_tx, 'amount', amt, 'note', 'Pembayaran tagihan'), r.id, left(r.body,120))
    RETURNING * INTO pm;
    RETURN to_jsonb(pm);
  END IF;
  RAISE EXCEPTION 'Invalid action';
END $$;

REVOKE ALL ON FUNCTION public.bix_chat_delivered(), public.bix_chat_react(uuid,text), public.bix_chat_pin(uuid,boolean), public.bix_chat_send_file(uuid,text,text,bigint,text), public.bix_chat_request(uuid,numeric,text), public.bix_chat_request_act(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_chat_delivered(), public.bix_chat_react(uuid,text), public.bix_chat_pin(uuid,boolean), public.bix_chat_send_file(uuid,text,text,bigint,text), public.bix_chat_request(uuid,numeric,text), public.bix_chat_request_act(uuid,text) TO authenticated;