CREATE TABLE public.packages (id text PRIMARY KEY, price_usd numeric(12,2) NOT NULL CHECK (price_usd > 0), apy numeric(6,2) NOT NULL CHECK (apy >= 0 AND apy <= 100), lock_days integer NOT NULL CHECK (lock_days > 0), daily_profit_enabled boolean NOT NULL DEFAULT true);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public package read" ON public.packages FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL CHECK (role IN ('admin','user')), PRIMARY KEY (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.is_bix_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') $$;
GRANT EXECUTE ON FUNCTION public.is_bix_admin() TO authenticated;
CREATE POLICY "Admin package insert" ON public.packages FOR INSERT TO authenticated WITH CHECK (public.is_bix_admin());
CREATE POLICY "Admin package update" ON public.packages FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE POLICY "Admin package delete" ON public.packages FOR DELETE TO authenticated USING (public.is_bix_admin());

CREATE TABLE public.stakes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), package_id text NOT NULL REFERENCES public.packages(id), amount_usd numeric(12,2) NOT NULL CHECK (amount_usd > 0), apy numeric(6,2) NOT NULL, lock_days integer NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','completed')), created_at timestamptz NOT NULL DEFAULT now(), activated_at timestamptz);
GRANT SELECT, INSERT, UPDATE ON public.stakes TO authenticated;
GRANT ALL ON public.stakes TO service_role;
ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and admin stake read" ON public.stakes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Admin stake update" ON public.stakes FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());

CREATE TABLE public.referral_codes (user_id uuid PRIMARY KEY DEFAULT auth.uid(), code text UNIQUE NOT NULL, referred_by uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral read" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Own referral insert" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public settings read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin settings insert" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.is_bix_admin());
CREATE POLICY "Admin settings update" ON public.app_settings FOR UPDATE TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());
CREATE POLICY "Admin settings delete" ON public.app_settings FOR DELETE TO authenticated USING (public.is_bix_admin());

CREATE TABLE public.income_sources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category text NOT NULL CHECK (category IN ('FOREX','CRYPTO','RWA','ADVERTISING')), name text NOT NULL, amount_usd numeric(12,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_sources TO authenticated;
GRANT ALL ON public.income_sources TO service_role;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin income access" ON public.income_sources FOR ALL TO authenticated USING (public.is_bix_admin()) WITH CHECK (public.is_bix_admin());

CREATE FUNCTION public.request_bix_stake(p_package text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE p public.packages%ROWTYPE; new_id uuid; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF; SELECT * INTO p FROM public.packages WHERE id = p_package; IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable'; END IF; INSERT INTO public.stakes (user_id, package_id, amount_usd, apy, lock_days) VALUES (auth.uid(), p.id, p.price_usd, p.apy, p.lock_days) RETURNING id INTO new_id; RETURN new_id; END $$;
GRANT EXECUTE ON FUNCTION public.request_bix_stake(text) TO authenticated;