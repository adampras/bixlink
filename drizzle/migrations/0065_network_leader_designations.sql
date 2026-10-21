CREATE TABLE public.bix_network_leaders (
  user_id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('sponsored_leader','team_support')),
  note text,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_network_leaders TO authenticated;
GRANT ALL ON public.bix_network_leaders TO service_role;
ALTER TABLE public.bix_network_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or self reads leader designations" ON public.bix_network_leaders FOR SELECT TO authenticated
  USING (public.is_bix_admin() OR auth.uid() = user_id OR auth.uid() = assigned_by);