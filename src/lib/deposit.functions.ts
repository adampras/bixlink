import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import { verifyUsdtDeposit, listIncomingUsdt, type DepositNetwork } from './deposit.server';

export type DepositWallet = { code: string; label: string; network: DepositNetwork; address: string; enabled: boolean };

const walletSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,20}$/),
  label: z.string().trim().max(40),
  network: z.enum(['BEP20', 'TRC20', 'ERC20']),
  address: z.string().trim().max(120),
  enabled: z.boolean(),
});

export const saveDepositWallets = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { wallets: DepositWallet[] }) => {
    const parsed = z.object({ wallets: z.array(walletSchema).length(5) }).parse(data);
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
  .inputValidator((data: { walletCode: string; txHash: string }) => z.object({ walletCode: z.string().trim().min(2).max(20), txHash: z.string().trim().min(10).max(100) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase.from('app_settings').select('value').eq('key', 'deposit_wallets').maybeSingle();
    const wallets = ((row?.value as { wallets?: DepositWallet[] } | null)?.wallets ?? []);
    const wallet = wallets.find(w => w.enabled && w.address && w.code === data.walletCode.toUpperCase());
    if (!wallet) return { ok: false as const, reason: 'This deposit wallet is not available.' };
    const hash = wallet.network === 'TRC20' ? data.txHash.replace(/^0x/i, '') : data.txHash;

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: used } = await supabaseAdmin.from('wallet_transactions').select('id').eq('type', 'deposit').not('verified_at', 'is', null).ilike('tx_hash', hash).limit(1);
    if (used?.length) return { ok: false as const, reason: 'This transaction has already been credited.' };

    const result = await verifyUsdtDeposit(wallet.network, hash, wallet.address);
    if (!result.ok) return { ok: false as const, reason: result.reason };
    if (result.amount < 1) return { ok: false as const, reason: 'Minimum deposit is 1 USDT.' };

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

export const createDepositIntent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { walletCode: string; amount: number }) => z.object({ walletCode: z.string().trim().min(2).max(20), amount: z.number().int().min(1).max(100000) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase.from('app_settings').select('value').eq('key', 'deposit_wallets').maybeSingle();
    const wallets = ((row?.value as { wallets?: DepositWallet[] } | null)?.wallets ?? []);
    const wallet = wallets.find(w => w.enabled && w.address && w.code === data.walletCode.toUpperCase());
    if (!wallet) throw new Error('This deposit wallet is not available.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const now = new Date().toISOString();
    await supabaseAdmin.from('deposit_intents').update({ status: 'expired' }).eq('status', 'pending').lt('expires_at', now);
    await supabaseAdmin.from('deposit_intents').update({ status: 'cancelled' }).eq('status', 'pending').eq('user_id', context.userId);
    for (let i = 0; i < 8; i++) {
      const cents = 1 + Math.floor(Math.random() * 9998); // 0.0001–0.9999
      const exact = Number((data.amount + cents / 10000).toFixed(4));
      const { data: intent, error } = await supabaseAdmin.from('deposit_intents').insert({ user_id: context.userId, wallet_code: wallet.code, network: wallet.network, address: wallet.address, amount_exact: exact }).select('id, amount_exact, expires_at').single();
      if (!error && intent) return { id: intent.id, amount: Number(intent.amount_exact), expiresAt: intent.expires_at, walletCode: wallet.code, network: wallet.network, address: wallet.address };
    }
    throw new Error('Please try again.');
  });

export const checkDepositIntent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: intent } = await supabaseAdmin.from('deposit_intents').select('*').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    if (!intent) return { status: 'missing' as const };
    if (intent.status === 'credited') return { status: 'credited' as const, amount: Number(intent.amount_exact), txHash: intent.tx_hash ?? '', walletCode: intent.wallet_code, network: intent.network };
    if (intent.status !== 'pending') return { status: 'expired' as const };
    if (new Date(intent.expires_at) < new Date()) { await supabaseAdmin.from('deposit_intents').update({ status: 'expired' }).eq('id', intent.id); return { status: 'expired' as const }; }
    const list = await listIncomingUsdt(intent.network as DepositNetwork, intent.address);
    if (!Array.isArray(list)) return { status: 'waiting' as const, reason: list.error };
    const since = new Date(intent.created_at).getTime() - 60_000;
    const target = Number(intent.amount_exact);
    for (const t of list) {
      if (t.timestamp < since || Math.abs(t.amount - target) > 0.00005) continue;
      const { data: used } = await supabaseAdmin.from('wallet_transactions').select('id').eq('type', 'deposit').ilike('tx_hash', t.hash).limit(1);
      if (used?.length) continue;
      const amount = Math.floor(t.amount * 100) / 100; const now = new Date().toISOString();
      const { error } = await supabaseAdmin.from('wallet_transactions').insert({ user_id: context.userId, type: 'deposit', amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'approved', tx_hash: t.hash, wallet_code: intent.wallet_code, network: intent.network, address: intent.address, note: `Auto-detected · ${intent.wallet_code}`, verified_at: now, reviewed_at: now });
      if (error) continue;
      await supabaseAdmin.from('deposit_intents').update({ status: 'credited', tx_hash: t.hash, credited_at: now }).eq('id', intent.id);
      return { status: 'credited' as const, amount, txHash: t.hash, walletCode: intent.wallet_code, network: intent.network };
    }
    return { status: 'waiting' as const, reason: '' };
  });
