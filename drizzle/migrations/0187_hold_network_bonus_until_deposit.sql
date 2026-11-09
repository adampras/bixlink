CREATE TABLE public.bix_pending_network_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  source_stake_id uuid NOT NULL,
  kind text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  bonus_date date NOT NULL,
  base_usd numeric NOT NULL,
  rate_pct numeric NOT NULL,
  total_usd numeric NOT NULL,
  usdt_amount numeric NOT NULL,
  bix_amount numeric NOT NULL,
  bix_price_usd numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_stake_id, user_id, kind, level, bonus_date)
);
GRANT SELECT ON public.bix_pending_network_bonuses TO authenticated;
GRANT ALL ON public.bix_pending_network_bonuses TO service_role;
ALTER TABLE public.bix_pending_network_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin pending bonus read" ON public.bix_pending_network_bonuses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_bonus_qualified(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT (value->>'holdUntilDeposit')::boolean FROM app_settings WHERE key='referrals'), true) = false
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user AND role = 'admin')
    OR public.bix_lock_exempt_reason(p_user) IS NOT NULL
    OR EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = p_user AND type = 'deposit' AND status = 'approved')
$$;
REVOKE ALL ON FUNCTION public.bix_bonus_qualified(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_hold_network_bonus() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.bix_bonus_qualified(NEW.user_id) THEN RETURN NEW; END IF;
  INSERT INTO bix_pending_network_bonuses(user_id, member_id, source_stake_id, kind, level, bonus_date, base_usd, rate_pct, total_usd, usdt_amount, bix_amount, bix_price_usd, created_at)
  VALUES (NEW.user_id, NEW.member_id, NEW.source_stake_id, NEW.kind, NEW.level, NEW.bonus_date, NEW.base_usd, NEW.rate_pct, NEW.total_usd, NEW.usdt_amount, NEW.bix_amount, NEW.bix_price_usd, COALESCE(NEW.created_at, now()))
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS bix_hold_network_bonus ON public.bix_usdt_network_bonuses;
CREATE TRIGGER bix_hold_network_bonus BEFORE INSERT ON public.bix_usdt_network_bonuses
FOR EACH ROW EXECUTE FUNCTION public.bix_hold_network_bonus();

CREATE OR REPLACE FUNCTION public.bix_release_pending_bonuses(p_user uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.bix_bonus_qualified(p_user) THEN RETURN 0; END IF;
  WITH moved AS (DELETE FROM bix_pending_network_bonuses WHERE user_id = p_user RETURNING *)
  INSERT INTO bix_usdt_network_bonuses(user_id, member_id, source_stake_id, kind, level, bonus_date, base_usd, rate_pct, total_usd, usdt_amount, bix_amount, bix_price_usd)
  SELECT user_id, member_id, source_stake_id, kind, level, bonus_date, base_usd, rate_pct, total_usd, usdt_amount, bix_amount, bix_price_usd FROM moved
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.bix_release_pending_bonuses(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_release_on_deposit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.bix_release_pending_bonuses(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bix_release_on_deposit ON public.wallet_transactions;
CREATE TRIGGER bix_release_on_deposit AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.bix_release_on_deposit();