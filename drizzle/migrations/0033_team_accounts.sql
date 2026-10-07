CREATE TABLE public.bix_team_accounts (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  label text NOT NULL,
  team_role text NOT NULL DEFAULT 'member',
  region text NOT NULL DEFAULT 'local',
  sponsor_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_team_accounts TO authenticated;
GRANT ALL ON public.bix_team_accounts TO service_role;
ALTER TABLE public.bix_team_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and reviewers read team accounts" ON public.bix_team_accounts FOR SELECT TO authenticated
USING (public.is_bix_admin() OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'reviewer'));