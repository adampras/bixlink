ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS source_stake_id uuid REFERENCES public.stakes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reward_rate_pct numeric;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_direct_stake_unique
  ON public.wallet_transactions(source_stake_id)
  WHERE source_stake_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bix_credit_usdt_direct_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sponsor uuid;
  v_cfg jsonb;
  v_pct numeric;
  v_amount numeric;
BEGIN
  IF NEW.status <> 'active' OR (TG_OP = 'UPDATE' AND OLD.status = 'active') THEN
    RETURN NEW;
  END IF;

  SELECT referred_by INTO v_sponsor
  FROM public.referral_codes
  WHERE user_id = NEW.user_id;

  IF v_sponsor IS NULL OR v_sponsor = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_cfg FROM public.app_settings WHERE key = 'referrals';
  v_pct := LEAST(100, GREATEST(0, COALESCE((v_cfg ->> 'direct')::numeric, 10)));
  v_amount := round(NEW.amount_usd * v_pct / 100, 2);

  IF v_amount > 0 THEN
    INSERT INTO public.wallet_transactions(
      user_id, type, amount_usd, fee_usd, net_usd, status, note,
      source_stake_id, reward_rate_pct, reviewed_at
    ) VALUES (
      v_sponsor, 'reward', v_amount, 0, v_amount, 'approved',
      'Direct sponsor bonus · virtual USDT staking', NEW.id, v_pct, now()
    )
    ON CONFLICT (source_stake_id) WHERE source_stake_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS stakes_credit_usdt_direct_bonus ON public.stakes;
CREATE TRIGGER stakes_credit_usdt_direct_bonus
AFTER INSERT OR UPDATE OF status ON public.stakes
FOR EACH ROW
EXECUTE FUNCTION public.bix_credit_usdt_direct_bonus();

INSERT INTO public.wallet_transactions(
  user_id, type, amount_usd, fee_usd, net_usd, status, note,
  source_stake_id, reward_rate_pct, reviewed_at
)
SELECT
  r.referred_by,
  'reward',
  round(s.amount_usd * cfg.pct / 100, 2),
  0,
  round(s.amount_usd * cfg.pct / 100, 2),
  'approved',
  'Direct sponsor bonus · virtual USDT staking',
  s.id,
  cfg.pct,
  now()
FROM public.stakes s
JOIN public.referral_codes r ON r.user_id = s.user_id AND r.referred_by IS NOT NULL AND r.referred_by <> s.user_id
CROSS JOIN LATERAL (
  SELECT LEAST(100, GREATEST(0, COALESCE((value ->> 'direct')::numeric, 10))) AS pct
  FROM public.app_settings
  WHERE key = 'referrals'
) cfg
WHERE s.status = 'active'
  AND cfg.pct > 0
  AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = s.user_id)
ON CONFLICT (source_stake_id) WHERE source_stake_id IS NOT NULL DO NOTHING;

REVOKE ALL ON FUNCTION public.bix_credit_usdt_direct_bonus() FROM PUBLIC, anon, authenticated;