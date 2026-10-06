import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

// Owner 2 = 'reviewer' role: may only approve/reject pending deposits and withdrawals.
const isReviewer = async (context: { supabase: any; userId: string }) => {
  const { data } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  return Boolean(data);
};
const verifyOwner = async (context: { supabase: any }) => {
  const { data, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !data) throw new Error('Owner access required');
};

export const getReviewerQueue = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await isReviewer(context))) return { reviewer: false as const, items: [] };
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('wallet_transactions')
    .select('id,type,amount_usd,net_usd,fee_usd,status,tx_hash,address,network,created_at')
    .in('type', ['deposit', 'withdraw']).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return { reviewer: true as const, items: data ?? [] };
});

export const reviewerDecide = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await isReviewer(context))) throw new Error('Owner 2 access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('wallet_transactions').update({ status: data.status, reviewed_at: new Date().toISOString() })
      .eq('id', data.id).eq('status', 'pending').in('type', ['deposit', 'withdraw']);
    if (error) throw error;
    await supabaseAdmin.from('deposit_intents').update({ status: 'reviewed' }).eq('claim_tx_id', data.id).eq('status', 'pending');
    return { ok: true };
  });

export const listReviewers = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyOwner(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'reviewer');
  return (data ?? []).map(r => r.user_id as string);
});

export const setReviewer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; enabled: boolean }) => z.object({ userId: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await verifyOwner(context);
    if (data.userId === context.userId) throw new Error('Cannot change your own role');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const q = data.enabled
      ? supabaseAdmin.from('user_roles').upsert({ user_id: data.userId, role: 'reviewer' }, { onConflict: 'user_id,role' })
      : supabaseAdmin.from('user_roles').delete().eq('user_id', data.userId).eq('role', 'reviewer');
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });
