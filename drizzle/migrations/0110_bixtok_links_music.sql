ALTER TABLE public.bixtok_videos ADD COLUMN IF NOT EXISTS text_style jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS music_title text, ADD COLUMN IF NOT EXISTS music_url text, ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'file';
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS link_slots integer NOT NULL DEFAULT 5, ADD COLUMN IF NOT EXISTS max_links integer NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.bixtok_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Trending',
  audio_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bixtok_sounds TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bixtok_sounds TO authenticated;
GRANT ALL ON public.bixtok_sounds TO service_role;
ALTER TABLE public.bixtok_sounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok sounds read" ON public.bixtok_sounds FOR SELECT TO authenticated USING (enabled OR public.is_bix_admin());
CREATE POLICY "bixtok sounds admin ins" ON public.bixtok_sounds FOR INSERT TO authenticated WITH CHECK (public.is_bix_admin());
CREATE POLICY "bixtok sounds admin upd" ON public.bixtok_sounds FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE POLICY "bixtok sounds admin del" ON public.bixtok_sounds FOR DELETE TO authenticated USING (public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bixtok_publish_links(p_urls text[], p_caption text, p_filter text, p_overlay text, p_text_style jsonb, p_music_title text, p_music_url text, p_allow_gifts boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_name text; v_cfg public.bixtok_config; u text; n int := 0; v_kind text; v_src text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO v_cfg FROM public.bixtok_config WHERE id = 1;
  IF NOT coalesce(v_cfg.enabled,false) OR coalesce((v_cfg.features->>'upload')::boolean,true) = false THEN RAISE EXCEPTION 'Posting is closed right now'; END IF;
  IF p_urls IS NULL OR array_length(p_urls,1) IS NULL THEN RAISE EXCEPTION 'Add at least one link'; END IF;
  IF array_length(p_urls,1) > greatest(1, v_cfg.max_links) THEN RAISE EXCEPTION 'Too many links'; END IF;
  IF (SELECT count(*) FROM public.bixtok_videos WHERE creator_id = v_uid AND created_at > now() - interval '1 day') + array_length(p_urls,1) > 20 THEN RAISE EXCEPTION 'Daily post limit reached'; END IF;
  IF p_music_url IS NOT NULL AND p_music_url <> '' AND p_music_url !~ '^https://' THEN RAISE EXCEPTION 'Invalid music link'; END IF;
  SELECT coalesce(nullif(username,''),'member') INTO v_name FROM public.profiles WHERE user_id = v_uid;
  FOREACH u IN ARRAY p_urls LOOP
    u := btrim(u);
    CONTINUE WHEN u = '';
    IF u !~ '^https://[^\s]+$' OR length(u) > 500 THEN RAISE EXCEPTION 'Links must start with https://'; END IF;
    v_src := CASE WHEN u ~* 'tiktok\.com' THEN 'tiktok' WHEN u ~* '(youtube\.com|youtu\.be)' THEN 'youtube' WHEN u ~* 'instagram\.com' THEN 'instagram' ELSE 'link' END;
    v_kind := CASE WHEN u ~* '\.(jpe?g|png|webp|gif)(\?|$)' THEN 'photo' ELSE 'video' END;
    INSERT INTO public.bixtok_videos(creator_id, creator_name, caption, video_url, media_kind, filter, overlay, text_style, music_title, music_url, source_kind, allow_gifts, sort)
    VALUES (v_uid, coalesce(v_name,'member'), left(coalesce(p_caption,''),300), u, v_kind,
      CASE WHEN p_filter IN ('none','beauty','glow','warm','gold','matcha','noir','cool','vivid','bright','smooth','radiant') THEN p_filter ELSE 'none' END,
      left(coalesce(p_overlay,''),80), coalesce(p_text_style,'{}'::jsonb), left(nullif(p_music_title,''),120), nullif(p_music_url,''), v_src, coalesce(p_allow_gifts,true), 0);
    n := n + 1;
  END LOOP;
  IF n = 0 THEN RAISE EXCEPTION 'Add at least one link'; END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_publish_links(text[],text,text,text,jsonb,text,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_publish_links(text[],text,text,text,jsonb,text,text,boolean) TO authenticated;