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
  const { data: own } = await context.supabase.from('bix_owner_deposit_wallets').select('code,label,network,asset,address,enabled,unique_code,unique_label,unique_network,unique_asset,unique_address,unique_enabled').eq('owner_id', context.userId).maybeSingle();
  void wallets; void reviewerDepositWallet;
  const wallet = own && own.address ? { code: own.code, label: own.label, network: own.network, asset: own.asset, address: own.address, enabled: own.enabled, mode: 'flex' } : { code: own?.code ?? 'OWN-NEW', label: own?.label ?? '', network: own?.network ?? 'BEP20', asset: own?.asset ?? 'USDT', address: own?.address ?? '', enabled: own?.enabled ?? false, mode: 'flex' };
  const uniqueWallet = { code: own?.unique_code ?? 'UNQ-NEW', label: own?.unique_label ?? '', network: own?.unique_network ?? 'BEP20', asset: own?.unique_asset ?? 'USDT', address: own?.unique_address ?? '', enabled: own?.unique_enabled ?? false, mode: 'unique' };
  return { wallet: wallet as DepositWallet, uniqueWallet: uniqueWallet as DepositWallet, market: settings['bix_market'] as { priceUsd?: number; movement?: Json } | undefined, referrals: settings['referrals'] as Record<string, Json> | undefined };
});

export const saveReviewerDepositWallet = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((wallet: DepositWallet) => { const { mode, code: _c, ...rest } = wallet; return { ...reviewerWalletSchema.parse({ ...rest, code: 'WLT-01' }), unique: mode === 'unique' }; })
  .handler(async ({ context, data }) => {
    if (!(await isReviewer(context))) throw new Error('Owner 2 access required');
    const { error } = await context.supabase.rpc(data.unique ? 'bix_owner_wallet_save_unique' : 'bix_owner_wallet_save', { p_label: data.label, p_network: data.network, p_asset: data.asset ?? 'USDT', p_address: data.address, p_enabled: data.enabled });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Each reviewer (Owner 2–5) only sees members of their own referral downline; clones always excluded.
async function reviewerScope(admin: any, reviewerId: string): Promise<string[]> {
  const [{ data: refs, error }, { data: clones, error: cloneError }] = await Promise.all([
    admin.from('referral_codes').select('user_id,referred_by'),
    admin.from('bix_clone_accounts').select('user_id'),
  ]);
  if (error) throw error; if (cloneError) throw cloneError;
  const kids = new Map<string, string[]>();
  for (const r of (refs ?? []) as { user_id: string; referred_by: string | null }[]) if (r.referred_by) kids.set(r.referred_by, [...(kids.get(r.referred_by) ?? []), r.user_id]);
  const cloneSet = new Set(((clones ?? []) as { user_id: string }[]).map(c => c.user_id));
  const seen = new Set<string>(); const stack = [...(kids.get(reviewerId) ?? [])];
  while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...(kids.get(id) ?? [])); }
  return [...seen].filter(id => !cloneSet.has(id));
}

export const getReviewerQueue = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await isReviewer(context))) return { reviewer: false as const, items: [] };
  if (!(await readPermissions()).wallet) return { reviewer: true as const, items: [] };
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const scope = await reviewerScope(supabaseAdmin, context.userId);
  if (!scope.length) return { reviewer: true as const, items: [] };
  const { data, error } = await supabaseAdmin.from('wallet_transactions')
    .select('id,type,amount_usd,net_usd,fee_usd,status,tx_hash,address,network,created_at')
    .in('type', ['deposit', 'withdraw']).in('user_id', scope).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return { reviewer: true as const, items: data ?? [] };
});

export const reviewerDecide = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await isReviewer(context))) throw new Error('Owner 2 access required');
    if (!(await readPermissions()).wallet) throw new Error('This Owner 2 section is turned off');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const scope = await reviewerScope(supabaseAdmin, context.userId);
    if (!scope.length) throw new Error('Transaction outside your network.');
    const { data: changed, error } = await supabaseAdmin.from('wallet_transactions').update({ status: data.status, reviewed_at: new Date().toISOString() })
      .eq('id', data.id).eq('status', 'pending').in('type', ['deposit', 'withdraw']).in('user_id', scope).select('id').maybeSingle();
    if (error) throw error;
    if (!changed) throw new Error('Transaction unavailable, outside your network, or already reviewed.');
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

export const REVIEWER_SECTIONS = ['apy', 'wallet', 'market', 'referral', 'leaders'] as const;
export type ReviewerPermissions = Record<(typeof REVIEWER_SECTIONS)[number], boolean>;
const permSchema = z.object({ apy: z.boolean(), wallet: z.boolean(), market: z.boolean(), referral: z.boolean(), leaders: z.boolean() }).strict();
type PermStore = Partial<ReviewerPermissions> & { users?: Record<string, Partial<ReviewerPermissions>> };
async function readStore(): Promise<PermStore> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'reviewer_permissions').maybeSingle();
  return (data?.value ?? {}) as PermStore;
}
// Per-owner override first, then the legacy global value (mirrors bix_reviewer_can in the DB).
const resolve = (s: PermStore, userId?: string): ReviewerPermissions => {
  const u = userId ? s.users?.[userId] : undefined;
  const pick = (k: keyof ReviewerPermissions) => (u?.[k] ?? s[k]) !== false;
  return { apy: pick('apy'), wallet: pick('wallet'), market: pick('market'), referral: pick('referral'), leaders: (u?.leaders ?? s.leaders) === true };
};
async function readPermissions(userId?: string): Promise<ReviewerPermissions> { return resolve(await readStore(), userId); }
async function writeUserPermissions(userId: string, perms: ReviewerPermissions) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const store = await readStore();
  const { error } = await supabaseAdmin.from('app_settings').upsert({ key: 'reviewer_permissions', value: { ...store, users: { ...(store.users ?? {}), [userId]: perms } } as unknown as Json });
  if (error) throw error;
}
export const getReviewerPermissions = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  if (!(await isReviewer(context))) { await verifyOwner(context); return readPermissions(); }
  return readPermissions(context.userId);
});
export const getAllReviewerPermissions = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyOwner(context);
  const store = await readStore();
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'reviewer');
  return Object.fromEntries((data ?? []).map(r => [r.user_id as string, resolve(store, r.user_id as string)]));
});
export const saveReviewerPermissions = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; perms: ReviewerPermissions }) => z.object({ userId: z.string().uuid(), perms: permSchema }).parse(d))
  .handler(async ({ context, data }) => {
    await verifyOwner(context);
    await writeUserPermissions(data.userId, data.perms);
    return readPermissions(data.userId);
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

// Sponsored Leader / Team Leader Support designations: label-only roles, no funds moved.
const leaderSchema = z.object({ userId: z.string().uuid(), kind: z.enum(['sponsored_leader', 'team_support', 'none']), note: z.string().max(200).optional() });
async function leaderAccess(context: { supabase: any; userId: string }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: owner } = await context.supabase.rpc('is_bix_admin');
  if (owner) return { admin: supabaseAdmin, scope: null as Set<string> | null };
  if (!(await isReviewer(context)) || !(await readPermissions(context.userId)).leaders) throw new Error('Leader access is turned off for this Owner');
  return { admin: supabaseAdmin, scope: new Set(await reviewerScope(supabaseAdmin, context.userId)) };
}
export const listNetworkLeaders = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { admin, scope } = await leaderAccess(context);
  const [refs, profs, leaders] = await Promise.all([
    admin.from('referral_codes').select('user_id,code'),
    admin.from('profiles').select('user_id,username,full_name'),
    admin.from('bix_network_leaders').select('user_id,kind,note,updated_at'),
  ]);
  const ids = scope ? [...scope] : (refs.data ?? []).map(r => r.user_id);
  const lead = new Map((leaders.data ?? []).map(l => [l.user_id, l]));
  const prof = new Map((profs.data ?? []).map(p => [p.user_id, p]));
  const code = new Map((refs.data ?? []).map(r => [r.user_id, r.code]));
  return ids.slice(0, 500).map(id => ({ userId: id, code: code.get(id) ?? '—', name: prof.get(id)?.username || prof.get(id)?.full_name || '—', kind: (lead.get(id)?.kind ?? 'none') as 'sponsored_leader' | 'team_support' | 'none', note: lead.get(id)?.note ?? '' }));
});
export const setNetworkLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof leaderSchema>) => leaderSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { admin, scope } = await leaderAccess(context);
    if (scope && !scope.has(data.userId)) throw new Error('Member is outside your sponsor network');
    const res = data.kind === 'none'
      ? await admin.from('bix_network_leaders').delete().eq('user_id', data.userId)
      : await admin.from('bix_network_leaders').upsert({ user_id: data.userId, kind: data.kind, note: data.note ?? null, assigned_by: context.userId, updated_at: new Date().toISOString() });
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

// Deposit audit: real on-chain deposits (3 unique digits) vs non-real support accounts funded by Owner 1.
type AuditCaller = { owner: boolean; scope: Set<string> | null };
async function auditCaller(context: { supabase: any; userId: string }): Promise<AuditCaller> {
  const { data: owner } = await context.supabase.rpc('is_bix_admin');
  if (owner) return { owner: true, scope: null };
  if (!(await isReviewer(context))) throw new Error('Owner access required');
  if (!(await readPermissions(context.userId)).wallet) throw new Error('This Owner 2 section is turned off');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: refs } = await supabaseAdmin.from('referral_codes').select('user_id,referred_by');
  const kids = new Map<string, string[]>();
  for (const r of refs ?? []) if (r.referred_by) kids.set(r.referred_by, [...(kids.get(r.referred_by) ?? []), r.user_id]);
  const seen = new Set<string>(); const stack = [...(kids.get(context.userId) ?? [])];
  while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...(kids.get(id) ?? [])); }
  return { owner: false, scope: seen };
}

export const getDepositAudit = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const caller = await auditCaller(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [txs, intents, clones, leaders, allocs, codes, profs] = await Promise.all([
    supabaseAdmin.from('wallet_transactions').select('id,user_id,amount_usd,status,tx_hash,wallet_code,network,verified_at,created_at').eq('type', 'deposit').order('created_at', { ascending: false }).limit(1000),
    supabaseAdmin.from('deposit_intents').select('user_id,amount_exact,tx_hash,claim_tx_id,status,created_at').limit(5000),
    supabaseAdmin.from('bix_clone_accounts').select('user_id,label,created_at'),
    supabaseAdmin.from('bix_leaders').select('user_id,status,virtual_usd,require_turnover,turnover_multiple,support_kind,created_at'),
    supabaseAdmin.from('bix_allocations').select('user_id,amount_bix'),
    supabaseAdmin.from('referral_codes').select('user_id,code'),
    supabaseAdmin.from('profiles').select('user_id,username,full_name'),
  ]);
  const inScope = (id: string) => !caller.scope || caller.scope.has(id);
  const cloneSet = new Set((clones.data ?? []).map(c => c.user_id));
  const code = new Map((codes.data ?? []).map(c => [c.user_id, c.code]));
  const name = new Map((profs.data ?? []).map(p => [p.user_id, p.username || p.full_name]));
  const byClaim = new Map<string, number>(); const byHash = new Map<string, number>();
  for (const i of intents.data ?? []) { if (i.claim_tx_id) byClaim.set(i.claim_tx_id, Number(i.amount_exact)); if (i.tx_hash) byHash.set(i.tx_hash.toLowerCase(), Number(i.amount_exact)); }
  const real = (txs.data ?? []).filter(t => inScope(t.user_id) && !cloneSet.has(t.user_id)).map(t => {
    const exact = byClaim.get(t.id) ?? (t.tx_hash ? byHash.get(t.tx_hash.toLowerCase()) : undefined) ?? null;
    const unique = exact == null ? null : String(Math.round((exact - Math.floor(exact)) * 1000)).padStart(3, '0');
    return { id: t.id, code: code.get(t.user_id) ?? '—', name: name.get(t.user_id) ?? '—', createdAt: t.created_at, base: exact == null ? Number(t.amount_usd) : Math.floor(exact), unique, exact, txHash: t.tx_hash, wallet: t.wallet_code, network: t.network, status: t.status, onChain: !!t.verified_at || !!t.tx_hash };
  });
  const allocSum = new Map<string, number>();
  for (const a of allocs.data ?? []) allocSum.set(a.user_id, (allocSum.get(a.user_id) ?? 0) + Number(a.amount_bix));
  const support = [
    ...(leaders.data ?? []).filter(l => inScope(l.user_id)).map(l => ({ userId: l.user_id, kind: 'leader' as const, code: code.get(l.user_id) ?? '—', name: name.get(l.user_id) ?? '—', value: `$${Number(l.virtual_usd).toLocaleString('en-US')} virtual`, status: l.status, requireTurnover: l.require_turnover, multiple: Number(l.turnover_multiple), supportKind: (l.support_kind === 'loan' ? 'loan' : 'virtual') as 'loan' | 'virtual', createdAt: l.created_at })),
    ...(clones.data ?? []).filter(c => inScope(c.user_id)).map(c => ({ userId: c.user_id, kind: 'clone' as const, code: code.get(c.user_id) ?? '—', name: c.label, value: `${(allocSum.get(c.user_id) ?? 0).toLocaleString('en-US')} BIX allocation`, status: 'clone', requireTurnover: null as boolean | null, multiple: null as number | null, supportKind: null as 'loan' | 'virtual' | null, createdAt: c.created_at })),
  ];
  return { owner: caller.owner, real, support };
});

export const setSupportQualified = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; requireTurnover: boolean }) => z.object({ userId: z.string().uuid(), requireTurnover: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const caller = await auditCaller(context);
    if (caller.scope && !caller.scope.has(data.userId)) throw new Error('Account outside your network.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: row, error } = await supabaseAdmin.from('bix_leaders').update({ require_turnover: data.requireTurnover, reviewed_at: new Date().toISOString() }).eq('user_id', data.userId).select('user_id').maybeSingle();
    if (error) throw error;
    if (!row) throw new Error('Support account not found.');
    return { ok: true };
  });
