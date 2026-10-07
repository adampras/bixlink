import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Owner 1 (admin) or Owner 2 (reviewer) may view and activate/deactivate team accounts.
async function canManage(context: { supabase: any; userId: string }) {
  const { data: admin } = await context.supabase.rpc('is_bix_admin');
  if (admin) return true;
  const { data } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  return Boolean(data);
}

export const getTeamAccounts = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await canManage(context))) throw new Error('Owner access required');
  const { data, error } = await context.supabase.from('bix_team_accounts').select('*').order('created_at');
  if (error) throw error;
  return data ?? [];
});

export const setTeamAccountActive = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; active: boolean }) => z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await canManage(context))) throw new Error('Owner access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row } = await supabaseAdmin.from('bix_team_accounts').select('user_id').eq('user_id', data.userId).maybeSingle();
    if (!row) throw new Error('Not a team account');
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? 'none' : '876000h' });
    if (banErr) throw banErr;
    const { error } = await supabaseAdmin.from('bix_team_accounts').update({ active: data.active, updated_at: new Date().toISOString() }).eq('user_id', data.userId);
    if (error) throw error;
    return { ok: true };
  });
