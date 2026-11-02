ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS withdraw_min_bix numeric NOT NULL DEFAULT 100;
CREATE OR REPLACE FUNCTION public.bixtok_claim_earnings() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bix numeric; v_min numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bixtok-claim-' || auth.uid()::text));
  SELECT COALESCE(MAX(withdraw_min_bix),100) INTO v_min FROM bixtok_config;
  SELECT COALESCE(SUM(amount),0) INTO v_bix FROM bixtok_gift_tx WHERE recipient_id = auth.uid() AND claimed_at IS NULL AND currency='BIX';
  IF v_bix <= 0 THEN RAISE EXCEPTION 'No BIXTOK earnings to withdraw'; END IF;
  IF v_bix < v_min THEN RAISE EXCEPTION 'Minimum withdraw % BIX', v_min; END IF;
  UPDATE bixtok_gift_tx SET claimed_at = now() WHERE recipient_id = auth.uid() AND claimed_at IS NULL AND currency='BIX';
  RETURN jsonb_build_object('bix', v_bix, 'bixp', 0);
END $$;
REVOKE ALL ON FUNCTION public.bixtok_claim_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_claim_earnings() TO authenticated;