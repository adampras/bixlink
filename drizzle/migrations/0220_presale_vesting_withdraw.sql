ALTER TABLE public.bix_presale_orders ADD COLUMN IF NOT EXISTS claimed_bix numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bix_presale_claim_released() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r record; v_rel numeric; v_amt numeric; v_total numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  FOR r IN SELECT * FROM public.bix_presale_orders WHERE user_id = v_uid AND status = 'locked' FOR UPDATE LOOP
    v_rel := floor(r.bix_amount * LEAST(1, GREATEST(0, EXTRACT(EPOCH FROM (now() - r.created_at)) / (GREATEST(1, r.release_days) * 86400.0))) * 1e6) / 1e6;
    v_amt := v_rel - r.claimed_bix;
    IF v_amt > 0 THEN
      UPDATE public.bix_presale_orders SET claimed_bix = v_rel WHERE id = r.id;
      v_total := v_total + v_amt;
    END IF;
  END LOOP;
  IF v_total <= 0 THEN RAISE EXCEPTION 'No released BIX to withdraw yet'; END IF;
  INSERT INTO public.bix_allocations(user_id, amount_bix, note, created_by) VALUES (v_uid, v_total, 'Presale vesting release (1%/day)', v_uid);
  RETURN jsonb_build_object('bix', v_total);
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_claim_released() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_claim_released() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_claimed_total() RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(claimed_bix),0) FROM public.bix_presale_orders WHERE user_id = auth.uid() AND status = 'locked'
$$;
REVOKE ALL ON FUNCTION public.bix_presale_claimed_total() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_claimed_total() TO authenticated;