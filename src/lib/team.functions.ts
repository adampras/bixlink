import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Team account controls remain exclusively with Owner 1.
async function canManage(context: { supabase: any; userId: string }) {
  const { data: admin } = await context.supabase.rpc('is_bix_admin');
  if (admin) return true;
  return false;
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

/** Owner 1 only: create a confirmed member account with any email (no inbox confirmation). */
export const createAccountByOwner = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; fullName: string; username: string }) => z.object({
    email: z.string().trim().email().max(160), password: z.string().min(8).max(200),
    fullName: z.string().trim().min(2).max(80), username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,24}$/),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const owner1 = await canManage(context);
    let reviewer = false;
    if (!owner1) {
      const { data: role } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
      reviewer = Boolean(role);
    }
    if (!owner1 && !reviewer) throw new Error('Owner access required');
    const { data: free } = await supabaseAdmin.rpc('bix_username_available', { p_username: data.username });
    if (!free) throw new Error('Username sudah dipakai');
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email.toLowerCase(), password: data.password, email_confirm: true, user_metadata: { full_name: data.fullName, username: data.username } });
    if (error) throw new Error(error.message);
    const newId = u.user?.id ?? null;
    // Owner 2–5 accounts land directly in that Owner's own network; code row is created now so the tree shows it immediately.
    const { provisionMember } = await import('./member-account.server');
    if (newId) await provisionMember(supabaseAdmin, newId, data.fullName, data.username, reviewer ? context.userId : null);
    return { ok: true, userId: newId };
  });

/** Owner 1: change any member's email. Owner 2–5: only members inside their own network. Email is confirmed immediately. */
export const changeMemberEmail = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { member: string; newEmail: string }) => z.object({ member: z.string().trim().min(3).max(160), newEmail: z.string().trim().email().max(160) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const owner1 = await canManage(context);
    let reviewer = false;
    if (!owner1) {
      const { data: role } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
      reviewer = Boolean(role);
    }
    if (!owner1 && !reviewer) throw new Error('Owner access required');
    const key = data.member.trim();
    let targetId: string | null = null;
    if (key.includes('@')) {
      const { data: rows } = await supabaseAdmin.rpc('bix_find_user_by_email' as any, { p_email: key.toLowerCase() }) as any;
      targetId = rows ?? null;
    } else {
      const { data: rc } = await supabaseAdmin.from('referral_codes').select('user_id').eq('code', key.toUpperCase()).maybeSingle();
      targetId = rc?.user_id ?? null;
      if (!targetId) { const { data: p } = await supabaseAdmin.from('profiles').select('user_id').ilike('username', key.toLowerCase()).maybeSingle(); targetId = p?.user_id ?? null; }
    }
    if (!targetId) throw new Error('Member tidak ditemukan');
    const { data: target } = await supabaseAdmin.auth.admin.getUserById(targetId);
    if (target.user?.email?.toLowerCase() === 'bixdevpras@gmail.com') throw new Error('Email Owner 1 tidak bisa diubah di sini');
    if (!owner1) {
      const { inDownline } = await import('./member-account.server');
      if (targetId === context.userId || !(await inDownline(supabaseAdmin, context.userId, targetId))) throw new Error('Member bukan bagian dari jaringan Anda');
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { email: data.newEmail.toLowerCase(), email_confirm: true });
    if (error) throw new Error(error.message.includes('already') ? 'Email sudah dipakai akun lain' : error.message);
    await supabaseAdmin.from('bix_team_accounts').update({ email: data.newEmail.toLowerCase() }).eq('user_id', targetId);
    await supabaseAdmin.from('bix_clone_accounts').update({ email: data.newEmail.toLowerCase() }).eq('user_id', targetId);
    return { ok: true };
  });
