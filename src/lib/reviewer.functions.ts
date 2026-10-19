import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { reviewerDepositWallet, reviewerWalletSchema } from '@/lib/reviewer-policy';
import type { DepositWallet } from '@/lib/deposit.functions';
import type { Json } from '@/integrations/supabase/types';

// Reviewer permissions stay scoped; this role never grants general owner access.
const isReviewer = async (context: { supabase: any; userId: string }) => {
  const { data, error } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  if (error) throw error;
  return Boolean(data);
};
const verifyOwner = async (context: { supabase: any }) => {
  const { data, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !data) throw new Error('Owner access required');
};

export const getReviewerSettings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await isReviewer(context))) throw new Error('Owner 2 access required');
  const { data, error } = await context.supabase.from('app_settings').select('key,value').in('key', ['deposit_wallets', 'bix_market', 'referrals']);
  if (error) throw error;
  const settings = Object.fromEntries((data ?? []).map(row => [row.key, row.value]));
  const wallets = (settings['deposit_wallets'] as { wallets?: DepositWallet[] } | undefined)?.wallets ?? [];
  return { wallet: reviewerDepositWallet(wallets), market: settings['bix_market'] as { priceUsd?: number; movement?: Json } | undefined, referrals: settings['referrals'] as Record<string, Json> | undefined };
});

export const saveReviewerDepositWallet = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((wallet: DepositWallet) => reviewerWalletSchema.parse(wallet))
  .handler(async ({ context, data }) => {
    if (!(await isReviewer(context))) throw new Error('Owner 2 access required');
    const { error } = await context.supabase.rpc('bix_reviewer_save_wallet', { p_wallet: data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getReviewerQueue = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await isReviewer(context))) return { reviewer: false as const, items: [] };
  if (!(await readPermissions()).wallet) return { reviewer: true as const, items: [] };
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
    if (!(await readPermissions()).wallet) throw new Error('This Owner 2 section is turned off');
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

export const REVIEWER_SECTIONS = ['apy', 'wallet', 'market', 'referral'] as const;
export type ReviewerPermissions = Record<(typeof REVIEWER_SECTIONS)[number], boolean>;
const permSchema = z.object({ apy: z.boolean(), wallet: z.boolean(), market: z.boolean(), referral: z.boolean() }).strict();
async function readPermissions(): Promise<ReviewerPermissions> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'reviewer_permissions').maybeSingle();
  const v = (data?.value ?? {}) as Partial<ReviewerPermissions>;
  return { apy: v.apy !== false, wallet: v.wallet !== false, market: v.market !== false, referral: v.referral !== false };
}
export const getReviewerPermissions = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const owner = await context.supabase.rpc('is_bix_admin');
  if (!owner.data && !(await isReviewer(context))) throw new Error('Access required');
  return readPermissions();
});
export const saveReviewerPermissions = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: ReviewerPermissions) => permSchema.parse(d))
  .handler(async ({ context, data }) => {
    await verifyOwner(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('app_settings').upsert({ key: 'reviewer_permissions', value: data });
    if (error) throw error;
    return readPermissions();
  });

// Owner-only turnover report: approved USDT deposits/withdrawals per sub-owner network vs whole platform.
export const getOwnerTurnover = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyOwner(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [roles, refs, txs, clones] = await Promise.all([
    supabaseAdmin.from('user_roles').select('user_id').eq('role', 'reviewer'),
    supabaseAdmin.from('referral_codes').select('user_id,referred_by,code'),
    supabaseAdmin.from('wallet_transactions').select('user_id,type,amount_usd,status').in('type', ['deposit', 'withdraw']).eq('status', 'approved').limit(20000),
    supabaseAdmin.from('bix_clone_accounts').select('user_id'),
  ]);
  const cloneSet = new Set((clones.data ?? []).map(c => c.user_id));
  const kids = new Map<string, string[]>();
  for (const r of refs.data ?? []) if (r.referred_by) kids.set(r.referred_by, [...(kids.get(r.referred_by) ?? []), r.user_id]);
  const sum = (ids: Set<string> | null) => { let dep = 0, wd = 0, n = 0; for (const t of txs.data ?? []) { if (cloneSet.has(t.user_id) || (ids && !ids.has(t.user_id))) continue; if (t.type === 'deposit') { dep += Number(t.amount_usd); n++; } else wd += Number(t.amount_usd); } return { deposit: dep, withdraw: wd, count: n }; };
  const owners = (roles.data ?? []).map(({ user_id }) => {
    const seen = new Set<string>(); const stack = [...(kids.get(user_id) ?? [])];
    while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...(kids.get(id) ?? [])); }
    return { userId: user_id, code: (refs.data ?? []).find(r => r.user_id === user_id)?.code ?? '—', members: seen.size, ...sum(seen) };
  });
  return { total: sum(null), owners };
});
