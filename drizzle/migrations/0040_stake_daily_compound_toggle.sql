ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS compound boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.bix_set_stake_compound(p_stake uuid, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  UPDATE public.stakes SET compound = COALESCE(p_on,false) WHERE id = p_stake AND user_id = auth.uid() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active stake not found'; END IF;
END $$;