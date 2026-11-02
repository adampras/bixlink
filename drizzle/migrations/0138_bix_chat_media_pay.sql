ALTER TABLE public.bix_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text', ADD COLUMN IF NOT EXISTS media_path text, ADD COLUMN IF NOT EXISTS meta jsonb;

CREATE POLICY "bix chat upload own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bix-chat' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bix chat read participants" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bix-chat' AND auth.uid()::text IN ((storage.foldername(name))[1], (storage.foldername(name))[2]));

CREATE OR REPLACE FUNCTION public.bix_chat_guard(p_me uuid, p_to uuid) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_to IS NULL OR p_to = p_me OR NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = p_to) THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  IF NOT (bix_comm_tier(p_me)->>'chat')::boolean THEN RAISE EXCEPTION 'BIX CHAT is not available for your account'; END IF;
  IF NOT bix_call_allowed(p_me, p_to) AND NOT EXISTS (SELECT 1 FROM bix_messages WHERE sender_id = p_to AND recipient_id = p_me) THEN RAISE EXCEPTION 'This member does not accept messages from you'; END IF;
  IF (SELECT count(*) FROM bix_messages WHERE sender_id = p_me AND created_at > now() - interval '1 minute') >= 20 THEN RAISE EXCEPTION 'Too many messages, slow down'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_chat_guard(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_send_media(p_to uuid, p_kind text, p_path text, p_body text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); r bix_messages; b text := left(trim(coalesce(p_body,'')), 300);
BEGIN
  PERFORM bix_chat_guard(me, p_to);
  IF p_kind NOT IN ('image','voice') THEN RAISE EXCEPTION 'Invalid attachment type'; END IF;
  IF p_path IS NULL OR p_path NOT LIKE me::text || '/' || p_to::text || '/%' OR p_path LIKE '%..%' THEN RAISE EXCEPTION 'Invalid attachment'; END IF;
  INSERT INTO bix_messages (sender_id, recipient_id, body, kind, media_path)
  VALUES (me, p_to, CASE WHEN b <> '' THEN b WHEN p_kind = 'image' THEN '📷 Foto' ELSE '🎤 Pesan suara' END, p_kind, p_path) RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;
GRANT EXECUTE ON FUNCTION public.bix_chat_send_media(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_chat_pay(p_to uuid, p_amount numeric, p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); v_code text; v_tx uuid; r bix_messages;
BEGIN
  PERFORM bix_chat_guard(me, p_to);
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_to;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Recipient has no member code yet'; END IF;
  v_tx := bix_pay_send(v_code, p_amount, p_note);
  INSERT INTO bix_messages (sender_id, recipient_id, body, kind, meta)
  VALUES (me, p_to, '🪙 BIX PAY ' || trim(to_char(p_amount, 'FM999G999G990D####')) || ' BIX', 'pay',
          jsonb_build_object('transfer_id', v_tx, 'amount', p_amount, 'note', NULLIF(left(trim(coalesce(p_note,'')),120),'')))
  RETURNING * INTO r;
  RETURN to_jsonb(r);
END $$;
GRANT EXECUTE ON FUNCTION public.bix_chat_pay(uuid, numeric, text) TO authenticated;