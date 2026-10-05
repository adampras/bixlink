CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin profile read" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE TABLE public.bix_clone_accounts (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  label text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_clone_accounts TO authenticated;
GRANT ALL ON public.bix_clone_accounts TO service_role;
ALTER TABLE public.bix_clone_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin clone read" ON public.bix_clone_accounts FOR SELECT TO authenticated USING (public.is_bix_admin());

CREATE TABLE public.bix_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_bix numeric NOT NULL CHECK (amount_bix > 0),
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_allocations TO authenticated;
GRANT ALL ON public.bix_allocations TO service_role;
ALTER TABLE public.bix_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin allocation read" ON public.bix_allocations FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_username_available(p_username text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$ SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(p_username))) $f$;
GRANT EXECUTE ON FUNCTION public.bix_username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_bix_profile()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE v_meta jsonb := auth.jwt() -> 'user_metadata'; v_name text; v_user text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) THEN RETURN; END IF;
  v_name := left(trim(coalesce(v_meta ->> 'full_name', '')), 80);
  v_user := lower(left(regexp_replace(coalesce(v_meta ->> 'username', ''), '[^a-zA-Z0-9_.]', '', 'g'), 24));
  IF v_name = '' THEN v_name := split_part(coalesce(auth.jwt() ->> 'email', 'member'), '@', 1); END IF;
  IF length(v_user) < 3 OR EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = v_user) THEN
    v_user := 'member' || substr(replace(auth.uid()::text, '-', ''), 1, 8);
  END IF;
  INSERT INTO public.profiles(user_id, full_name, username) VALUES (auth.uid(), v_name, v_user) ON CONFLICT DO NOTHING;
END $f$;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
      GREATEST(0,
        public.bix_wallet_balance(p_user)
        + COALESCE((SELECT SUM(CASE
            WHEN direction = 'BIX_TO_USDT' AND status = 'approved' THEN amount_out
            WHEN direction = 'USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in
            ELSE 0 END)
          FROM public.swap_requests WHERE user_id = p_user), 0)
      )
    ELSE NULL END AS usdt_balance,
    CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
      GREATEST(0,
        COALESCE((SELECT SUM(CASE
            WHEN direction = 'USDT_TO_BIX' AND status = 'approved' THEN amount_out
            WHEN direction = 'BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in
            ELSE 0 END)
          FROM public.swap_requests WHERE user_id = p_user), 0)
        + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_bix ELSE -amount_bix END)
          FROM public.bix_transfers WHERE status = 'completed' AND (sender_id = p_user OR recipient_id = p_user)), 0)
        + COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id = p_user), 0)
      )
    ELSE NULL END AS bix_balance
$function$;

CREATE OR REPLACE FUNCTION public.bix_public_home_stats()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'active_stakes', (SELECT count(*) FROM public.stakes WHERE status = 'active'),
    'total_staked_usd', (SELECT COALESCE(sum(amount_usd), 0) FROM public.stakes WHERE status = 'active'),
    'members', (SELECT count(*) FROM public.referral_codes r WHERE NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = r.user_id)),
    'average_apy', (SELECT COALESCE(round(avg(apy), 2), 0) FROM public.stakes WHERE status = 'active'),
    'income', COALESCE((SELECT jsonb_agg(jsonb_build_object('category', category, 'amount_usd', total) ORDER BY category) FROM (SELECT category, sum(amount_usd) AS total FROM public.income_sources GROUP BY category) grouped_income), '[]'::jsonb)
  )
$function$;