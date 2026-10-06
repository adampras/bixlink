CREATE OR REPLACE FUNCTION public.bix_referral_tree_metrics()
RETURNS TABLE(
  user_id uuid,
  parent_id uuid,
  depth integer,
  member_code text,
  username text,
  full_name text,
  top_package text,
  stake_value_usd numeric,
  weekly_stake_usd numeric,
  total_turnover_usd numeric,
  weekly_turnover_usd numeric,
  weekly_direct_count integer,
  weekly_reward_usd numeric,
  weekly_qualified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE tree AS (
    SELECT
      r.user_id,
      r.referred_by,
      1 AS depth,
      ARRAY[r.user_id] AS path
    FROM public.referral_codes r
    WHERE r.referred_by = auth.uid()
    UNION ALL
    SELECT
      child.user_id,
      child.referred_by,
      t.depth + 1,
      t.path || child.user_id
    FROM public.referral_codes child
    JOIN tree t ON child.referred_by = t.user_id
    WHERE NOT child.user_id = ANY(t.path)
  ),
  reset AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'Asia/Makassar') AT TIME ZONE 'Asia/Makassar' AS week_start
  ),
  active_stakes AS (
    SELECT user_id, package_id, amount_usd, created_at, COALESCE(activated_at, created_at) AS activated_on
    FROM public.stakes
    WHERE status = 'active'
  ),
  stake_summary AS (
    SELECT
      user_id,
      COALESCE(sum(amount_usd), 0) AS stake_value_usd,
      COALESCE(sum(amount_usd) FILTER (WHERE activated_on >= (SELECT week_start FROM reset)), 0) AS weekly_stake_usd,
      (array_agg(package_id ORDER BY amount_usd DESC, created_at DESC))[1] AS top_package
    FROM active_stakes
    GROUP BY user_id
  ),
  subtree AS (
    SELECT
      t.user_id AS root_id,
      d.user_id AS descendant_id
    FROM tree t
    JOIN tree d ON d.path @> ARRAY[t.user_id]
  ),
  turnover AS (
    SELECT
      s.root_id,
      COALESCE(sum(a.amount_usd), 0) AS total_turnover_usd,
      COALESCE(sum(a.amount_usd) FILTER (WHERE a.activated_on >= (SELECT week_start FROM reset)), 0) AS weekly_turnover_usd
    FROM subtree s
    JOIN active_stakes a ON a.user_id = s.descendant_id
    GROUP BY s.root_id
  ),
  weekly_direct AS (
    SELECT
      t.referred_by AS sponsor_id,
      count(DISTINCT t.user_id)::integer AS direct_count,
      COALESCE(sum(a.amount_usd), 0) AS direct_turnover
    FROM tree t
    JOIN active_stakes a ON a.user_id = t.user_id
    WHERE a.activated_on >= (SELECT week_start FROM reset)
    GROUP BY t.referred_by
  ),
  reward_cfg AS (
    SELECT COALESCE((value ->> 'rewardPlus')::numeric, 5) AS pct
    FROM public.app_settings
    WHERE key = 'referrals'
  )
  SELECT
    t.user_id,
    t.referred_by AS parent_id,
    t.depth,
    rc.code AS member_code,
    COALESCE(p.username, '') AS username,
    COALESCE(p.full_name, '') AS full_name,
    COALESCE(ss.top_package, 'NONE') AS top_package,
    COALESCE(ss.stake_value_usd, 0) AS stake_value_usd,
    COALESCE(ss.weekly_stake_usd, 0) AS weekly_stake_usd,
    COALESCE(tv.total_turnover_usd, 0) AS total_turnover_usd,
    COALESCE(tv.weekly_turnover_usd, 0) AS weekly_turnover_usd,
    COALESCE(wd.direct_count, 0) AS weekly_direct_count,
    round(COALESCE(wd.direct_turnover, 0) * COALESCE((SELECT pct FROM reward_cfg), 5) / 100, 2) AS weekly_reward_usd,
    COALESCE(wd.direct_count, 0) >= 3 AS weekly_qualified
  FROM tree t
  LEFT JOIN public.referral_codes rc ON rc.user_id = t.user_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  LEFT JOIN stake_summary ss ON ss.user_id = t.user_id
  LEFT JOIN turnover tv ON tv.root_id = t.user_id
  LEFT JOIN weekly_direct wd ON wd.sponsor_id = t.user_id
$function$;

REVOKE ALL ON FUNCTION public.bix_referral_tree_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_referral_tree_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION public.request_bix_withdraw(p_amount numeric, p_address text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_fee numeric;
  v_status jsonb;
  v_balance numeric;
  v_today numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is $10'; END IF;
  IF p_amount > 10000 THEN RAISE EXCEPTION 'Maximum withdrawal is $10,000 per day per account'; END IF;
  IF length(trim(coalesce(p_address,''))) < 20 THEN RAISE EXCEPTION 'Valid wallet address required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT COALESCE(sum(amount_usd), 0) INTO v_today
  FROM public.wallet_transactions
  WHERE user_id = auth.uid()
    AND type = 'withdraw'
    AND status IN ('pending','approved')
    AND created_at >= date_trunc('day', now());
  IF v_today + p_amount > 10000 THEN RAISE EXCEPTION 'Daily withdrawal limit is $10,000 per account'; END IF;
  v_balance := public.bix_wallet_balance(auth.uid());
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_status := public.bix_leader_status(auth.uid());
  IF NOT (v_status ->> 'qualified')::boolean AND p_amount > v_balance - (v_status ->> 'virtual_usd')::numeric THEN
    RAISE EXCEPTION 'Leader virtual balance unlocks after network turnover reaches %x your stake package', v_status ->> 'multiple';
  END IF;
  v_fee := round(1 + p_amount * 0.005, 2);
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,address)
  VALUES (auth.uid(),'withdraw',p_amount,v_fee,p_amount - v_fee,trim(p_address)) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;

REVOKE ALL ON FUNCTION public.request_bix_withdraw(numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_bix_withdraw(numeric,text) TO authenticated;