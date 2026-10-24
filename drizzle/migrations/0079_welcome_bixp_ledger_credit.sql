CREATE OR REPLACE FUNCTION public.bix_grant_welcome(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_amt numeric;
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user AND email_confirmed_at IS NOT NULL) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = p_user) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_quest_claims WHERE user_id = p_user AND quest_key = 'welcome') THEN RETURN; END IF;
  v_amt := GREATEST(COALESCE((public.bix_arena_config()->'rewards'->>'welcome')::numeric, 100), 0);
  IF v_amt <= 0 THEN RETURN; END IF;
  INSERT INTO public.bix_quest_claims(user_id, quest_key, period_key, amount_vbix) VALUES (p_user, 'welcome', 'once', v_amt);
  INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (p_user, p_user, 'welcome', 0, v_amt);
END $$;