CREATE TABLE public.bix_native_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 installation_id uuid NOT NULL,
 token text NOT NULL CHECK (length(token) BETWEEN 20 AND 4096),
 platform text NOT NULL CHECK (platform IN ('android','ios')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, installation_id),
 UNIQUE (token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bix_native_devices TO authenticated;
GRANT ALL ON public.bix_native_devices TO service_role;
ALTER TABLE public.bix_native_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own native devices" ON public.bix_native_devices FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX bix_native_devices_user_idx ON public.bix_native_devices(user_id);
COMMENT ON TABLE public.bix_native_devices IS 'FCM device registrations only; no roles, balances or GPS history. Sender integration waits for the Firebase connector.';