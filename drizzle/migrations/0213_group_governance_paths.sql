ALTER TABLE public.bix_groups ADD COLUMN IF NOT EXISTS invite_limit integer, ADD COLUMN IF NOT EXISTS invite_uses integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;
ALTER TABLE public.bix_group_members ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.bix_group_join(p_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.bix_groups%ROWTYPE; n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  SELECT * INTO g FROM public.bix_groups WHERE code = upper(trim(p_code)) FOR UPDATE;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Group code not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_group_members WHERE group_id=g.id AND user_id=auth.uid()) THEN RETURN g.id; END IF;
  IF g.invite_expires_at IS NOT NULL AND g.invite_expires_at < now() THEN RAISE EXCEPTION 'Invite link expired'; END IF;
  IF g.invite_limit IS NOT NULL AND g.invite_uses >= g.invite_limit THEN RAISE EXCEPTION 'Invite link quota is full'; END IF;
  IF (SELECT count(*) FROM public.bix_group_members WHERE group_id = g.id) >= 500 THEN RAISE EXCEPTION 'Group is full (500)'; END IF;
  INSERT INTO public.bix_group_members (group_id, user_id, last_seen_at) VALUES (g.id, auth.uid(), now()) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN UPDATE public.bix_groups SET invite_uses = invite_uses + 1 WHERE id = g.id; END IF;
  RETURN g.id;
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_invite_reset(p_group uuid, p_limit integer, p_days integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c text;
BEGIN
  IF NOT public.bix_group_can_manage(p_group) THEN RAISE EXCEPTION 'Only Founder or Moderators'; END IF;
  IF p_limit IS NOT NULL AND (p_limit < 1 OR p_limit > 500) THEN RAISE EXCEPTION 'Limit 1-500'; END IF;
  IF p_days IS NOT NULL AND (p_days < 1 OR p_days > 90) THEN RAISE EXCEPTION 'Days 1-90'; END IF;
  c := upper(substr(replace(gen_random_uuid()::text,'-',''),1,7));
  UPDATE public.bix_groups SET code=c, invite_limit=p_limit, invite_uses=0,
    invite_expires_at = CASE WHEN p_days IS NULL THEN NULL ELSE now() + make_interval(days => p_days) END WHERE id=p_group;
  RETURN jsonb_build_object('code', c);
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_touch(p_group uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.bix_group_members SET last_seen_at = now() WHERE group_id = p_group AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.bix_group_roster(p_group uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.user_id, 'code', rc.code, 'name', coalesce(p.username, p.full_name, rc.code, 'member'), 'host', m.user_id = g.owner_id, 'admin', m.is_admin, 'joined_at', m.joined_at, 'last_seen', m.last_seen_at) ORDER BY (m.user_id = g.owner_id) DESC, m.is_admin DESC, m.joined_at), '[]'::jsonb)
  FROM bix_group_members m JOIN bix_groups g ON g.id = m.group_id
  LEFT JOIN referral_codes rc ON rc.user_id = m.user_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  WHERE m.group_id = p_group AND auth.uid() IS NOT NULL AND public.bix_group_is_member(p_group);
$$;

CREATE TABLE public.bix_group_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.bix_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  ends_at timestamptz NOT NULL,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_group_proposals TO authenticated;
GRANT ALL ON public.bix_group_proposals TO service_role;
ALTER TABLE public.bix_group_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read proposals" ON public.bix_group_proposals FOR SELECT TO authenticated USING (public.bix_group_is_member(group_id));

CREATE TABLE public.bix_group_votes (
  proposal_id uuid NOT NULL REFERENCES public.bix_group_proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  choice boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, user_id)
);
GRANT SELECT ON public.bix_group_votes TO authenticated;
GRANT ALL ON public.bix_group_votes TO service_role;
ALTER TABLE public.bix_group_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own votes" ON public.bix_group_votes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.bix_group_treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.bix_groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  asset text NOT NULL CHECK (asset IN ('BIX','USDT')),
  amount numeric NOT NULL CHECK (amount > 0 AND amount <= 100000000),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_group_treasury TO authenticated;
GRANT ALL ON public.bix_group_treasury TO service_role;
ALTER TABLE public.bix_group_treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read treasury" ON public.bix_group_treasury FOR SELECT TO authenticated USING (public.bix_group_is_member(group_id));

CREATE OR REPLACE FUNCTION public.bix_group_proposal_create(p_group uuid, p_title text, p_body text, p_days integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i uuid;
BEGIN
  IF NOT public.bix_group_can_manage(p_group) THEN RAISE EXCEPTION 'Only Founder or Moderators'; END IF;
  IF length(trim(coalesce(p_title,''))) < 3 THEN RAISE EXCEPTION 'Title too short'; END IF;
  INSERT INTO public.bix_group_proposals(group_id, author_id, title, body, ends_at)
  VALUES (p_group, auth.uid(), left(trim(p_title),120), left(coalesce(p_body,''),1000), now() + make_interval(days => greatest(1, least(coalesce(p_days,3), 30)))) RETURNING id INTO i;
  RETURN i;
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_vote(p_proposal uuid, p_yes boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pr public.bix_group_proposals%ROWTYPE;
BEGIN
  SELECT * INTO pr FROM public.bix_group_proposals WHERE id = p_proposal;
  IF pr.id IS NULL OR NOT public.bix_group_is_member(pr.group_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF pr.closed OR pr.ends_at < now() THEN RAISE EXCEPTION 'Voting closed'; END IF;
  INSERT INTO public.bix_group_votes(proposal_id, user_id, choice) VALUES (p_proposal, auth.uid(), p_yes)
  ON CONFLICT (proposal_id, user_id) DO UPDATE SET choice = EXCLUDED.choice, created_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_proposal_close(p_proposal uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g uuid;
BEGIN
  SELECT group_id INTO g FROM public.bix_group_proposals WHERE id = p_proposal;
  IF g IS NULL OR NOT public.bix_group_can_manage(g) THEN RAISE EXCEPTION 'Only Founder or Moderators'; END IF;
  UPDATE public.bix_group_proposals SET closed = true WHERE id = p_proposal;
END $$;

CREATE OR REPLACE FUNCTION public.bix_group_proposals_list(p_group uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'body', p.body, 'ends_at', p.ends_at,
    'closed', p.closed OR p.ends_at < now(), 'created_at', p.created_at,
    'yes', (SELECT count(*) FROM bix_group_votes v WHERE v.proposal_id=p.id AND v.choice),
    'no', (SELECT count(*) FROM bix_group_votes v WHERE v.proposal_id=p.id AND NOT v.choice),
    'mine', (SELECT v.choice FROM bix_group_votes v WHERE v.proposal_id=p.id AND v.user_id=auth.uid()),
    'members', (SELECT count(*) FROM bix_group_members m WHERE m.group_id=p.group_id)) ORDER BY p.created_at DESC), '[]'::jsonb)
  FROM bix_group_proposals p WHERE p.group_id = p_group AND public.bix_group_is_member(p_group);
$$;

CREATE OR REPLACE FUNCTION public.bix_group_treasury_add(p_group uuid, p_direction text, p_asset text, p_amount numeric, p_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i uuid;
BEGIN
  IF NOT public.bix_group_can_manage(p_group) THEN RAISE EXCEPTION 'Only Founder or Moderators'; END IF;
  INSERT INTO public.bix_group_treasury(group_id, author_id, direction, asset, amount, note)
  VALUES (p_group, auth.uid(), p_direction, p_asset, round(p_amount, 4), left(coalesce(p_note,''),200)) RETURNING id INTO i;
  RETURN i;
END $$;

REVOKE ALL ON FUNCTION public.bix_group_invite_reset(uuid,integer,integer), public.bix_group_touch(uuid), public.bix_group_proposal_create(uuid,text,text,integer), public.bix_group_vote(uuid,boolean), public.bix_group_proposal_close(uuid), public.bix_group_proposals_list(uuid), public.bix_group_treasury_add(uuid,text,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_invite_reset(uuid,integer,integer), public.bix_group_touch(uuid), public.bix_group_proposal_create(uuid,text,text,integer), public.bix_group_vote(uuid,boolean), public.bix_group_proposal_close(uuid), public.bix_group_proposals_list(uuid), public.bix_group_treasury_add(uuid,text,text,numeric,text) TO authenticated;