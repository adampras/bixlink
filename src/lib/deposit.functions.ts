import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import { verifyUsdtDeposit, type DepositNetwork, type DepositAsset } from './deposit.server';

export type DepositWallet = { code: string; label: string; network: DepositNetwork; asset?: DepositAsset; address: string; enabled: boolean; mode?: DepositMode };
export type DepositMode = 'both' | 'flex' | 'unique';
export const walletFits = (w: { mode?: DepositMode }, m: 'flex' | 'unique') => !w.mode || w.mode === 'both' || w.mode === m;

const walletSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,20}$/),
  label: z.string().trim().max(40),
  network: z.enum(['BEP20', 'TRC20', 'ERC20']),
  asset: z.enum(['USDT', 'USDC']).optional(),
  address: z.string().trim().max(120),
  enabled: z.boolean(),
  mode: z.enum(['both', 'flex', 'unique']).optional(),
});

export const saveDepositWallets = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { wallets: DepositWallet[] }) => {
    const parsed = z.object({ wallets: z.array(walletSchema).min(1).max(12) }).parse(data);
    const codes = parsed.wallets.map(w => w.code.toUpperCase());
    if (new Set(codes).size !== codes.length) throw new Error('Each wallet code must be unique.');
    for (const w of parsed.wallets) {
      if (!w.enabled) continue;
      if (w.network === 'TRC20' ? !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(w.address) : !/^0x[0-9a-fA-F]{40}$/.test(w.address)) throw new Error(`Address for ${w.code} does not match ${w.network}.`);
    }
    return { wallets: parsed.wallets.map(w => ({ ...w, code: w.code.toUpperCase() })) };
  })
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc('is_bix_admin');
    if (!admin) throw new Error('Owner access required');
    const { error } = await context.supabase.from('app_settings').upsert({ key: 'deposit_wallets', value: data as unknown as Json });
    if (error) throw error;
    return { ok: true };
  });

export const verifyDeposit = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { walletCode: string; txHash: string; expectedAmount?: number }) => z.object({ walletCode: z.string().trim().min(2).max(20), txHash: z.string().trim().min(10).max(100), expectedAmount: z.number().min(1).max(100000).optional() }).parse(data))
  .handler(async ({ context, data }) => {
    const wallets = await memberWallets(context);
    const wallet = wallets.find(w => w.enabled && w.address && walletFits(w, 'flex') && w.code === data.walletCode.toUpperCase());
    if (!wallet) return { ok: false as const, reason: 'This deposit wallet is not available.' };
    const hash = wallet.network === 'TRC20' ? data.txHash.replace(/^0x/i, '') : data.txHash;

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: used } = await supabaseAdmin.from('wallet_transactions').select('id').eq('type', 'deposit').not('verified_at', 'is', null).ilike('tx_hash', hash).limit(1);
    if (used?.length) return { ok: false as const, reason: 'This transaction has already been credited.' };

    const { data: queued } = await supabaseAdmin.from('wallet_transactions').select('id,user_id').eq('type', 'deposit').eq('status', 'pending').ilike('tx_hash', hash).limit(1);
    if (queued?.length) return queued[0]?.user_id === context.userId
      ? { ok: false as const, queued: true as const, reason: 'This TxID is already in the queue. It is credited automatically once confirmed.' }
      : { ok: false as const, reason: 'This transaction has already been submitted.' };

    const result = await verifyUsdtDeposit(wallet.network, hash, wallet.address, wallet.asset ?? 'USDT');
    if (!result.ok) {
      if (!result.pending) return { ok: false as const, reason: result.reason };
      // Smart queue: exchange withdrawals broadcast late; keep the TxID and let the 5-minute scanner credit it once confirmed.
      const expected = data.expectedAmount ?? 0;
      const { error: qErr } = await supabaseAdmin.from('wallet_transactions').insert({
        user_id: context.userId, type: 'deposit', amount_usd: expected, fee_usd: 0, net_usd: expected, status: 'pending',
        tx_hash: hash, wallet_code: wallet.code, network: wallet.network, address: wallet.address,
        note: `${QUEUE_NOTE} · ${wallet.asset ?? 'USDT'} ${wallet.code}${expected ? ` · expected ${expected}` : ''}`,
      });
      if (qErr) return { ok: false as const, reason: qErr.code === '23505' ? 'This transaction has already been submitted.' : 'Could not queue this TxID. Please try again.' };
      return { ok: false as const, queued: true as const, reason: `${result.reason} Your TxID is saved — it is credited automatically once confirmed (checked every 5 minutes).` };
    }
    if (result.amount < 1) return { ok: false as const, reason: 'Minimum deposit is 1 USD stablecoin.' };

    const amount = Math.floor(result.amount * 100) / 100;
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('wallet_transactions').insert({
      user_id: context.userId, type: 'deposit', amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'approved',
      tx_hash: hash, wallet_code: wallet.code, network: wallet.network, address: wallet.address,
      note: `Auto-verified · ${wallet.code}`, verified_at: now, reviewed_at: now,
    });
    if (error) {
      if (error.code === '23505') return { ok: false as const, reason: 'This transaction has already been credited.' };
      throw new Error('Could not record deposit.');
    }
    return { ok: true as const, amount, walletCode: wallet.code, network: wallet.network, txHash: hash };
  });

export const QUEUE_NOTE = 'Queued TxID';

export const createDepositIntent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { walletCode: string; amount: number }) => z.object({ walletCode: z.string().trim().min(2).max(20), amount: z.number().int().min(1).max(100000) }).parse(data))
  .handler(async ({ context, data }) => {
    const wallets = await memberWallets(context);
    const wallet = wallets.find(w => w.enabled && w.address && walletFits(w, 'unique') && w.code === data.walletCode.toUpperCase());
    if (!wallet) throw new Error('This deposit wallet is not available.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const now = new Date().toISOString();
    await supabaseAdmin.from('deposit_intents').update({ status: 'expired' }).eq('status', 'pending').lt('expires_at', now);
    await supabaseAdmin.from('deposit_intents').update({ status: 'cancelled' }).eq('status', 'pending').eq('user_id', context.userId).is('claim_tx_id', null);
    for (let i = 0; i < 8; i++) {
      const unique = 1 + Math.floor(Math.random() * 999); // 3 unique digits: 0.001–0.999
      const exact = Number((data.amount + unique / 1000).toFixed(3));
      const { data: intent, error } = await supabaseAdmin.from('deposit_intents').insert({ user_id: context.userId, wallet_code: wallet.code, network: wallet.network, address: wallet.address, amount_exact: exact }).select('id, amount_exact, expires_at').single();
      if (!error && intent) return { id: intent.id, amount: Number(intent.amount_exact), expiresAt: intent.expires_at, walletCode: wallet.code, network: wallet.network, asset: wallet.asset ?? 'USDT', address: wallet.address };
    }
    throw new Error('Please try again.');
  });

export const checkDepositIntent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { matchIntent } = await import('./deposit-match.server');
    const { data: intent } = await supabaseAdmin.from('deposit_intents').select('*').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    if (!intent) return { status: 'missing' as const };
    if (intent.status === 'credited') return { status: 'credited' as const, amount: Math.floor(Number(intent.amount_exact) * 100) / 100, txHash: intent.tx_hash ?? '', walletCode: intent.wallet_code, network: intent.network };
    if (intent.status !== 'pending') return { status: 'expired' as const };
    const r = await matchIntent(supabaseAdmin, intent);
    return r.status === 'waiting' ? { status: 'waiting' as const, reason: r.reason, claimed: !!intent.claim_tx_id } : r;
  });

/** Member taps "I have transferred": records a pending deposit for owner review and keeps auto-detection running for 24h. */
export const claimDepositIntent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: intent } = await supabaseAdmin.from('deposit_intents').select('*').eq('id', data.id).eq('user_id', context.userId).eq('status', 'pending').maybeSingle();
    if (!intent) throw new Error('This deposit request is no longer active.');
    if (intent.claim_tx_id) return { ok: true };
    const amount = Math.floor(Number(intent.amount_exact) * 100) / 100;
    const { data: tx, error } = await supabaseAdmin.from('wallet_transactions').insert({ user_id: context.userId, type: 'deposit', amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'pending', wallet_code: intent.wallet_code, network: intent.network, address: intent.address, note: `Member reported transfer · exact ${Number(intent.amount_exact).toFixed(3)} stablecoin · ${intent.wallet_code}` }).select('id').single();
    if (error || !tx) throw new Error('Could not record your transfer.');
    const expires = new Date(Date.now() + 24 * 3600_000).toISOString();
    await supabaseAdmin.from('deposit_intents').update({ claim_tx_id: tx.id, claimed_at: new Date().toISOString(), expires_at: expires }).eq('id', intent.id);
    return { ok: true };
  });

// Members under an Owner 2–5 see only that Owner's wallet; everyone else uses Owner 1 wallets.
async function memberWallets(context: { supabase: any; userId: string }): Promise<DepositWallet[]> {
  const { data: own } = await context.supabase.rpc('bix_my_deposit_wallets');
  if (Array.isArray(own) && own.length) return own as DepositWallet[];
  // Owner 2–5 never fall back to Owner 1 wallets; they only see their own bound wallet.
  const { data: role } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  if (role) return [];
  const { data: row } = await context.supabase.from('app_settings').select('value').eq('key', 'deposit_wallets').maybeSingle();
  return stickyRotation(((row?.value as { wallets?: DepositWallet[] } | null)?.wallets ?? []), context.userId);
}

/** Address rotation: several enabled wallets on the same network+mode collapse to ONE stable wallet per member (hash of user id). */
export function stickyRotation(wallets: DepositWallet[], userId: string): DepositWallet[] {
  let h = 0; for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const groups = new Map<string, DepositWallet[]>();
  const out: DepositWallet[] = [];
  for (const w of wallets) {
    if (!w.enabled || !w.address) { out.push(w); continue; }
    const k = `${w.network}|${w.asset ?? 'USDT'}|${w.mode ?? 'both'}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(w);
  }
  for (const g of groups.values()) out.push(g[h % g.length]!);
  return out;
}
export async function memberWalletsFor(context: { supabase: any; userId: string }) { return memberWallets(context); }
export const getMyDepositWallets = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) =>
  (await memberWallets(context)).filter(w => w.enabled && w.address));

// Real turnover ledger: Owner 1 sees all rows, Owner 2–5 only their own wallet's rows (RLS).
export const getOwnerRevenue = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('bix_owner_revenue').select('id,owner_id,member_id,amount_usd,wallet_code,network,tx_hash,created_at').order('created_at', { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const { data: codes } = await context.supabase.from('referral_codes').select('user_id,code');
  const code = new Map(((codes ?? []) as { user_id: string; code: string }[]).map(c => [c.user_id, c.code]));
  return (data ?? []).map((r: any) => ({ ...r, amount_usd: Number(r.amount_usd), member_code: code.get(r.member_id) ?? r.member_id.slice(0, 8), owner_code: r.owner_id ? (code.get(r.owner_id) ?? 'Owner') : 'OWNER 1' }));
});

export const getOwner1DepositLocks = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_deposit_lock_list');
  if (error) throw new Error(error.message);
  return (data ?? []) as { code: string | null; username: string | null; created_at: string }[];
});
export const setOwner1DepositLock = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; lock: boolean }) => z.object({ code: z.string().trim().min(2).max(60), lock: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_deposit_lock_owner1', { p_code: data.code, p_lock: data.lock });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type QuotaRoute = { code: string | null; username: string | null; max_direct: number; created_at: string; directs: { code: string | null; username: string | null; routed: boolean }[] };
export const getDepositQuotaRoutes = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_deposit_quota_list');
  if (error) throw new Error(error.message);
  return (data ?? []) as QuotaRoute[];
});
export const setDepositQuotaRoute = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; max: number; on: boolean }) => z.object({ code: z.string().trim().min(2).max(60), max: z.number().int().min(0).max(10000), on: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_deposit_quota_set', { p_code: data.code, p_max: data.max, p_on: data.on });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
