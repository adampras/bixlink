CREATE TABLE public.bix_notify_log (event_key text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.bix_notify_log TO service_role;
ALTER TABLE public.bix_notify_log ENABLE ROW LEVEL SECURITY;