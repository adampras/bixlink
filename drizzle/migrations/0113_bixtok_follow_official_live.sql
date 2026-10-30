CREATE TABLE public.bixtok_follows (
  follower_id uuid NOT NULL,
  followee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
GRANT SELECT, INSERT, DELETE ON public.bixtok_follows TO authenticated;
GRANT ALL ON public.bixtok_follows TO service_role;
ALTER TABLE public.bixtok_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtok follows read" ON public.bixtok_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "bixtok follows insert own" ON public.bixtok_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "bixtok follows delete own" ON public.bixtok_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());
CREATE INDEX bixtok_follows_followee_idx ON public.bixtok_follows(followee_id);

ALTER TABLE public.bixtok_lives ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'community';

CREATE OR REPLACE FUNCTION public.bixtok_start_official_live(p_title text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_title text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Only Owner 1 can start an official broadcast'; END IF;
  v_title := COALESCE(NULLIF(left(trim(p_title),80),''),'BIXLINK Official Presentation');
  UPDATE public.bixtok_lives SET status = 'ended', ended_at = now() WHERE host_id = auth.uid() AND status = 'live';
  INSERT INTO public.bixtok_lives(host_id, host_name, title, kind) VALUES (auth.uid(), 'BIXLINK OFFICIAL', v_title, 'official') RETURNING id INTO v_id;
  INSERT INTO public.bix_announcements(title, body, category, published_at)
  VALUES ('🔴 OFFICIAL LIVE: ' || v_title, 'BIXLINK is broadcasting live on BIXTOK now. Open BIXTOK → LIVE to join the presentation.', 'LIVE', now());
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_start_official_live(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_start_official_live(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixtok_am_owner1() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT auth.uid() IS NOT NULL AND public.bix_is_owner1() $$;
GRANT EXECUTE ON FUNCTION public.bixtok_am_owner1() TO authenticated;