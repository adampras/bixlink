// Server-only helpers: who may recover on-chain deposits, and on which wallets/members.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { DepositNetwork, DepositAsset } from './deposit.server';
import { isNearAmount } from './deposit-recovery';

type Admin = SupabaseClient<Database>;
export type RecoveryWallet = { code: string; label: string; network: DepositNetwork; asset: DepositAsset; address: string; owner: string };
export type RecoveryCaller = { owner1: boolean; userId: string; scope: Set<string> | null; wallets: RecoveryWallet[] };

const net = (n: string | null | undefined): DepositNetwork => (n === 'TRC20' || n === 'ERC20' ? n : 'BEP20');
const asset = (a: string | null | undefined): DepositAsset => (a === 'USDC' ? 'USDC' : 'USDT');

function downline(refs: { user_id: string; referred_by: string | null }[], root: string) {
  const kids = new Map<string, string[]>();
  for (const r of refs) if (r.referred_by) kids.set(r.referred_by, [...(kids.get(r.referred_by) ?? []), r.user_id]);
  const seen = new Set<string>(); const stack = [...(kids.get(root) ?? [])];
  while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...(kids.get(id) ?? [])); }
  return seen;
}

/** Owner 1 (server-verified admin) sees every deposit wallet; Owner 2 only its own wallets and its downline, and only with the Wallet permission. */
export async function recoveryCaller(context: { supabase: any; userId: string }, admin: Admin): Promise<RecoveryCaller> {
  const { data: isOwner } = await context.supabase.rpc('is_bix_admin');
  const ownRows = admin.from('bix_owner_deposit_wallets').select('owner_id,code,label,network,asset,address,unique_code,unique_label,unique_network,unique_asset,unique_address');
  if (isOwner) {
    const [{ data: cfg }, { data: rows }] = await Promise.all([admin.from('app_settings').select('value').eq('key', 'deposit_wallets').maybeSingle(), ownRows]);
    const base = ((cfg?.value as { wallets?: { code: string; label?: string; network?: string; asset?: string; address?: string }[] } | null)?.wallets ?? [])
      .filter(w => w.address).map(w => ({ code: w.code, label: w.label || w.code, network: net(w.network), asset: asset(w.asset), address: w.address!, owner: 'Owner 1' }));
    return { owner1: true, userId: context.userId, scope: null, wallets: [...base, ...ownerRowWallets(rows ?? [], 'Owner 2')] };
  }
  const { data: role } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
  if (!role) throw new Error('Owner access required');
  const { data: perm } = await admin.from('app_settings').select('value').eq('key', 'reviewer_permissions').maybeSingle();
  const store = (perm?.value ?? {}) as { wallet?: boolean; users?: Record<string, { wallet?: boolean }> };
  if ((store.users?.[context.userId]?.wallet ?? store.wallet) === false) throw new Error('This Owner 2 section is turned off');
  const [{ data: rows }, { data: refs }] = await Promise.all([ownRows.eq('owner_id', context.userId), admin.from('referral_codes').select('user_id,referred_by')]);
  return { owner1: false, userId: context.userId, scope: downline(refs ?? [], context.userId), wallets: ownerRowWallets(rows ?? [], 'Owner 2') };
}

function ownerRowWallets(rows: any[], owner: string): RecoveryWallet[] {
  const out: RecoveryWallet[] = [];
  for (const r of rows) {
    if (r.address) out.push({ code: r.code, label: r.label || r.code, network: net(r.network), asset: asset(r.asset), address: r.address, owner });
    if (r.unique_code && r.unique_address) out.push({ code: r.unique_code, label: r.unique_label || r.unique_code, network: net(r.unique_network), asset: asset(r.unique_asset), address: r.unique_address, owner });
  }
  return out;
}

export type Candidate = { userId: string; code: string; name: string; amount: number; createdAt: string; kind: 'report' | 'unique' };

/** Member deposit requests on this wallet (reported transfers and 3-digit requests from the last 72h) whose amount is close to the on-chain amount. */
export async function candidatesFor(admin: Admin, caller: RecoveryCaller, walletCode: string, amount: number, names: Map<string, { code: string; name: string }>): Promise<Candidate[]> {
  const since = new Date(Date.now() - 72 * 3600_000).toISOString();
  const [{ data: claims }, { data: intents }] = await Promise.all([
    admin.from('wallet_transactions').select('user_id,amount_usd,created_at').eq('type', 'deposit').eq('status', 'pending').is('tx_hash', null).eq('wallet_code', walletCode).gte('created_at', since).limit(200),
    admin.from('deposit_intents').select('user_id,amount_exact,created_at,claim_tx_id').eq('wallet_code', walletCode).in('status', ['pending', 'expired', 'cancelled']).gte('created_at', since).limit(300),
  ]);
  const rows: Candidate[] = [
    ...(claims ?? []).map(c => ({ userId: c.user_id, amount: Number(c.amount_usd), createdAt: c.created_at, kind: 'report' as const })),
    ...(intents ?? []).filter(i => !i.claim_tx_id).map(i => ({ userId: i.user_id, amount: Number(i.amount_exact), createdAt: i.created_at, kind: 'unique' as const })),
  ].filter(c => (!caller.scope || caller.scope.has(c.userId)) && isNearAmount(c.amount, amount))
   .map(c => ({ ...c, code: names.get(c.userId)?.code ?? '—', name: names.get(c.userId)?.name ?? '—' }));
  const seen = new Set<string>();
  return rows.sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount)).filter(c => (seen.has(c.userId) ? false : (seen.add(c.userId), true))).slice(0, 6);
}

export async function memberNames(admin: Admin) {
  const [{ data: codes }, { data: profs }] = await Promise.all([admin.from('referral_codes').select('user_id,code'), admin.from('profiles').select('user_id,username,full_name')]);
  const prof = new Map((profs ?? []).map(p => [p.user_id, p.username || p.full_name]));
  return new Map((codes ?? []).map(c => [c.user_id, { code: c.code, name: prof.get(c.user_id) ?? '—' }]));
}

/** Existing ledger rows for a TxID: already credited, or queued by a member. */
export async function hashStatus(admin: Admin, hash: string) {
  const { data } = await admin.from('wallet_transactions').select('id,user_id,status,verified_at,amount_usd').eq('type', 'deposit').ilike('tx_hash', hash).limit(5);
  const credited = (data ?? []).find(r => r.verified_at || r.status === 'approved') ?? null;
  const queued = (data ?? []).find(r => r.status === 'pending') ?? null;
  return { credited, queued };
}
