ALTER TABLE public.bix_calls ADD COLUMN IF NOT EXISTS rang_at timestamptz;

CREATE OR REPLACE FUNCTION public.bix_call_ring(p_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE bix_calls SET rang_at = now()
  WHERE id = p_id AND callee_id = auth.uid() AND status = 'ringing' AND rang_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.bix_call_ring(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_ring(uuid) TO authenticated;