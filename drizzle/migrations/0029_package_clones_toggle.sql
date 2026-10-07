ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS clone_of text;
DROP POLICY IF EXISTS "Member package read" ON public.packages;
CREATE POLICY "Member package read" ON public.packages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (enabled OR public.is_bix_admin()));
CREATE OR REPLACE FUNCTION public.bix_stake_package_open() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.packages WHERE id = NEW.package_id AND enabled) THEN RAISE EXCEPTION 'Package is closed'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stakes_package_open ON public.stakes;
CREATE TRIGGER stakes_package_open BEFORE INSERT ON public.stakes FOR EACH ROW EXECUTE FUNCTION public.bix_stake_package_open();