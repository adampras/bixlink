ALTER TABLE public.bixtok_lives ADD COLUMN IF NOT EXISTS likes bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bixtok_live_like(p_live uuid, p_n integer)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.bixtok_lives SET likes = likes + LEAST(GREATEST(COALESCE(p_n, 1), 1), 50)
  WHERE id = p_live AND status = 'live' RETURNING likes INTO v;
  RETURN COALESCE(v, 0);
END $$;
REVOKE ALL ON FUNCTION public.bixtok_live_like(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_live_like(uuid, integer) TO authenticated;