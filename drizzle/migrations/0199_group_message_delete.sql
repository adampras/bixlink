ALTER TABLE public.bix_group_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE OR REPLACE FUNCTION public.bix_group_delete_message(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.bix_group_messages;
BEGIN
  SELECT * INTO r FROM public.bix_group_messages WHERE id = p_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Pesan tidak ditemukan'; END IF;
  IF r.sender_id <> auth.uid() AND NOT public.bix_group_can_manage(r.group_id) THEN RAISE EXCEPTION 'Tidak diizinkan'; END IF;
  UPDATE public.bix_group_messages SET body = '🚫 Pesan ini telah dihapus', deleted_at = now() WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.bix_group_delete_message(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_group_delete_message(uuid) TO authenticated;