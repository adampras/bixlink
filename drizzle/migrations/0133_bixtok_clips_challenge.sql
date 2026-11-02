ALTER TABLE public.bixtok_config
  ADD COLUMN IF NOT EXISTS challenge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS challenge_tag text,
  ADD COLUMN IF NOT EXISTS challenge_title text,
  ADD COLUMN IF NOT EXISTS challenge_prize text,
  ADD COLUMN IF NOT EXISTS challenge_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS clips_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.bixtok_publish_clip(p_live uuid, p_path text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE l public.bixtok_lives; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((SELECT clips_enabled FROM public.bixtok_config WHERE id = 1), true) THEN RAISE EXCEPTION 'LIVE clips are closed'; END IF;
  SELECT * INTO l FROM public.bixtok_lives WHERE id = p_live;
  IF l.id IS NULL OR l.host_id <> auth.uid() THEN RAISE EXCEPTION 'Only the host can publish a clip'; END IF;
  IF p_path IS NULL OR split_part(p_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid media'; END IF;
  IF (SELECT count(*) FROM public.bixtok_videos WHERE creator_id = auth.uid() AND overlay = 'CLIP' AND created_at > now() - interval '1 day') >= 20 THEN RAISE EXCEPTION 'Daily clip limit reached'; END IF;
  INSERT INTO public.bixtok_videos(creator_id, creator_name, caption, video_url, media_path, media_kind, filter, overlay, allow_gifts, sort, source_kind)
  VALUES (auth.uid(), l.host_name, left('✂️ LIVE moment · ' || l.title || ' #BIXTOKLIVE', 300),
    'https://bixlink.com/bixtok', p_path, 'video', 'none', 'CLIP', true, 0, 'file')
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.bixtok_publish_clip(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_publish_clip(uuid, text) TO authenticated;