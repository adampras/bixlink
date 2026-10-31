CREATE TABLE public.bixtrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('deposit','withdraw')),
  amount_usd numeric(14,2) NOT NULL CHECK (amount_usd > 0 AND amount_usd <= 10000000),
  strategy text NOT NULL DEFAULT 'core' CHECK (strategy IN ('core','active','triangular')),
  note text CHECK (char_length(note) <= 200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text CHECK (char_length(admin_note) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.bixtrade_requests TO authenticated;
GRANT UPDATE (status, admin_note, reviewed_at) ON public.bixtrade_requests TO authenticated;
GRANT ALL ON public.bixtrade_requests TO service_role;
ALTER TABLE public.bixtrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bixtrade own read" ON public.bixtrade_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "bixtrade own insert" ON public.bixtrade_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending' AND admin_note IS NULL AND reviewed_at IS NULL);
CREATE POLICY "bixtrade admin review" ON public.bixtrade_requests FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE INDEX bixtrade_requests_user_idx ON public.bixtrade_requests (user_id, created_at DESC);