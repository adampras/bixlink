ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS call_permission text NOT NULL DEFAULT 'all';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_public boolean NOT NULL DEFAULT false;

CREATE TABLE public.bix_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz
);
CREATE INDEX bix_calls_callee_idx ON public.bix_calls (callee_id, status, created_at DESC);
CREATE INDEX bix_calls_caller_idx ON public.bix_calls (caller_id, created_at DESC);
GRANT SELECT ON public.bix_calls TO authenticated;
GRANT ALL ON public.bix_calls TO service_role;
ALTER TABLE public.bix_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call participants read" ON public.bix_calls FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE OR REPLACE FUNCTION public.bix_call_allowed(p_caller uuid, p_callee uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE perm text;
BEGIN
  SELECT call_permission INTO perm FROM profiles WHERE user_id = p_callee;
  IF perm IS NULL OR perm = 'none' THEN RETURN false; END IF;
  IF perm = 'all' THEN RETURN true; END IF;
  IF perm = 'friends' THEN
    RETURN EXISTS (SELECT 1 FROM bixtok_follows a JOIN bixtok_follows b ON b.follower_id = a.followee_id AND b.followee_id = a.follower_id WHERE a.follower_id = p_caller AND a.followee_id = p_callee);
  END IF;
  IF perm = 'network' THEN
    RETURN bix_network_is_descendant(p_caller, p_callee) OR bix_network_is_descendant(p_callee, p_caller);
  END IF;
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.bix_call_allowed(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_allowed(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_start(p_callee uuid, p_kind text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_callee IS NULL OR p_callee = me THEN RAISE EXCEPTION 'Invalid contact'; END IF;
  IF p_kind NOT IN ('voice','video') THEN RAISE EXCEPTION 'Invalid call type'; END IF;
  IF NOT bix_call_allowed(me, p_callee) THEN RAISE EXCEPTION 'This member does not accept calls from you'; END IF;
  IF (SELECT count(*) FROM bix_calls WHERE caller_id = me AND created_at > now() - interval '1 hour') >= 30 THEN RAISE EXCEPTION 'Too many calls, try again later'; END IF;
  UPDATE bix_calls SET status = 'missed', ended_at = now() WHERE status = 'ringing' AND created_at < now() - interval '45 seconds';
  INSERT INTO bix_calls (caller_id, callee_id, kind) VALUES (me, p_callee, p_kind) RETURNING id INTO cid;
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.bix_call_start(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_start(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_set(p_id uuid, p_status text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); c bix_calls;
BEGIN
  SELECT * INTO c FROM bix_calls WHERE id = p_id FOR UPDATE;
  IF c.id IS NULL OR (me <> c.caller_id AND me <> c.callee_id) THEN RAISE EXCEPTION 'Call not found'; END IF;
  IF p_status = 'accepted' THEN
    IF me <> c.callee_id OR c.status <> 'ringing' THEN RAISE EXCEPTION 'Call no longer available'; END IF;
    UPDATE bix_calls SET status = 'accepted', answered_at = now() WHERE id = p_id;
  ELSIF p_status = 'declined' THEN
    IF me <> c.callee_id OR c.status <> 'ringing' THEN RETURN c.status; END IF;
    UPDATE bix_calls SET status = 'declined', ended_at = now() WHERE id = p_id;
  ELSIF p_status = 'ended' THEN
    IF c.status IN ('ended','declined','missed') THEN RETURN c.status; END IF;
    UPDATE bix_calls SET status = CASE WHEN c.status = 'ringing' THEN 'missed' ELSE 'ended' END, ended_at = now() WHERE id = p_id;
  ELSE RAISE EXCEPTION 'Invalid status'; END IF;
  RETURN (SELECT status FROM bix_calls WHERE id = p_id);
END $$;
REVOKE ALL ON FUNCTION public.bix_call_set(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_set(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_peer(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('user_id', p.user_id, 'name', coalesce(nullif(p.username,''), p.full_name),
    'whatsapp', CASE WHEN p.whatsapp_public OR p.user_id = auth.uid() THEN p.whatsapp END,
    'can_call', auth.uid() IS NOT NULL AND p.user_id <> auth.uid() AND bix_call_allowed(auth.uid(), p.user_id))
  FROM profiles p WHERE p.user_id = p_user AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.bix_call_peer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_peer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_find(p_query text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF auth.uid() IS NULL OR length(trim(coalesce(p_query,''))) < 3 THEN RETURN NULL; END IF;
  SELECT user_id INTO uid FROM referral_codes WHERE upper(code) = upper(trim(p_query)) LIMIT 1;
  IF uid IS NULL THEN SELECT user_id INTO uid FROM profiles WHERE lower(username) = lower(trim(both '@' from trim(p_query))) LIMIT 1; END IF;
  IF uid IS NULL THEN RETURN NULL; END IF;
  RETURN bix_call_peer(uid);
END $$;
REVOKE ALL ON FUNCTION public.bix_call_find(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_find(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_settings() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('permission', call_permission, 'whatsapp', whatsapp, 'whatsapp_public', whatsapp_public) FROM profiles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.bix_call_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_call_settings_save(p_permission text, p_whatsapp text, p_public boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wa text := nullif(regexp_replace(coalesce(p_whatsapp,''), '[^0-9+]', '', 'g'), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_permission NOT IN ('all','friends','network','none') THEN RAISE EXCEPTION 'Invalid permission'; END IF;
  IF wa IS NOT NULL AND wa !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'Use international format, e.g. +628123456789'; END IF;
  UPDATE profiles SET call_permission = p_permission, whatsapp = coalesce(wa, whatsapp), whatsapp_public = coalesce(p_public, false) WHERE user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.bix_call_settings_save(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_settings_save(text, text, boolean) TO authenticated;