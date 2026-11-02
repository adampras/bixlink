CREATE TABLE public.bix_push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bix_push_subscriptions_user ON public.bix_push_subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bix_push_subscriptions TO authenticated;
GRANT ALL ON public.bix_push_subscriptions TO service_role;
ALTER TABLE public.bix_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subs" ON public.bix_push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());