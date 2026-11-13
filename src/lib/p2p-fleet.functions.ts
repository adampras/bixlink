import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import { fleetMerchants, DEFAULT_FLEET, type FleetConfig } from './p2p-fleet';
import { memberWalletsFor, walletFits } from './deposit.functions';
import { verifyUsdtDeposit } from './deposit.server';

async function readConfig(supabase: any): Promise<FleetConfig> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'p2p_fleet').maybeSingle();
  return { ...DEFAULT_FLEET, ...((data?.value ?? {}) as Partial<FleetConfig>) };
}

type PayWallet = { code: string; address: string };
const isBep20Usdt = (w: { enabled: boolean; address: string; network: string; asset?: string }) => w.enabled && !!w.address && w.network === 'BEP20' && (!w.asset || w.asset === 'USDT');

/** All BEP-20 USDT wallets this member may pay: Owner 2–5 members use their owner's wallets; everyone else gets every Owner 1 wallet (no sticky collapse). */
export async function fleetWallets(context: { supabase: any; userId: string }): Promise<PayWallet[]> {
  const { data: own } = await context.supabase.rpc('bix_my_deposit_wallets');
  let list: any[] = Array.isArray(own) && own.length ? own : [];
  if (!list.length) {
    const { data: role } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId).eq('role', 'reviewer').maybeSingle();
    if (role) list = await memberWalletsFor(context);
    else { const { data: row } = await context.supabase.from('app_settings').select('value').eq('key', 'deposit_wallets').maybeSingle(); list = (row?.value as { wallets?: any[] } | null)?.wallets ?? []; }
  }
  const ok = list.filter(isBep20Usdt).filter(w => walletFits(w, 'flex'));
  const seen = new Set<string>();
  return ok.filter(w => { const k = String(w.address).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).map(w => ({ code: w.code, address: w.address }));
}

/** Each merchant is bound to one wallet by its fleet number, spreading payments across every official wallet. */
export function walletForMerchant(name: string, wallets: PayWallet[]): PayWallet | undefined {
  if (!wallets.length) return undefined;
  const n = Number(/#(\d+)/.exec(name)?.[1] ?? 1);
  return wallets[(Math.max(1, n) - 1) % wallets.length];
}

/** Public-to-members: active Official Desk merchants, each with its own BEP-20 pay-to wallet. */
export const getFleetDesk = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const cfg = await readConfig(context.supabase);
  const ws = await fleetWallets(context);
  const { data: orders } = await context.supabase.from('bix_fleet_orders').select('id,merchant,price,usdt,bix,status,tx_hash,created_at,note').eq('user_id', context.userId).order('created_at', { ascending: false }).limit(10);
  const merchants = cfg.enabled ? fleetMerchants(cfg).map(m => { const w = walletForMerchant(m.name, ws); return { ...m, wallet: w ?? null }; }) : [];
  return { enabled: cfg.enabled, merchants, walletCount: ws.length, wallet: ws[0] ?? null, orders: orders ?? [], minUsdt: cfg.minUsdt };
});

async function creditOrder(admin: any, order: any, cfg: FleetConfig) {
  const r = await verifyUsdtDeposit('BEP20', order.tx_hash, order.address, 'USDT');
  if (!r.ok) {
    if (r.pending) return { status: 'pending' as const, reason: r.reason };
    await admin.from('bix_fleet_orders').update({ status: 'rejected', note: r.reason }).eq('id', order.id).eq('status', 'pending');
    return { status: 'rejected' as const, reason: r.reason };
  }
  const usdt = Math.floor(r.amount * 100) / 100;
  if (usdt < cfg.minUsdt) {
    await admin.from('bix_fleet_orders').update({ status: 'rejected', usdt, note: `Below minimum ${cfg.minUsdt} USDT` }).eq('id', order.id).eq('status', 'pending');
    return { status: 'rejected' as const, reason: `Minimum is ${cfg.minUsdt} USDT.` };
  }
  const bix = Math.floor((usdt / Number(order.price)) * 100) / 100;
  // Atomic claim: only one caller flips pending → credited, so BIX is credited once per TxID.
  const { data: claimed } = await admin.from('bix_fleet_orders').update({ status: 'credited', usdt, bix, credited_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'pending').select('id');
  if (!claimed?.length) return { status: 'credited' as const, bix };
  await admin.from('bix_allocations').insert({ user_id: order.user_id, amount_bix: bix, note: `P2P Official Desk · ${order.merchant} · ${usdt} USDT @ ${order.price} · ${order.tx_hash}` });
  return { status: 'credited' as const, bix, usdt };
}

export const submitFleetBuy = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { merchant: string; txHash: string }) => z.object({ merchant: z.string().trim().min(2).max(40), txHash: z.string().trim().regex(/^0x[0-9a-fA-F]{64}$/, 'Enter a valid BSC TxID (0x… 66 characters).') }).parse(d))
  .handler(async ({ context, data }) => {
    const cfg = await readConfig(context.supabase);
    if (!cfg.enabled) throw new Error('Official Desk is closed right now.');
    const m = fleetMerchants(cfg).find(x => x.name === data.merchant);
    if (!m) throw new Error('This merchant is no longer active. Pick another.');
    const w = walletForMerchant(m.name, await fleetWallets(context));
    if (!w) throw new Error('No BEP-20 wallet is available.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const hash = data.txHash.toLowerCase();
    const { data: used } = await supabaseAdmin.from('wallet_transactions').select('id').ilike('tx_hash', hash).limit(1);
    if (used?.length) throw new Error('This TxID was already used for a wallet deposit.');
    const { data: order, error } = await supabaseAdmin.from('bix_fleet_orders').insert({ user_id: context.userId, merchant: m.name, price: m.price, wallet_code: w.code, address: w.address, tx_hash: hash }).select('*').single();
    if (error) throw new Error(error.code === '23505' ? 'This TxID has already been submitted.' : 'Could not record the order.');
    return creditOrder(supabaseAdmin, order, cfg);
  });

async function assertOwner1(supabase: any) {
  const { data } = await supabase.rpc('bix_is_owner1');
  if (!data) throw new Error('Owner 1 access required');
}

export const getFleetAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertOwner1(context.supabase);
  const cfg = await readConfig(context.supabase);
  const { data: orders } = await context.supabase.from('bix_fleet_orders').select('*').order('created_at', { ascending: false }).limit(50);
  return { config: cfg, orders: orders ?? [] };
});

export const saveFleetConfig = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: FleetConfig) => z.object({ enabled: z.boolean(), total: z.number().int().min(50).max(100), activePct: z.number().min(1).max(100), minPrice: z.number().min(0.01).max(100), maxPrice: z.number().min(0.01).max(100), minUsdt: z.number().min(1).max(100000) }).refine(v => v.maxPrice >= v.minPrice, 'Max price must be ≥ min price').parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner1(context.supabase);
    const { error } = await context.supabase.from('app_settings').upsert({ key: 'p2p_fleet', value: data as unknown as Json });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Owner 1 fast lane: re-check a pending TxID on-chain and release BIX if it is confirmed. */
export const recheckFleetOrder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner1(context.supabase);
    const cfg = await readConfig(context.supabase);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: order } = await supabaseAdmin.from('bix_fleet_orders').select('*').eq('id', data.id).eq('status', 'pending').maybeSingle();
    if (!order) throw new Error('Order is not pending.');
    return creditOrder(supabaseAdmin, order, cfg);
  });

/** Member re-check for their own pending order. */
export const recheckMyFleetOrder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const cfg = await readConfig(context.supabase);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: order } = await supabaseAdmin.from('bix_fleet_orders').select('*').eq('id', data.id).eq('user_id', context.userId).eq('status', 'pending').maybeSingle();
    if (!order) throw new Error('Order is not pending.');
    return creditOrder(supabaseAdmin, order, cfg);
  });
