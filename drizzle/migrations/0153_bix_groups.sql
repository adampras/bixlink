CREATE TABLE public.bix_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  about text NOT NULL DEFAULT '' CHECK (char_length(about) <= 300),
  code text NOT NULL UNIQUE,
  live_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bix_group_members (
  group_id uuid NOT NULL REFERENCES public.bix_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE public.bix_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.bix_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.bix_group_messages (group_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bix_groups, public.bix_group_members, public.bix_group_messages TO authenticated;
GRANT ALL ON public.bix_groups, public.bix_group_members, public.bix_group_messages TO service_role;
ALTER TABLE public.bix_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bix_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bix_group_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bix_group_is_member(_g uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bix_group_members WHERE group_id = _g AND user_id = auth.uid())
$$;

CREATE POLICY "groups readable by members" ON public.bix_groups FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.bix_group_is_member(id));
CREATE POLICY "create own group" ON public.bix_groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates group" ON public.bix_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes group" ON public.bix_groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members see members" ON public.bix_group_members FOR SELECT TO authenticated USING (public.bix_group_is_member(group_id));
CREATE POLICY "leave group" ON public.bix_group_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "members read messages" ON public.bix_group_messages FOR SELECT TO authenticated USING (public.bix_group_is_member(group_id));
CREATE POLICY "members post messages" ON public.bix_group_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.bix_group_is_member(group_id));
CREATE POLICY "sender deletes message" ON public.bix_group_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bix_group_owner_join() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.bix_group_members (group_id, user_id) VALUES (NEW.id, NEW.owner_id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
CREATE TRIGGER bix_group_owner_join AFTER INSERT ON public.bix_groups FOR EACH ROW EXECUTE FUNCTION public.bix_group_owner_join();

CREATE OR REPLACE FUNCTION public.bix_group_join(p_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT id INTO g FROM public.bix_groups WHERE code = upper(trim(p_code));
  IF g IS NULL THEN RAISE EXCEPTION 'Group code not found'; END IF;
  IF (SELECT count(*) FROM public.bix_group_members WHERE group_id = g) >= 500 THEN RAISE EXCEPTION 'Group is full (500)'; END IF;
  INSERT INTO public.bix_group_members (group_id, user_id) VALUES (g, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN g;
END $$;
REVOKE ALL ON FUNCTION public.bix_group_join(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_join(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_group_feed(p_group uuid) RETURNS TABLE(id uuid, sender_id uuid, name text, body text, created_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.sender_id, coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Member')::text, m.body, m.created_at
  FROM public.bix_group_messages m LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  WHERE m.group_id = p_group AND public.bix_group_is_member(p_group)
  ORDER BY m.created_at DESC LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.bix_group_feed(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_feed(uuid) TO authenticated;