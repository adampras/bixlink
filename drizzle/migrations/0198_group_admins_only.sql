ALTER TABLE public.bix_groups ADD COLUMN IF NOT EXISTS admins_only boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS "members post messages" ON public.bix_group_messages;
CREATE POLICY "members post messages" ON public.bix_group_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND public.bix_group_is_member(group_id) AND (
    NOT EXISTS (SELECT 1 FROM public.bix_groups g WHERE g.id = group_id AND g.admins_only)
    OR EXISTS (SELECT 1 FROM public.bix_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bix_group_members m WHERE m.group_id = bix_group_messages.group_id AND m.user_id = auth.uid() AND m.is_admin)
  ));