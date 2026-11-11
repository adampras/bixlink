CREATE TABLE public.bix_identity_profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 120),
  birth_date date,
  gender text CHECK (gender IN ('male','female','other')),
  country text CHECK (char_length(country) <= 60),
  city text CHECK (char_length(city) <= 80),
  phone text CHECK (char_length(phone) <= 30),
  address text CHECK (char_length(address) <= 240),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bix_identity_profiles TO authenticated;
GRANT ALL ON public.bix_identity_profiles TO service_role;
ALTER TABLE public.bix_identity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own identity read" ON public.bix_identity_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own identity insert" ON public.bix_identity_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own identity update" ON public.bix_identity_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);