ALTER TABLE public.bixtok_lives ADD COLUMN IF NOT EXISTS pinned text, ADD COLUMN IF NOT EXISTS muted uuid[] NOT NULL DEFAULT '{}';

CREATE TABLE public.bixtok_stage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id uuid NOT NULL REFERENCES public.bixtok_lives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','left')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_id, user_id)
);
GRANT SELECT ON public.bixtok_stage_requests TO authenticated;
GRANT ALL ON public.bixtok_stage_requests TO service_role;
ALTER TABLE public.bixtok_stage_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage read" ON public.bixtok_stage_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_bix_admin() OR EXISTS (SELECT 1 FROM public.bixtok_lives l WHERE l.id = live_id AND (l.host_id = auth.uid() OR (l.status='live' AND bixtok_stage_requests.status='approved')))
);

CREATE OR REPLACE FUNCTION public.bixtok_stage_request(p_live uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host uuid; v_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT host_id INTO v_host FROM bixtok_lives WHERE id = p_live AND status = 'live';
  IF v_host IS NULL THEN RAISE EXCEPTION 'LIVE not active'; END IF;
  IF v_host = auth.uid() THEN RAISE EXCEPTION 'You are the host'; END IF;
  SELECT COALESCE(NULLIF(username,''),'member') INTO v_name FROM profiles WHERE user_id = auth.uid();
  INSERT INTO bixtok_stage_requests(live_id, user_id, name) VALUES (p_live, auth.uid(), COALESCE(v_name,'member'))
  ON CONFLICT (live_id, user_id) DO UPDATE SET status = CASE WHEN bixtok_stage_requests.status = 'approved' THEN 'approved' ELSE 'pending' END, created_at = now();
  RETURN 'pending';
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_stage_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_stage_decide(p_req uuid, p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r bixtok_stage_requests;
BEGIN
  IF p_status NOT IN ('approved','rejected','left') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO r FROM bixtok_stage_requests WHERE id = p_req;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF NOT (public.is_bix_admin() OR EXISTS (SELECT 1 FROM bixtok_lives WHERE id = r.live_id AND host_id = auth.uid()) OR (r.user_id = auth.uid() AND p_status = 'left')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_status = 'approved' AND (SELECT count(*) FROM bixtok_stage_requests WHERE live_id = r.live_id AND status = 'approved' AND id <> r.id) >= 3 THEN RAISE EXCEPTION 'Stage is full (max 3 guests)'; END IF;
  UPDATE bixtok_stage_requests SET status = p_status WHERE id = p_req;
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_stage_decide(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_live_pin(p_live uuid, p_text text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE bixtok_lives SET pinned = NULLIF(left(trim(coalesce(p_text,'')),160),'')
  WHERE id = p_live AND (host_id = auth.uid() OR public.is_bix_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_live_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_live_moderate(p_msg uuid, p_mute boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m bixtok_live_messages;
BEGIN
  SELECT * INTO m FROM bixtok_live_messages WHERE id = p_msg;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF NOT (public.is_bix_admin() OR EXISTS (SELECT 1 FROM bixtok_lives WHERE id = m.live_id AND host_id = auth.uid())) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF m.kind <> 'gift' THEN DELETE FROM bixtok_live_messages WHERE id = p_msg; END IF;
  IF p_mute THEN UPDATE bixtok_lives SET muted = array_append(array_remove(muted, m.user_id), m.user_id) WHERE id = m.live_id; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.bixtok_live_moderate(uuid, boolean) TO authenticated;

DROP POLICY IF EXISTS "bixtok msgs insert" ON public.bixtok_live_messages;
CREATE POLICY "bixtok msgs insert" ON public.bixtok_live_messages FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND kind = 'chat' AND EXISTS (SELECT 1 FROM public.bixtok_lives l WHERE l.id = live_id AND l.status = 'live' AND NOT (auth.uid() = ANY(l.muted)))
);

CREATE OR REPLACE FUNCTION public.bixtok_live_top(p_live uuid) RETURNS TABLE(name text, currency text, total numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.username,''),'member'), t.currency, SUM(t.amount)
  FROM bixtok_gift_tx t LEFT JOIN profiles p ON p.user_id = t.sender_id
  WHERE t.live_id = p_live AND auth.uid() IS NOT NULL
  GROUP BY 1, 2, t.sender_id ORDER BY (t.currency = 'BIX') DESC, SUM(t.amount) DESC LIMIT 3
$$;
GRANT EXECUTE ON FUNCTION public.bixtok_live_top(uuid) TO authenticated;