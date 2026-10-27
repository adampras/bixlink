ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS expired_at timestamptz;

CREATE TABLE public.bix_vusdt_clawbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  from_transfer numeric NOT NULL DEFAULT 0,
  from_leader numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_vusdt_clawbacks TO authenticated;
GRANT ALL ON public.bix_vusdt_clawbacks TO service_role;
ALTER TABLE public.bix_vusdt_clawbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner1 or self read clawbacks" ON public.bix_vusdt_clawbacks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bix_vusdt_recipients()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(row_to_json(x) ORDER BY x.received DESC) FROM (
    SELECT u.uid AS user_id, p.username, rc.code,
      COALESCE((SELECT sum(amount_usd) FROM vusdt_transfers t WHERE t.recipient_id = u.uid AND t.sender_id = auth.uid()),0) AS received,
      GREATEST(public.bix_vusdt_component(u.uid),0) AS transfer_balance,
      COALESCE((SELECT virtual_usd FROM bix_leaders l WHERE l.user_id = u.uid AND l.status='approved'),0) AS leader_virtual,
      GREATEST(public.bix_wallet_balance(u.uid),0) AS wallet_balance,
      (SELECT support_kind FROM bix_leaders l WHERE l.user_id = u.uid) AS kind
    FROM (SELECT DISTINCT recipient_id uid FROM vusdt_transfers WHERE sender_id = auth.uid()
          UNION SELECT user_id FROM bix_leaders WHERE status='approved') u
    LEFT JOIN profiles p ON p.user_id = u.uid LEFT JOIN referral_codes rc ON rc.user_id = u.uid
    WHERE u.uid <> auth.uid()) x), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.bix_vusdt_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_vusdt_recipients() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_vusdt_clawback(p_user uuid, p_amount numeric, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_comp numeric; v_lead numeric; v_wallet numeric; v_max numeric; a numeric; b numeric; v_from text; v_to text;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'Cannot withdraw from your own account'; END IF;
  IF p_amount IS NULL OR p_amount < 0.01 OR p_amount <> round(p_amount,2) THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vusdt' || p_user::text));
  v_comp := GREATEST(public.bix_vusdt_component(p_user),0);
  v_lead := COALESCE((SELECT virtual_usd FROM bix_leaders WHERE user_id=p_user AND status='approved'),0);
  v_wallet := GREATEST(public.bix_wallet_balance(p_user),0);
  v_max := LEAST(v_comp + v_lead, v_wallet);
  IF p_amount > v_max THEN RAISE EXCEPTION 'Amount exceeds withdrawable virtual balance (%)', round(v_max,2); END IF;
  a := LEAST(p_amount, v_comp); b := p_amount - a;
  IF a > 0 THEN
    SELECT code INTO v_from FROM referral_codes WHERE user_id = p_user;
    SELECT code INTO v_to FROM referral_codes WHERE user_id = auth.uid();
    INSERT INTO vusdt_transfers(sender_id, recipient_id, sender_code, recipient_code, amount_usd, note)
    VALUES (p_user, auth.uid(), COALESCE(v_from,'—'), COALESCE(v_to,'OWNER1'), a, 'Owner 1 withdrawal');
  END IF;
  IF b > 0 THEN UPDATE bix_leaders SET virtual_usd = virtual_usd - b, reviewed_at = now() WHERE user_id = p_user; END IF;
  INSERT INTO bix_vusdt_clawbacks(user_id, amount_usd, from_transfer, from_leader, note, created_by)
  VALUES (p_user, p_amount, a, b, NULLIF(left(trim(coalesce(p_note,'')),160),''), auth.uid());
  RETURN jsonb_build_object('withdrawn', p_amount, 'from_transfer', a, 'from_leader', b);
END $$;
REVOKE ALL ON FUNCTION public.bix_vusdt_clawback(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_vusdt_clawback(uuid, numeric, text) TO authenticated;

-- 30-day rule: real turnover >= 10% of package (personal for sponsored leader, L1 team for loan)
CREATE OR REPLACE FUNCTION public.bix_leader_30d_progress(p_user uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH l AS (SELECT * FROM bix_leaders WHERE user_id = p_user),
  start AS (SELECT COALESCE(reviewed_at, created_at) t FROM l),
  pers AS (SELECT COALESCE(sum(amount_usd),0) v FROM stakes WHERE user_id=p_user AND status IN ('active','completed') AND NOT funded_vusdt AND created_at >= (SELECT t FROM start)),
  team AS (SELECT COALESCE(sum(s.amount_usd),0) v FROM stakes s JOIN referral_codes r ON r.user_id=s.user_id
    WHERE r.referred_by=p_user AND s.status IN ('active','completed') AND NOT s.funded_vusdt AND s.created_at >= (SELECT t FROM start)
      AND NOT EXISTS (SELECT 1 FROM bix_clone_accounts c WHERE c.user_id=s.user_id)
      AND NOT EXISTS (SELECT 1 FROM bix_leaders bl WHERE bl.user_id=s.user_id AND bl.status='approved' AND bl.virtual_usd>0))
  SELECT CASE WHEN p_user = auth.uid() OR public.bix_is_owner1() OR (auth.uid() IS NULL AND current_user='postgres') THEN
    jsonb_build_object('start', (SELECT t FROM start), 'deadline', (SELECT t FROM start) + interval '30 days',
      'kind', (SELECT support_kind FROM l), 'base', (SELECT virtual_usd FROM l),
      'required', round((SELECT virtual_usd FROM l) * 0.10, 2),
      'achieved', CASE WHEN (SELECT support_kind FROM l)='loan' THEN (SELECT v FROM team) ELSE (SELECT v FROM pers) END,
      'expired_at', (SELECT expired_at FROM l)) ELSE NULL END
$$;
REVOKE ALL ON FUNCTION public.bix_leader_30d_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_leader_30d_progress(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_expire_conditional_leaders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; p jsonb; n int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  FOR r IN SELECT user_id FROM bix_leaders WHERE status='approved' AND require_turnover AND expired_at IS NULL
           AND COALESCE(reviewed_at, created_at) < now() - interval '30 days' LOOP
    SELECT jsonb_build_object('a', x->'achieved', 'q', x->'required') INTO p FROM (SELECT public.bix_leader_30d_progress(r.user_id) x) s;
    IF p IS NOT NULL AND (p->>'a')::numeric < (p->>'q')::numeric THEN
      UPDATE bix_leaders SET status='rejected', expired_at=now(), reviewed_at=now() WHERE user_id=r.user_id;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.bix_expire_conditional_leaders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_expire_conditional_leaders() TO authenticated;

SELECT cron.schedule('bix-expire-conditional-leaders', '15 16 * * *', $$SELECT public.bix_expire_conditional_leaders()$$);