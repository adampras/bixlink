ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS id_path text, ADD COLUMN IF NOT EXISTS selfie_path text, ADD COLUMN IF NOT EXISTS phone text, ADD COLUMN IF NOT EXISTS review_note text, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE TABLE public.bix_kyc_rewards (
  user_id uuid PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 50,
  locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.bix_kyc_rewards IS 'Display-only locked KYC welcome BIX; never part of spendable balances.';
GRANT SELECT ON public.bix_kyc_rewards TO authenticated;
GRANT ALL ON public.bix_kyc_rewards TO service_role;
ALTER TABLE public.bix_kyc_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc reward own read" ON public.bix_kyc_rewards FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_kyc_reward_on_approve() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','rejected') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.reviewed_at := now();
  END IF;
  IF NEW.status = 'approved' THEN
    INSERT INTO public.bix_kyc_rewards(user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bix_kyc_reward_on_approve() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bix_kyc_reward_trg BEFORE INSERT OR UPDATE ON public.kyc_submissions FOR EACH ROW EXECUTE FUNCTION public.bix_kyc_reward_on_approve();

CREATE POLICY "kyc files own upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bix-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc files own or admin read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bix-kyc' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_bix_admin()));
CREATE POLICY "kyc files own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bix-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);