import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';

const verifyAdmin = async (context: { supabase: any; userId: string; claims?: any }) => {
  const { data: admin, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !admin) throw new Error('Owner access required');
};

export const getMyData = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [stakes, referral, tree, admin] = await Promise.all([
    context.supabase.from('stakes').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('*').eq('user_id', context.userId).maybeSingle(),
    context.supabase.rpc('bix_referral_tree'), context.supabase.rpc('is_bix_admin'),
  ]);
  if (stakes.error) throw stakes.error;
  if (tree.error) throw tree.error;
  return { stakes: stakes.data ?? [], referral: referral.data, tree: tree.data ?? [], isAdmin: Boolean(admin.data) };
});

export const assignReferral = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => z.object({ code: z.string().regex(/^BIX-\d{6}$/i) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: linked, error } = await context.supabase.rpc('assign_bix_referrer', { p_code: data.code });
    if (error) throw error;
    return { linked: Boolean(linked) };
  });

export const requestStake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string }) => z.object({ packageId: z.string().min(1).max(40) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_stake', { p_package: data.packageId });
    if (error) throw error;
    return { id };
  });

export const createReferral = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: existing } = await context.supabase.from('referral_codes').select('code').eq('user_id', context.userId).maybeSingle();
  if (existing) return existing;
  const code = `BIX-${Math.floor(100000 + Math.random() * 900000)}`;
  const { data, error } = await context.supabase.from('referral_codes').insert({ user_id: context.userId, code }).select('code').single();
  if (error) throw error;
  return data;
});

export const bootstrapOwner = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { getRequestHeader } = await import('@tanstack/react-start/server');
  const token = getRequestHeader('authorization')?.replace(/^Bearer /, '');
  if (!token) return { owner: false };
  const { data: identity, error: identityError } = await context.supabase.auth.getUser(token);
  if (identityError || identity.user?.id !== context.userId || identity.user.email?.toLowerCase() !== 'bixdevpras@gmail.com' || !identity.user.email_confirmed_at) return { owner: false };
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('user_roles').upsert({ user_id: context.userId, role: 'admin' }, { onConflict: 'user_id,role' });
  if (error) throw error;
  return { owner: true };
});

export const getAdminData = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [stakes, packages, settings, sources, referrals] = await Promise.all([
    context.supabase.from('stakes').select('*').order('created_at', { ascending: false }),
    context.supabase.from('packages').select('*').order('price_usd'),
    context.supabase.from('app_settings').select('*'),
    context.supabase.from('income_sources').select('*').order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('*'),
  ]);
  for (const result of [stakes, packages, settings, sources, referrals]) if (result.error) throw result.error;
  const members: { id: string; email: string; created_at: string; banned_until: string | null }[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data: batch, error: membersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (membersError) throw membersError;
    members.push(...batch.users.map(user => ({ id: user.id, email: user.email ?? '', created_at: user.created_at, banned_until: user.banned_until ?? null })));
    if (batch.users.length < 1000) break;
  }
  return { stakes: stakes.data ?? [], packages: packages.data ?? [], settings: settings.data ?? [], sources: sources.data ?? [], referrals: referrals.data ?? [], members };
});

export const manageMember = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; action: 'ban' | 'unban' }) => z.object({ id: z.string().uuid(), action: z.enum(['ban', 'unban']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    if (data.id === context.userId) throw new Error('Cannot change your own access');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.action === 'ban' ? '876000h' : 'none' });
    if (error) throw error;
    return { ok: true };
  });

export const updateStake = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: 'active' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['active','rejected']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('stakes').update({ status: data.status, activated_at: data.status === 'active' ? new Date().toISOString() : null }).eq('id', data.id).eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  });

export const updatePackage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; price_usd: number; apy: number; lock_days: number; daily_profit_enabled: boolean }) => z.object({ id: z.string(), price_usd: z.number().positive(), apy: z.number().min(0).max(25), lock_days: z.number().int().positive(), daily_profit_enabled: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { id, ...values } = data;
    const { error } = await context.supabase.from('packages').update(values).eq('id', id);
    if (error) throw error;
    return { ok: true };
  });

export const updateSetting = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { key: 'booster' | 'booster_visual' | 'referrals' | 'wallet' | 'swap' | 'bix_market' | 'bix_pay' | 'landing_content'; value: Record<string, unknown> }) => {
    const parsed = z.object({ key: z.enum(['booster','booster_visual','referrals','wallet','swap','bix_market','bix_pay','landing_content']), value: z.record(z.unknown()) }).parse(data);
    if (parsed.key === 'bix_market') z.object({ priceUsd: z.number().positive().max(1_000_000) }).parse(parsed.value);
    if (parsed.key === 'landing_content') z.object({ ecosystem: z.array(z.object({ title: z.string().trim().min(1).max(60), description: z.string().trim().min(1).max(240) })).min(1).max(12), income: z.array(z.object({ title: z.string().trim().min(1).max(60), description: z.string().trim().min(1).max(240) })).min(1).max(12) }).parse(parsed.value);
    return parsed;
  })
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('app_settings').upsert({ key: data.key, value: data.value as Json });
    if (error) throw error;
    return { ok: true };
  });

export const addIncomeSource = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { category: 'FOREX' | 'CRYPTO' | 'RWA' | 'ADVERTISING'; name: string; amount_usd: number }) => z.object({ category: z.enum(['FOREX','CRYPTO','RWA','ADVERTISING']), name: z.string().min(1).max(100), amount_usd: z.number().min(0) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('income_sources').insert(data);
    if (error) throw error;
    return { ok: true };
  });

export const getMyWallet = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [txs, balances, swaps] = await Promise.all([
    context.supabase.from('wallet_transactions').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.rpc('bix_asset_balances', { p_user: context.userId }).single(),
    context.supabase.from('swap_requests').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
  ]);
  if (txs.error) throw txs.error;
  if (balances.error) throw balances.error;
  if (swaps.error) throw swaps.error;
  return { transactions: txs.data ?? [], swaps: swaps.data ?? [], balance: Number(balances.data?.usdt_balance ?? 0), usdtBalance: Number(balances.data?.usdt_balance ?? 0), bixBalance: Number(balances.data?.bix_balance ?? 0) };
});

export const requestSwap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { direction: 'USDT_TO_BIX' | 'BIX_TO_USDT'; amount: number }) => z.object({ direction: z.enum(['USDT_TO_BIX','BIX_TO_USDT']), amount: z.number().positive().max(100000000) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_swap', { p_direction: data.direction, p_amount: data.amount });
    if (error) throw new Error(error.message);
    return { id };
  });

export const requestDeposit = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number; txHash: string }) => z.object({ amount: z.number().min(1).max(1000000), txHash: z.string().trim().min(8).max(200) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_deposit', { p_amount: data.amount, p_tx_hash: data.txHash });
    if (error) throw new Error(error.message);
    return { id };
  });

export const requestWithdraw = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number; address: string }) => z.object({ amount: z.number().min(5).max(1000000), address: z.string().trim().min(20).max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('request_bix_withdraw', { p_amount: data.amount, p_address: data.address });
    if (error) throw new Error(error.message);
    return { id };
  });

export const getAdminWallet = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [transactions, swaps] = await Promise.all([
    context.supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }),
    context.supabase.from('swap_requests').select('*').order('created_at', { ascending: false }),
  ]);
  if (transactions.error) throw transactions.error;
  if (swaps.error) throw swaps.error;
  return { transactions: transactions.data ?? [], swaps: swaps.data ?? [] };
});

export const reviewWalletTx = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('wallet_transactions').update({ status: data.status, reviewed_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  });

export const reviewSwap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: 'approved' | 'rejected' }) => z.object({ id: z.string().uuid(), status: z.enum(['approved', 'rejected']) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('swap_requests').update({ status: data.status, reviewed_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'pending');
    if (error) throw error;
    return { ok: true };
  });

export const addReward = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; amount: number; note: string }) => z.object({ userId: z.string().uuid(), amount: z.number().positive().max(1000000), note: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('wallet_transactions').insert({ user_id: data.userId, type: 'reward', amount_usd: data.amount, fee_usd: 0, net_usd: data.amount, status: 'approved', note: data.note, reviewed_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true };
  });

export const getBixPay = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [me, list, bal] = await Promise.all([
    context.supabase.from('referral_codes').select('code').eq('user_id', context.userId).maybeSingle(),
    context.supabase.from('bix_transfers').select('*').or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`).order('created_at', { ascending: false }).limit(100),
    context.supabase.rpc('bix_asset_balances', { p_user: context.userId }).single(),
  ]);
  if (list.error) throw list.error;
  return { code: me.data?.code ?? null, bixBalance: Number(bal.data?.bix_balance ?? 0), transfers: (list.data ?? []).map(t => ({ ...t, outgoing: t.sender_id === context.userId })) };
});

export const lookupBixPay = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => z.object({ code: z.string().trim().regex(/^BIX-\d{6}$/i) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: ok, error } = await context.supabase.rpc('bix_pay_lookup', { p_code: data.code });
    if (error) throw new Error(error.message);
    return { valid: Boolean(ok) };
  });

export const sendBixPay = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; amount: number; note?: string }) => z.object({ code: z.string().trim().regex(/^BIX-\d{6}$/i), amount: z.number().positive().max(100000), note: z.string().max(120).optional() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('bix_pay_send', { p_code: data.code, p_amount: data.amount, p_note: data.note ?? '' });
    if (error) throw new Error(error.message);
    return { id };
  });

export const getAdminTransfers = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const { data, error } = await context.supabase.from('bix_transfers').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
});

export const reverseTransfer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.from('bix_transfers').update({ status: 'reversed', reversed_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'completed');
    if (error) throw error;
    return { ok: true };
  });

export const ensureProfile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await context.supabase.rpc('ensure_bix_profile');
  const { data } = await context.supabase.from('profiles').select('full_name, username').eq('user_id', context.userId).maybeSingle();
  return data;
});

export const getAdminClones = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [clones, allocs, codes, profiles] = await Promise.all([
    context.supabase.from('bix_clone_accounts').select('*').order('created_at'),
    context.supabase.from('bix_allocations').select('*').order('created_at', { ascending: false }),
    context.supabase.from('referral_codes').select('user_id, code'),
    context.supabase.from('profiles').select('user_id, full_name, username'),
  ]);
  for (const r of [clones, allocs, codes, profiles]) if (r.error) throw r.error;
  return (clones.data ?? []).map(c => ({
    ...c,
    code: codes.data?.find(x => x.user_id === c.user_id)?.code ?? '—',
    username: profiles.data?.find(x => x.user_id === c.user_id)?.username ?? '',
    allocated: (allocs.data ?? []).filter(a => a.user_id === c.user_id).reduce((s, a) => s + Number(a.amount_bix), 0),
  }));
});

export const createClones = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { count: number; amount: number }) => z.object({ count: z.number().int().min(1).max(50), amount: z.number().min(0).max(10_000_000) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { count: existing } = await supabaseAdmin.from('bix_clone_accounts').select('user_id', { count: 'exact', head: true });
    let n = existing ?? 0; let made = 0;
    for (let i = 0; i < data.count; i++) {
      n++;
      const tag = String(n).padStart(3, '0');
      const email = `clone${tag}.${Date.now().toString(36)}@bixlink.internal`;
      const password = crypto.randomUUID() + 'Aa1!';
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `BIX Clone ${tag}`, username: `clone${tag}`, clone: true } });
      if (error || !created.user) throw error ?? new Error('Could not create clone');
      const id = created.user.id;
      const code = `BIX-${Math.floor(100000 + Math.random() * 900000)}`;
      const results = await Promise.all([
        supabaseAdmin.from('bix_clone_accounts').insert({ user_id: id, email, label: `BIX Clone ${tag}`, created_by: context.userId }),
        supabaseAdmin.from('referral_codes').insert({ user_id: id, code, referred_by: context.userId }),
        supabaseAdmin.from('profiles').insert({ user_id: id, full_name: `BIX Clone ${tag}`, username: `clone${tag}_${id.slice(0, 4)}` }),
        data.amount > 0 ? supabaseAdmin.from('bix_allocations').insert({ user_id: id, amount_bix: data.amount, note: 'Clone account initial allocation', created_by: context.userId }) : Promise.resolve({ error: null }),
      ]);
      for (const r of results) if (r.error) throw r.error;
      made++;
    }
    return { created: made };
  });

export const allocateBix = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; amount: number; note: string }) => z.object({ userId: z.string().uuid(), amount: z.number().positive().max(10_000_000), note: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: clone } = await supabaseAdmin.from('bix_clone_accounts').select('user_id').eq('user_id', data.userId).maybeSingle();
    if (!clone) throw new Error('Allocations are limited to clone accounts');
    const { error } = await supabaseAdmin.from('bix_allocations').insert({ user_id: data.userId, amount_bix: data.amount, note: data.note, created_by: context.userId });
    if (error) throw error;
    return { ok: true };
  });

type LeaderStatus = { status: string | null; virtual_usd: number; require_turnover: boolean; multiple: number; own_stake: number; turnover: number; target: number; qualified: boolean };

export const getMyLeader = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_leader_status', { p_user: context.userId });
  if (error) throw error;
  return data as unknown as LeaderStatus;
});

export const applyLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { error } = await context.supabase.rpc('apply_bix_leader');
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const getAdminLeaders = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await verifyAdmin(context);
  const [leaders, profiles, pool] = await Promise.all([
    context.supabase.from('bix_leaders').select('*').order('created_at'),
    context.supabase.from('profiles').select('user_id, full_name, username'),
    context.supabase.from('app_settings').select('value').eq('key', 'leader_pool').maybeSingle(),
  ]);
  if (leaders.error) throw leaders.error;
  const rows = await Promise.all((leaders.data ?? []).map(async l => {
    const { data: s } = await context.supabase.rpc('bix_leader_status', { p_user: l.user_id });
    const p = profiles.data?.find(x => x.user_id === l.user_id);
    return { ...l, full_name: p?.full_name ?? '', username: p?.username ?? '', stats: s as unknown as LeaderStatus };
  }));
  return { leaders: rows, poolUsd: Number((pool.data?.value as { poolUsd?: number } | null)?.poolUsd ?? 1000000) };
});

export const reviewLeader = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; status: 'approved' | 'rejected'; virtualUsd: number; requireTurnover: boolean }) => z.object({ userId: z.string().uuid(), status: z.enum(['approved', 'rejected']), virtualUsd: z.number().min(0).max(1_000_000), requireTurnover: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await verifyAdmin(context);
    const { error } = await context.supabase.rpc('admin_review_bix_leader', { p_user: data.userId, p_status: data.status, p_virtual: data.virtualUsd, p_require: data.requireTurnover });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
