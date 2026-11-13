import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { fleetWallets } from './p2p-fleet.functions';
import { verifyUsdtDeposit } from './deposit.server';

export const PRESALE_DEVS = [
  { flag: '🇮🇩', country: 'Indonesia', role: 'Lead Protocol Developer' },
  { flag: '🇸🇬', country: 'Singapore', role: 'Treasury & Vault Developer' },
  { flag: '🇲🇾', country: 'Malaysia', role: 'Smart Contract Developer' },
  { flag: '🇦🇪', country: 'United Arab Emirates', role: 'Liquidity Developer' },
  { flag: '🇩🇪', country: 'Germany', role: 'Security Developer' },
];

/** Owner 1 network (+ designated IDs) gets up to 5 Owner 1 BEP-20 wallets, one per developer nation; Owner 2 network only its owner's wallet. */
async function presaleWallets(context: { supabase: any; userId: string }) {
  const { data: own } = await context.supabase.rpc('bix_my_deposit_wallets');
  const { data: pick } = await context.supabase.rpc('bix_presale_owner1_wallets');
  const scoped = !pick && Array.isArray(own) && own.length > 0;
  const ws = (await fleetWallets(context, !!pick)).slice(0, scoped ? 1 : 5);
  return ws.map((w, i) => ({ ...w, dev: scoped ? null : PRESALE_DEVS[i] ?? null }));
}

export const getPresaleWallets = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => presaleWallets(context));

export const payPresaleTx = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ walletCode: z.string().min(2).max(20), txHash: z.string().trim().regex(/^0x[0-9a-fA-F]{64}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const wallet = (await presaleWallets(context)).find(w => w.code === data.walletCode);
    if (!wallet) throw new Error('This presale wallet is not available for your account.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: used } = await supabaseAdmin.from('wallet_transactions').select('id').eq('type', 'deposit').ilike('tx_hash', data.txHash).limit(1);
    if (used?.length) throw new Error('This TxID has already been used.');
    const r = await verifyUsdtDeposit('BEP20', data.txHash, wallet.address, 'USDT');
    if (!r.ok) throw new Error(r.reason);
    const amount = Math.floor(r.amount * 100) / 100;
    if (amount < 100) throw new Error(`Received ${amount} USDT — minimum presale is $100. Contact support.`);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('wallet_transactions').insert({ user_id: context.userId, type: 'deposit', amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'approved', tx_hash: data.txHash, wallet_code: wallet.code, network: 'BEP20', address: wallet.address, note: `Presale payment · ${wallet.code}`, verified_at: now, reviewed_at: now });
    if (error) throw new Error(error.code === '23505' ? 'This TxID has already been used.' : 'Could not record the payment.');
    const usd = Math.min(1000, Math.floor(amount));
    const { data: o, error: be } = await context.supabase.rpc('bix_presale_buy_flex', { p_usd: usd });
    if (be) throw new Error(`Payment credited to your USDT balance, but presale failed: ${be.message}`);
    return { ...(o as { bix: number }), usd, extra: Math.max(0, amount - usd) };
  });
