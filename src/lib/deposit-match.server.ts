import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { listIncomingUsdt, type DepositNetwork, type DepositAsset } from './deposit.server';

type Admin = SupabaseClient<Database>;
type Intent = Database['public']['Tables']['deposit_intents']['Row'];
export type MatchResult = { status: 'credited'; amount: number; txHash: string; walletCode: string; network: string } | { status: 'waiting'; reason: string } | { status: 'expired' };

/** Try to match one pending intent against recent on-chain transfers and credit it once. */
export async function matchIntent(admin: Admin, intent: Intent, cache?: Map<string, Awaited<ReturnType<typeof listIncomingUsdt>>>): Promise<MatchResult> {
  if (new Date(intent.expires_at) < new Date()) { await admin.from('deposit_intents').update({ status: 'expired' }).eq('id', intent.id).eq('status', 'pending'); return { status: 'expired' }; }
  const { data: cfg } = await admin.from('app_settings').select('value').eq('key', 'deposit_wallets').maybeSingle();
  const wallets = ((cfg?.value as { wallets?: { code: string; asset?: DepositAsset }[] } | null)?.wallets ?? []);
  let found = wallets.find(w => w.code === intent.wallet_code)?.asset;
  if (!found && intent.wallet_code.startsWith('OWN-')) { const { data: ow } = await admin.from('bix_owner_deposit_wallets').select('asset').eq('code', intent.wallet_code).maybeSingle(); found = ow?.asset as DepositAsset | undefined; }
  if (!found && intent.wallet_code.startsWith('UNQ-')) { const { data: uw } = await admin.from('bix_owner_deposit_wallets').select('unique_asset').eq('unique_code', intent.wallet_code).maybeSingle(); found = uw?.unique_asset as DepositAsset | undefined; }
  if (!found && intent.wallet_code.startsWith('OX')) { const { data: xs } = await admin.from('bix_owner_deposit_wallets').select('extra_wallets'); for (const r of (xs ?? []) as { extra_wallets: { code: string; asset?: DepositAsset }[] }[]) { const m = (r.extra_wallets ?? []).find(w => w.code === intent.wallet_code); if (m) { found = m.asset; break; } } }
  const asset: DepositAsset = found === 'USDC' ? 'USDC' : 'USDT';
  const key = `${asset}:${intent.network}:${intent.address}`;
  let list = cache?.get(key);
  if (!list) { list = await listIncomingUsdt(intent.network as DepositNetwork, intent.address, asset); cache?.set(key, list); }
  if (!Array.isArray(list)) return { status: 'waiting', reason: list.error };
  const since = new Date(intent.created_at).getTime() - 60_000;
  const target = Number(intent.amount_exact);
  for (const t of list) {
    if (t.timestamp < since || Math.abs(t.amount - target) > 0.00005) continue;
    const { data: used } = await admin.from('wallet_transactions').select('id').eq('type', 'deposit').ilike('tx_hash', t.hash).limit(1);
    if (used?.length) continue;
    // Lock the intent first so concurrent checks cannot credit twice.
    const now = new Date().toISOString();
    const { data: locked } = await admin.from('deposit_intents').update({ status: 'credited', tx_hash: t.hash, credited_at: now }).eq('id', intent.id).eq('status', 'pending').select('id');
    if (!locked?.length) return { status: 'expired' };
    const amount = Math.floor(t.amount * 100) / 100;
    const row = { amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'approved', tx_hash: t.hash, wallet_code: intent.wallet_code, network: intent.network, address: intent.address, note: `Auto-detected · ${asset} · ${intent.wallet_code}`, verified_at: now, reviewed_at: now };
    if (intent.claim_tx_id) await admin.from('wallet_transactions').update(row).eq('id', intent.claim_tx_id).eq('status', 'pending');
    else await admin.from('wallet_transactions').insert({ ...row, user_id: intent.user_id, type: 'deposit' });
    return { status: 'credited', amount, txHash: t.hash, walletCode: intent.wallet_code, network: intent.network };
  }
  return { status: 'waiting', reason: '' };
}
