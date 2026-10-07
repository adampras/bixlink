import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

// Owner 2 = 'reviewer' role: may only approve/reject pending deposits and withdrawals.
const isReviewer = async (context: { supabase: any; userId: string }) => {
  const { data, error } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  if (error) throw error;
  return Boolean(data);
};
const verifyOwner = async (context: { supabase: any }) => {
  const { data, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !data) throw new Error('Owner access required');
};

export const getReviewerQueue = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await isReviewer(context))) return { reviewer: false as const, items: [] };
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  // Hide owner clone accounts from the Owner 2 queue entirely.
  const { data: clones, error: cloneError } = await supabaseAdmin.from('bix_clone_accounts').select('user_id');
  if (cloneError) throw cloneError;
  const cloneIds = (clones ?? []).map((c: { user_id: string }) => c.user_id);
  let query = supabaseAdmin.from('wallet_transactions')
    .select('id,type,amount_usd,net_usd,fee_usd,status,tx_hash,address,network,created_at')
    .in('type', ['deposit', 'withdraw']).order('created_at', { ascending: false }).limit(200);
  if (cloneIds.length) query = query.not('user_id', 'in', `(${cloneIds.join(',')})`);
  const { data, error } = await query;
  if (error) throw error;
  return { reviewer: true as const, items: data ?? [] };
});

export const reviewerDecide = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await isReviewer(context))) throw new Error('Owner 2 access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: clones, error: cloneError } = await supabaseAdmin.from('bix_clone_accounts').select('user_id');
    if (cloneError) throw cloneError;
    const cloneIds = (clones ?? []).map(c => c.user_id);
    let query = supabaseAdmin.from('wallet_transactions').update({ status: data.status, reviewed_at: new Date().toISOString() })
      .eq('id', data.id).eq('status', 'pending').in('type', ['deposit', 'withdraw']);
    if (cloneIds.length) query = query.not('user_id', 'in', `(${cloneIds.join(',')})`);
    const { data: changed, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!changed) throw new Error('Transaction unavailable or already reviewed.');
    await supabaseAdmin.from('deposit_intents').update({ status: 'reviewed' }).eq('claim_tx_id', data.id).eq('status', 'pending');
    return { ok: true };
  });

export const listReviewers = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyOwner(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'reviewer');
  if (error) throw error;
  return (data ?? []).map(r => r.user_id as string);
});

export const setReviewer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; enabled: boolean }) => z.object({ userId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await verifyOwner(context);
    if (data.userId === context.userId) throw new Error('Cannot change your own role');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.enabled) {
      const { data: existing, error: readError } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.userId).eq('role', 'reviewer').maybeSingle();
      if (readError) throw readError;
      if (!existing) {
        const { error } = await supabaseAdmin.from('user_roles').insert({ user_id: data.userId, role: 'reviewer' });
        if (error) throw error;
      }
    } else {
      const { error } = await supabaseAdmin.from('user_roles').delete().eq('user_id', data.userId).eq('role', 'reviewer');
      if (error) throw error;
    }
    const { data: savedRole, error: verifyError } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', data.userId).eq('role', 'reviewer').maybeSingle();
    if (verifyError) throw verifyError;
    if (Boolean(savedRole) !== data.enabled) throw new Error('Owner 2 change was not saved. Please try again.');
    return { ok: true };
  });
