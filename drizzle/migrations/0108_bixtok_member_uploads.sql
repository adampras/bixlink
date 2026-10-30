ALTER TABLE public.bixtok_videos
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS media_kind text NOT NULL DEFAULT 'video' CHECK (media_kind IN ('video','photo')),
  ADD COLUMN IF NOT EXISTS filter text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS overlay text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS allow_gifts boolean NOT NULL DEFAULT true;

CREATE POLICY "bixtok videos own delete" ON public.bixtok_videos FOR DELETE TO authenticated USING (creator_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bixtok_publish(p_path text, p_kind text, p_caption text, p_filter text, p_overlay text, p_allow_gifts boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_name text; v_id uuid; v_cfg public.bixtok_config;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO v_cfg FROM public.bixtok_config WHERE id = 1;
  IF NOT coalesce(v_cfg.enabled, false) OR coalesce((v_cfg.features->>'upload')::boolean, true) = false THEN RAISE EXCEPTION 'Uploads are closed right now'; END IF;
  IF p_path IS NULL OR split_part(p_path, '/', 1) <> v_uid::text THEN RAISE EXCEPTION 'Invalid media'; END IF;
  IF p_kind NOT IN ('video','photo') THEN RAISE EXCEPTION 'Invalid media type'; END IF;
  IF (SELECT count(*) FROM public.bixtok_videos WHERE creator_id = v_uid AND created_at > now() - interval '1 day') >= 20 THEN RAISE EXCEPTION 'Daily upload limit reached'; END IF;
  SELECT coalesce(nullif(username,''), 'member') INTO v_name FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.bixtok_videos(creator_id, creator_name, caption, video_url, media_path, media_kind, filter, overlay, allow_gifts, sort)
  VALUES (v_uid, coalesce(v_name,'member'), left(coalesce(p_caption,''), 300), 'https://bixlink.com/bixtok', p_path, p_kind,
    CASE WHEN p_filter IN ('none','beauty','glow','warm','gold','matcha','noir','cool','vivid') THEN p_filter ELSE 'none' END,
    left(coalesce(p_overlay,''), 80), coalesce(p_allow_gifts, true), 0)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_publish(text,text,text,text,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_publish(text,text,text,text,text,boolean) TO authenticated;

CREATE POLICY "bixtok media read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bixtok-media');
CREATE POLICY "bixtok media own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bixtok-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bixtok media own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bixtok-media' AND (storage.foldername(name))[1] = auth.uid()::text);