CREATE TABLE public.bixtok_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.bixtok_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bixtok_comments_video_idx ON public.bixtok_comments(video_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.bixtok_comments TO authenticated;
GRANT ALL ON public.bixtok_comments TO service_role;
ALTER TABLE public.bixtok_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read comments" ON public.bixtok_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members add own comments" ON public.bixtok_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members delete own comments" ON public.bixtok_comments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.bixtok_comment_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.body := btrim(NEW.body);
  SELECT COALESCE(NULLIF(username,''), 'member') INTO NEW.author_name FROM public.profiles WHERE user_id = NEW.user_id;
  NEW.author_name := COALESCE(NEW.author_name, 'member');
  RETURN NEW;
END $$;
CREATE TRIGGER bixtok_comment_author BEFORE INSERT ON public.bixtok_comments FOR EACH ROW EXECUTE FUNCTION public.bixtok_comment_author();