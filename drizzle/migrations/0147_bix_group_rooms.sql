CREATE TABLE public.bix_call_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 60),
  code text NOT NULL UNIQUE,
  video boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bix_call_rooms TO authenticated;
GRANT ALL ON public.bix_call_rooms TO service_role;
ALTER TABLE public.bix_call_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read rooms" ON public.bix_call_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "host creates room" ON public.bix_call_rooms FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid() AND status = 'open');
CREATE POLICY "host closes room" ON public.bix_call_rooms FOR UPDATE TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());