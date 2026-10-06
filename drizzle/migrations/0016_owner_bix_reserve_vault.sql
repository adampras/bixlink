CREATE TABLE public.owner_bix_vault (
  owner_id uuid PRIMARY KEY,
  balance_bix numeric NOT NULL DEFAULT 1000000 CHECK (balance_bix >= 0),
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.owner_bix_vault TO authenticated;
GRANT ALL ON public.owner_bix_vault TO service_role;

ALTER TABLE public.owner_bix_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner only vault read"
ON public.owner_bix_vault
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() AND public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_owner_vault()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.owner_bix_vault%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;

  INSERT INTO public.owner_bix_vault (owner_id, balance_bix)
  VALUES (auth.uid(), 1000000)
  ON CONFLICT (owner_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.owner_bix_vault
  WHERE owner_id = auth.uid();

  RETURN jsonb_build_object(
    'balance_bix', v_row.balance_bix,
    'generated_at', v_row.generated_at,
    'updated_at', v_row.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bix_owner_vault() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_owner_vault() TO authenticated;