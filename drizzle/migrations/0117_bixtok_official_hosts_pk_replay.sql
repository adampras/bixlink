ALTER TABLE public.bixtok_config
  ADD COLUMN IF NOT EXISTS auto_follow_back boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS replay_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS soundboard boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pk_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS showcase_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pk_bix_weight numeric NOT NULL DEFAULT 100;

ALTER TABLE public.bixtok_lives
  ADD COLUMN IF NOT EXISTS showcase text,
  ADD COLUMN IF NOT EXISTS pk jsonb;

-- Official LIVE broadcaster accounts (managed by Owner 1)
CREATE TABLE public.bixtok_official_hosts (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bixtok_official_hosts TO authenticated;
GRANT ALL ON public.bixtok_official_hosts TO service_role;
ALTER TABLE public.bixtok_official_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "official hosts read own or admin" ON public.bixtok_official_hosts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bixtok_is_official(p_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_uid IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.bixtok_official_hosts WHERE user_id = p_uid)
    OR (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_uid AND role = 'admin')
        AND EXISTS (SELECT 1 FROM auth.users WHERE id = p_uid AND lower(email) = 'bixdevpras@gmail.com' AND email_confirmed_at IS NOT NULL)))
$$;
REVOKE ALL ON FUNCTION public.bixtok_is_official(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_is_official(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_am_official() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.bixtok_is_official(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.bixtok_am_official() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_am_official() TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_official_add(p_code text, p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Only Owner 1 can manage official LIVE accounts'; END IF;
  SELECT user_id INTO v_uid FROM public.referral_codes WHERE code = upper(trim(p_code));
  IF v_uid IS NULL THEN SELECT user_id INTO v_uid FROM public.profiles WHERE lower(username) = lower(trim(p_code)) LIMIT 1; END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid) THEN RAISE EXCEPTION 'Clone accounts cannot be official hosts'; END IF;
  SELECT COALESCE(NULLIF(left(trim(p_name),40),''), NULLIF(username,''), 'BIXLINK OFFICIAL') INTO v_name FROM public.profiles WHERE user_id = v_uid;
  INSERT INTO public.bixtok_official_hosts(user_id, display_name, added_by) VALUES (v_uid, COALESCE(v_name,'BIXLINK OFFICIAL'), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;
  RETURN v_uid;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_official_add(text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_official_add(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_official_remove(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Only Owner 1 can manage official LIVE accounts'; END IF;
  DELETE FROM public.bixtok_official_hosts WHERE user_id = p_user;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_official_remove(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_official_remove(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_start_official_live(p_title text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_title text; v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.bixtok_is_official(auth.uid()) THEN RAISE EXCEPTION 'Only official LIVE accounts can start an official broadcast'; END IF;
  v_title := COALESCE(NULLIF(left(trim(p_title),80),''),'BIXLINK Official Presentation');
  SELECT display_name INTO v_name FROM public.bixtok_official_hosts WHERE user_id = auth.uid();
  UPDATE public.bixtok_lives SET status = 'ended', ended_at = now() WHERE host_id = auth.uid() AND status = 'live';
  INSERT INTO public.bixtok_lives(host_id, host_name, title, kind) VALUES (auth.uid(), COALESCE(v_name,'BIXLINK OFFICIAL'), v_title, 'official') RETURNING id INTO v_id;
  INSERT INTO public.bix_announcements(title, body, category, published_at)
  VALUES ('🔴 OFFICIAL LIVE: ' || v_title, COALESCE(v_name,'BIXLINK') || ' is broadcasting live on BIXTOK now. Open BIXTOK → LIVE to join the presentation.', 'LIVE', now());
  UPDATE public.bixtok_live_schedules SET status = 'started' WHERE status = 'scheduled' AND starts_at < now() + interval '2 hours' AND starts_at > now() - interval '6 hours';
  RETURN v_id;
END $$;

-- Auto follow-back: official accounts follow members back automatically when the switch is on
CREATE OR REPLACE FUNCTION public.bixtok_auto_follow_back() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE((SELECT auto_follow_back FROM public.bixtok_config WHERE id = 1), false)
     AND public.bixtok_is_official(NEW.followee_id) THEN
    INSERT INTO public.bixtok_follows(follower_id, followee_id) VALUES (NEW.followee_id, NEW.follower_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bixtok_follows_auto_back AFTER INSERT ON public.bixtok_follows FOR EACH ROW EXECUTE FUNCTION public.bixtok_auto_follow_back();

-- Close the open follow list: members only see their own follow rows
DROP POLICY IF EXISTS "bixtok follows read" ON public.bixtok_follows;
CREATE POLICY "bixtok follows read own" ON public.bixtok_follows FOR SELECT TO authenticated USING (follower_id = auth.uid() OR followee_id = auth.uid() OR public.is_bix_admin());

-- Official LIVE schedule + reminders
CREATE TABLE public.bixtok_live_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  host_name text NOT NULL DEFAULT 'BIXLINK OFFICIAL',
  starts_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','started','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bixtok_live_schedules TO authenticated;
GRANT ALL ON public.bixtok_live_schedules TO service_role;
ALTER TABLE public.bixtok_live_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules read" ON public.bixtok_live_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedules official insert" ON public.bixtok_live_schedules FOR INSERT TO authenticated WITH CHECK (public.bixtok_is_official(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "schedules official update" ON public.bixtok_live_schedules FOR UPDATE TO authenticated USING (public.bixtok_is_official(auth.uid())) WITH CHECK (public.bixtok_is_official(auth.uid()));
CREATE POLICY "schedules official delete" ON public.bixtok_live_schedules FOR DELETE TO authenticated USING (public.bixtok_is_official(auth.uid()));

CREATE TABLE public.bixtok_live_reminders (
  schedule_id uuid NOT NULL REFERENCES public.bixtok_live_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.bixtok_live_reminders TO authenticated;
GRANT ALL ON public.bixtok_live_reminders TO service_role;
ALTER TABLE public.bixtok_live_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders own read" ON public.bixtok_live_reminders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "reminders own insert" ON public.bixtok_live_reminders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reminders own delete" ON public.bixtok_live_reminders FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bixtok_reminder_counts() RETURNS TABLE(schedule_id uuid, n bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.schedule_id, count(*) FROM public.bixtok_live_reminders r JOIN public.bixtok_live_schedules s ON s.id = r.schedule_id
  WHERE s.status = 'scheduled' GROUP BY r.schedule_id
$$;
REVOKE ALL ON FUNCTION public.bixtok_reminder_counts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_reminder_counts() TO authenticated;

-- Pinned showcase card (host only)
CREATE OR REPLACE FUNCTION public.bixtok_live_showcase(p_live uuid, p_key text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_key IS NOT NULL AND p_key NOT IN ('staking','presale','nft','shop','booster') THEN RAISE EXCEPTION 'Unknown showcase'; END IF;
  UPDATE public.bixtok_lives SET showcase = p_key WHERE id = p_live AND status = 'live' AND (host_id = auth.uid() OR public.is_bix_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the host can change the showcase'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_live_showcase(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_live_showcase(uuid,text) TO authenticated;

-- PK battle between host and stage guests (display-only score from recorded gifts)
CREATE OR REPLACE FUNCTION public.bixtok_pk_start(p_live uuid, p_a uuid, p_b uuid, p_minutes int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_host uuid; v_pk jsonb; v_min int := LEAST(30, GREATEST(1, COALESCE(p_minutes, 5)));
BEGIN
  IF NOT COALESCE((SELECT pk_enabled FROM public.bixtok_config WHERE id = 1), true) THEN RAISE EXCEPTION 'PK battle is closed'; END IF;
  SELECT host_id INTO v_host FROM public.bixtok_lives WHERE id = p_live AND status = 'live';
  IF v_host IS NULL OR (v_host <> auth.uid() AND NOT public.is_bix_admin()) THEN RAISE EXCEPTION 'Only the host can start a PK battle'; END IF;
  IF p_a IS NULL OR p_b IS NULL OR p_a = p_b THEN RAISE EXCEPTION 'Pick two different players'; END IF;
  IF (p_a <> v_host AND NOT EXISTS (SELECT 1 FROM public.bixtok_stage_requests WHERE live_id = p_live AND user_id = p_a AND status = 'approved'))
     OR (p_b <> v_host AND NOT EXISTS (SELECT 1 FROM public.bixtok_stage_requests WHERE live_id = p_live AND user_id = p_b AND status = 'approved')) THEN
    RAISE EXCEPTION 'Both players must be the host or on stage';
  END IF;
  v_pk := jsonb_build_object('a', p_a, 'b', p_b, 'started_at', now(), 'ends_at', now() + make_interval(mins => v_min));
  UPDATE public.bixtok_lives SET pk = v_pk WHERE id = p_live;
  RETURN v_pk;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_pk_start(uuid,uuid,uuid,int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_pk_start(uuid,uuid,uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_pk_end(p_live uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bixtok_lives SET pk = NULL WHERE id = p_live AND (host_id = auth.uid() OR public.is_bix_admin());
END $$;
REVOKE ALL ON FUNCTION public.bixtok_pk_end(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_pk_end(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_pk_score(p_live uuid) RETURNS TABLE(a_score numeric, b_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH l AS (SELECT pk FROM public.bixtok_lives WHERE id = p_live AND pk IS NOT NULL),
  w AS (SELECT COALESCE(pk_bix_weight, 100) AS bw FROM public.bixtok_config WHERE id = 1),
  g AS (
    SELECT t.recipient_id, SUM(CASE WHEN t.currency = 'BIX' THEN t.amount * (SELECT bw FROM w) ELSE t.amount END) AS pts
    FROM public.bixtok_gift_tx t, l
    WHERE t.live_id = p_live AND t.created_at >= (l.pk->>'started_at')::timestamptz AND t.created_at <= (l.pk->>'ends_at')::timestamptz
    GROUP BY t.recipient_id)
  SELECT COALESCE((SELECT pts FROM g WHERE recipient_id = (l.pk->>'a')::uuid), 0),
         COALESCE((SELECT pts FROM g WHERE recipient_id = (l.pk->>'b')::uuid), 0)
  FROM l
$$;
REVOKE ALL ON FUNCTION public.bixtok_pk_score(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_pk_score(uuid) TO authenticated;

-- LIVE replay: host publishes its own recorded parts into the feed
CREATE OR REPLACE FUNCTION public.bixtok_publish_replay(p_live uuid, p_path text, p_part int) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.bixtok_lives; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((SELECT replay_enabled FROM public.bixtok_config WHERE id = 1), true) THEN RAISE EXCEPTION 'LIVE replay is closed'; END IF;
  SELECT * INTO l FROM public.bixtok_lives WHERE id = p_live;
  IF l.id IS NULL OR l.host_id <> auth.uid() THEN RAISE EXCEPTION 'Only the host can publish this replay'; END IF;
  IF p_path IS NULL OR split_part(p_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid media'; END IF;
  IF (SELECT count(*) FROM public.bixtok_videos WHERE creator_id = auth.uid() AND overlay = 'REPLAY' AND created_at > now() - interval '1 day') >= 30 THEN RAISE EXCEPTION 'Daily replay limit reached'; END IF;
  INSERT INTO public.bixtok_videos(creator_id, creator_name, caption, video_url, media_path, media_kind, filter, overlay, allow_gifts, sort, source_kind)
  VALUES (auth.uid(), l.host_name, left('🔴 REPLAY · ' || l.title || CASE WHEN COALESCE(p_part,1) > 1 THEN ' (part ' || p_part || ')' ELSE '' END, 300),
    'https://bixlink.com/bixtok', p_path, 'video', 'none', 'REPLAY', true, 0, 'file')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_publish_replay(uuid,text,int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_publish_replay(uuid,text,int) TO authenticated;