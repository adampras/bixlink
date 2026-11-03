ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path text, ADD COLUMN IF NOT EXISTS status_text text, ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

CREATE TABLE public.bix_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','photo','video')),
  media_path text,
  caption text CHECK (caption IS NULL OR length(caption) <= 200),
  bg text NOT NULL DEFAULT 'gold',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX bix_stories_user_idx ON public.bix_stories (user_id, expires_at DESC);
CREATE INDEX bix_stories_exp_idx ON public.bix_stories (expires_at);
GRANT SELECT ON public.bix_stories TO authenticated;
GRANT ALL ON public.bix_stories TO service_role;
ALTER TABLE public.bix_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stories read" ON public.bix_stories FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.bix_story_views (
  story_id uuid NOT NULL REFERENCES public.bix_stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
GRANT ALL ON public.bix_story_views TO service_role;
ALTER TABLE public.bix_story_views ENABLE ROW LEVEL SECURITY;

-- Who may see whose story: self, chat contacts, network up/downline, mutual BIXTOK follows
CREATE OR REPLACE FUNCTION public.bix_story_can_view(p_viewer uuid, p_author uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_viewer IS NOT NULL AND (
    p_viewer = p_author
    OR EXISTS (SELECT 1 FROM bix_messages WHERE (sender_id = p_viewer AND recipient_id = p_author) OR (sender_id = p_author AND recipient_id = p_viewer))
    OR EXISTS (SELECT 1 FROM bixtok_follows a JOIN bixtok_follows b ON b.follower_id = a.followee_id AND b.followee_id = a.follower_id WHERE a.follower_id = p_viewer AND a.followee_id = p_author)
    OR bix_network_is_descendant(p_viewer, p_author) OR bix_network_is_descendant(p_author, p_viewer)
  );
$$;

CREATE OR REPLACE FUNCTION public.bix_story_can_view_path(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM bix_stories s WHERE s.media_path = p_name AND s.expires_at > now() AND bix_story_can_view(auth.uid(), s.user_id));
$$;

-- Storage policies
CREATE POLICY "bix avatars read members" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bix-avatars');
CREATE POLICY "bix avatars upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bix-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bix avatars delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bix-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bix stories read allowed" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bix-stories' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.bix_story_can_view_path(name)));
CREATE POLICY "bix stories upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bix-stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bix stories delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bix-stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Profile photo + status
CREATE OR REPLACE FUNCTION public.bix_profile_me()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('user_id', user_id, 'name', coalesce(nullif(username,''), full_name, 'Member'), 'avatar_path', avatar_path, 'status_text', status_text, 'status_updated_at', status_updated_at)
  FROM profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.bix_profile_set_avatar(p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_path IS NOT NULL AND (p_path NOT LIKE auth.uid()::text || '/%' OR length(p_path) > 200) THEN RAISE EXCEPTION 'Invalid photo'; END IF;
  UPDATE profiles SET avatar_path = p_path WHERE user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.bix_profile_set_status(p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text := nullif(btrim(coalesce(p_status,'')), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF t IS NOT NULL AND length(t) > 80 THEN RAISE EXCEPTION 'Status maksimal 80 karakter'; END IF;
  UPDATE profiles SET status_text = t, status_updated_at = CASE WHEN t IS NULL THEN NULL ELSE now() END WHERE user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.bix_profile_card(p_user uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('user_id', p.user_id, 'name', coalesce(nullif(p.username,''), p.full_name, 'Member'), 'avatar_path', p.avatar_path, 'status_text', p.status_text,
    'story', CASE WHEN EXISTS (SELECT 1 FROM bix_stories s WHERE s.user_id = p.user_id AND s.expires_at > now()) AND bix_story_can_view(auth.uid(), p.user_id)
      THEN CASE WHEN EXISTS (SELECT 1 FROM bix_stories s WHERE s.user_id = p.user_id AND s.expires_at > now() AND NOT EXISTS (SELECT 1 FROM bix_story_views v WHERE v.story_id = s.id AND v.viewer_id = auth.uid())) AND p.user_id <> auth.uid() THEN 'new' ELSE 'seen' END
      ELSE NULL END)
  FROM profiles p WHERE p.user_id = p_user AND auth.uid() IS NOT NULL;
$$;

-- Stories
CREATE OR REPLACE FUNCTION public.bix_story_post(p_kind text, p_path text, p_caption text, p_bg text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); nid uuid; c text := nullif(btrim(coalesce(p_caption,'')), '');
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_kind NOT IN ('text','photo','video') THEN RAISE EXCEPTION 'Jenis story tidak dikenal'; END IF;
  IF p_kind = 'text' AND c IS NULL THEN RAISE EXCEPTION 'Tulis status terlebih dulu'; END IF;
  IF p_kind <> 'text' AND (p_path IS NULL OR p_path NOT LIKE uid::text || '/%') THEN RAISE EXCEPTION 'Media tidak valid'; END IF;
  IF c IS NOT NULL AND length(c) > 200 THEN RAISE EXCEPTION 'Teks maksimal 200 karakter'; END IF;
  IF (SELECT count(*) FROM bix_stories WHERE user_id = uid AND expires_at > now()) >= 10 THEN RAISE EXCEPTION 'Maksimal 10 story aktif dalam 24 jam'; END IF;
  INSERT INTO bix_stories (user_id, kind, media_path, caption, bg)
  VALUES (uid, p_kind, CASE WHEN p_kind = 'text' THEN NULL ELSE p_path END, c, CASE WHEN p_bg IN ('gold','violet','emerald','obsidian','ruby') THEN p_bg ELSE 'gold' END)
  RETURNING id INTO nid;
  RETURN nid;
END $$;

CREATE OR REPLACE FUNCTION public.bix_story_delete(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pth text;
BEGIN
  DELETE FROM bix_stories WHERE id = p_id AND user_id = auth.uid() RETURNING media_path INTO pth;
  RETURN pth;
END $$;

CREATE OR REPLACE FUNCTION public.bix_story_feed()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH a AS (
    SELECT DISTINCT s.user_id FROM bix_stories s WHERE s.expires_at > now() AND auth.uid() IS NOT NULL AND bix_story_can_view(auth.uid(), s.user_id)
  ), g AS (
    SELECT a.user_id, coalesce(nullif(p.username,''), p.full_name, 'Member') AS name, p.avatar_path,
      (SELECT jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'media_path', s.media_path, 'caption', s.caption, 'bg', s.bg, 'created_at', s.created_at,
          'viewed', EXISTS (SELECT 1 FROM bix_story_views v WHERE v.story_id = s.id AND v.viewer_id = auth.uid()),
          'views', CASE WHEN s.user_id = auth.uid() THEN (SELECT count(*) FROM bix_story_views v WHERE v.story_id = s.id) END) ORDER BY s.created_at)
        FROM bix_stories s WHERE s.user_id = a.user_id AND s.expires_at > now()) AS stories,
      (SELECT max(created_at) FROM bix_stories s WHERE s.user_id = a.user_id AND s.expires_at > now()) AS latest
    FROM a LEFT JOIN profiles p ON p.user_id = a.user_id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', g.user_id, 'name', g.name, 'avatar_path', g.avatar_path, 'mine', g.user_id = auth.uid(), 'stories', g.stories,
      'unseen', g.user_id <> auth.uid() AND EXISTS (SELECT 1 FROM jsonb_array_elements(g.stories) e WHERE NOT (e->>'viewed')::boolean))
    ORDER BY (g.user_id = auth.uid()) DESC, EXISTS (SELECT 1 FROM jsonb_array_elements(g.stories) e WHERE NOT (e->>'viewed')::boolean) DESC, g.latest DESC), '[]'::jsonb)
  FROM g;
$$;

CREATE OR REPLACE FUNCTION public.bix_story_mark_view(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE au uuid;
BEGIN
  SELECT user_id INTO au FROM bix_stories WHERE id = p_id AND expires_at > now();
  IF au IS NULL OR au = auth.uid() OR NOT bix_story_can_view(auth.uid(), au) THEN RETURN; END IF;
  INSERT INTO bix_story_views (story_id, viewer_id) VALUES (p_id, auth.uid()) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.bix_story_viewers(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', v.viewer_id, 'name', coalesce(nullif(p.username,''), p.full_name, 'Member'), 'avatar_path', p.avatar_path, 'at', v.viewed_at) ORDER BY v.viewed_at DESC), '[]'::jsonb)
  FROM bix_story_views v JOIN bix_stories s ON s.id = v.story_id LEFT JOIN profiles p ON p.user_id = v.viewer_id
  WHERE v.story_id = p_id AND s.user_id = auth.uid();
$$;

-- Expose photo + status to existing call peer lookup
CREATE OR REPLACE FUNCTION public.bix_call_peer(p_user uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('user_id', p.user_id, 'name', coalesce(nullif(p.username,''), p.full_name),
    'whatsapp', CASE WHEN p.whatsapp_public OR p.user_id = auth.uid() THEN p.whatsapp END,
    'avatar_path', p.avatar_path, 'status_text', p.status_text,
    'can_call', auth.uid() IS NOT NULL AND p.user_id <> auth.uid() AND bix_call_allowed(auth.uid(), p.user_id))
  FROM profiles p WHERE p.user_id = p_user AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.bix_story_can_view(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bix_story_can_view_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_story_can_view_path(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bix_story_can_view(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.bix_profile_me(), public.bix_profile_set_avatar(text), public.bix_profile_set_status(text), public.bix_profile_card(uuid), public.bix_story_post(text, text, text, text), public.bix_story_delete(uuid), public.bix_story_feed(), public.bix_story_mark_view(uuid), public.bix_story_viewers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_profile_me(), public.bix_profile_set_avatar(text), public.bix_profile_set_status(text), public.bix_profile_card(uuid), public.bix_story_post(text, text, text, text), public.bix_story_delete(uuid), public.bix_story_feed(), public.bix_story_mark_view(uuid), public.bix_story_viewers(uuid) TO authenticated;