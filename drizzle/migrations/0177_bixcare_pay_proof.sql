ALTER TABLE public.bixcare_orders ADD COLUMN IF NOT EXISTS proof_path text;
CREATE OR REPLACE FUNCTION public.bixcare_order_proof(p_id uuid, p_path text, p_ref text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bixcare_orders;
BEGIN
  SELECT * INTO r FROM public.bixcare_orders WHERE id=p_id FOR UPDATE;
  IF r.id IS NULL OR r.buyer_id<>auth.uid() THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  IF r.pay_method NOT IN ('qris','bank') THEN RAISE EXCEPTION 'Hanya untuk QRIS/transfer'; END IF;
  IF r.status IN ('completed','cancelled','rejected') THEN RAISE EXCEPTION 'Order sudah ditutup'; END IF;
  IF p_path IS NULL OR split_part(p_path,'/',1)<>auth.uid()::text THEN RAISE EXCEPTION 'File bukti tidak valid'; END IF;
  UPDATE public.bixcare_orders SET proof_path=left(p_path,200), paid_at=COALESCE(paid_at,now()), pay_ref=CASE WHEN COALESCE(p_ref,'')='' THEN pay_ref ELSE left(p_ref,80) END WHERE id=p_id;
  RETURN jsonb_build_object('proof',true);
END $$;
REVOKE ALL ON FUNCTION public.bixcare_order_proof(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixcare_order_proof(uuid,text,text) TO authenticated;