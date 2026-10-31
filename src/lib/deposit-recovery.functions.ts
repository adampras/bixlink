import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { manualCreditAmount, MANUAL_MIN_USD, normalizeHash } from './deposit-recovery';

const hashSchema = z.string().trim().min(10).max(100).regex(/^(0x)?[0-9a-fA-F]{64}$/, 'TxID must be 64 hex characters (EVM starts with 0x).');

/** Wallets this owner may recover deposits for. */
export const listRecoveryWallets = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { recoveryCaller } = await import('./deposit-recovery.server');
  const caller = await recoveryCaller(context, supabaseAdmin);
  return { owner1: caller.owner1, wallets: caller.wallets.map(w => ({ code: w.code, label: w.label, network: w.network, asset: w.asset, address: w.address, owner: w.owner })) };
});

/** Recent confirmed on-chain transfers into the owner's wallets, each marked credited / queued / not yet in any member wallet. */
export const scanRecoveryTransfers = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { walletCode?: string }) => z.object({ walletCode: z.string().trim().max(20).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { recoveryCaller, memberNames, candidatesFor } = await import('./deposit-recovery.server');
    const { listIncomingUsdt } = await import('./deposit.server');
    const caller = await recoveryCaller(context, supabaseAdmin);
    const wallets = caller.wallets.filter(w => !data.walletCode || w.code === data.walletCode).slice(0, 8);
    const names = await memberNames(supabaseAdmin);
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();
    const { data: ledger } = await supabaseAdmin.from('wallet_transactions').select('user_id,status,verified_at,tx_hash').eq('type', 'deposit').not('tx_hash', 'is', null).gte('created_at', since).limit(5000);
    const byHash = new Map<string, { user_id: string; status: string; verified_at: string | null }>();
    for (const r of ledger ?? []) { const k = String(r.tx_hash).toLowerCase(); const prev = byHash.get(k); if (!prev || r.verified_at || r.status === 'approved') byHash.set(k, r); }
    const out = [] as { wallet: string; walletLabel: string; network: string; asset: string; error?: string; transfers: { hash: string; amount: number; at: number; state: 'credited' | 'queued' | 'unmatched'; member?: string; candidates?: Awaited<ReturnType<typeof candidatesFor>> }[] }[];
    for (const w of wallets) {
      const list = await listIncomingUsdt(w.network, w.address, w.asset);
      if (!Array.isArray(list)) { out.push({ wallet: w.code, walletLabel: w.label, network: w.network, asset: w.asset, error: list.error, transfers: [] }); continue; }
      const transfers = [];
      for (const t of list.slice(0, 30)) {
        const row = byHash.get(normalizeHash(w.network, t.hash).toLowerCase());
        const visible = (id: string) => !caller.scope || caller.scope.has(id);
        if (row) transfers.push({ hash: t.hash, amount: t.amount, at: t.timestamp, state: (row.verified_at || row.status === 'approved' ? 'credited' : 'queued') as 'credited' | 'queued', member: visible(row.user_id) ? names.get(row.user_id)?.code ?? '—' : 'Member lain' });
        else transfers.push({ hash: t.hash, amount: t.amount, at: t.timestamp, state: 'unmatched' as const, candidates: t.amount >= 1 ? await candidatesFor(supabaseAdmin, caller, w.code, t.amount, names) : [] });
      }
      out.push({ wallet: w.code, walletLabel: w.label, network: w.network, asset: w.asset, transfers });
    }
    return out;
  });

/** Check a TxID on-chain against one of the owner's wallets (works for older transfers outside the scan window). */
export const lookupRecoveryTx = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { walletCode: string; txHash: string }) => z.object({ walletCode: z.string().trim().min(2).max(20), txHash: hashSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { recoveryCaller, memberNames, candidatesFor, hashStatus } = await import('./deposit-recovery.server');
    const { verifyUsdtDeposit } = await import('./deposit.server');
    const caller = await recoveryCaller(context, supabaseAdmin);
    const wallet = caller.wallets.find(w => w.code === data.walletCode);
    if (!wallet) return { ok: false as const, reason: 'Wallet ini tidak ada dalam akses Anda.' };
    const hash = normalizeHash(wallet.network, data.txHash);
    const result = await verifyUsdtDeposit(wallet.network, hash, wallet.address, wallet.asset);
    if (!result.ok) return { ok: false as const, reason: result.reason, pending: !!result.pending };
    const names = await memberNames(supabaseAdmin);
    const st = await hashStatus(supabaseAdmin, hash);
    const label = (id: string) => (!caller.scope || caller.scope.has(id) ? names.get(id)?.code ?? '—' : 'Member lain');
    return {
      ok: true as const, hash, amount: result.amount, credit: manualCreditAmount(result.amount), wallet: wallet.code, network: wallet.network, asset: wallet.asset,
      creditedTo: st.credited ? label(st.credited.user_id) : null,
      queuedBy: st.queued && !st.credited ? label(st.queued.user_id) : null,
      candidates: st.credited ? [] : await candidatesFor(supabaseAdmin, caller, wallet.code, result.amount, names),
    };
  });

/** Credit a verified on-chain transfer to a member: re-verifies on-chain, one credit per TxID, Owner 2 limited to its downline. */
export const creditRecoveryTx = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { walletCode: string; txHash: string; member: string; note?: string }) => z.object({
    walletCode: z.string().trim().min(2).max(20), txHash: hashSchema, member: z.string().trim().min(2).max(60), note: z.string().trim().max(120).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { recoveryCaller, memberNames, hashStatus } = await import('./deposit-recovery.server');
    const { verifyUsdtDeposit } = await import('./deposit.server');
    const caller = await recoveryCaller(context, admin);
    const wallet = caller.wallets.find(w => w.code === data.walletCode);
    if (!wallet) throw new Error('Wallet ini tidak ada dalam akses Anda.');
    const hash = normalizeHash(wallet.network, data.txHash);

    // Resolve member by referral code or username.
    const key = data.member.replace(/^@/, '');
    const { data: byCode } = await admin.from('referral_codes').select('user_id').ilike('code', key).limit(2);
    let memberId = byCode?.length === 1 ? byCode[0]!.user_id : null;
    if (!memberId) { const { data: byName } = await admin.from('profiles').select('user_id').ilike('username', key).limit(2); if (byName?.length === 1) memberId = byName[0]!.user_id; }
    if (!memberId) throw new Error('Member tidak ditemukan. Gunakan kode referral atau username yang tepat.');
    if (caller.scope && !caller.scope.has(memberId)) throw new Error('Member ini di luar jaringan Anda.');
    if (memberId === caller.userId) throw new Error('Tidak bisa mengkreditkan ke akun sendiri.');
    const { data: clone } = await admin.from('bix_clone_accounts').select('user_id').eq('user_id', memberId).maybeSingle();
    if (clone) throw new Error('Akun clone tidak boleh menerima deposit on-chain.');

    const result = await verifyUsdtDeposit(wallet.network, hash, wallet.address, wallet.asset);
    if (!result.ok) throw new Error(result.reason);
    const amount = manualCreditAmount(result.amount);
    if (amount < MANUAL_MIN_USD) throw new Error(`Minimal deposit ${MANUAL_MIN_USD} USD stablecoin.`);

    const names = await memberNames(admin);
    const st = await hashStatus(admin, hash);
    if (st.credited) throw new Error(`TxID ini sudah masuk ke ${st.credited.user_id === memberId ? 'member ini' : (!caller.scope || caller.scope.has(st.credited.user_id) ? names.get(st.credited.user_id)?.code ?? 'member lain' : 'member lain')}.`);
    if (st.queued && st.queued.user_id !== memberId) throw new Error('TxID ini sudah diajukan member lain. Tolak pengajuan itu dulu bila salah.');

    const now = new Date().toISOString();
    const approver = names.get(caller.userId)?.code ?? (caller.owner1 ? 'OWNER 1' : 'OWNER 2');
    const row = { amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'approved', tx_hash: hash, wallet_code: wallet.code, network: wallet.network, address: wallet.address, verified_at: now, reviewed_at: now,
      note: `Manual on-chain approval · ${caller.owner1 ? 'Owner 1' : 'Owner 2'} ${approver} · ${wallet.asset} ${wallet.code}${data.note ? ` · ${data.note}` : ''}` };

    // Reuse the member's own pending row (queued TxID or reported transfer) so nothing is approved twice later.
    let targetId = st.queued?.id ?? null;
    if (!targetId) {
      const { data: claim } = await admin.from('wallet_transactions').select('id').eq('user_id', memberId).eq('type', 'deposit').eq('status', 'pending').is('tx_hash', null).eq('wallet_code', wallet.code).order('created_at', { ascending: false }).limit(1).maybeSingle();
      targetId = claim?.id ?? null;
    }
    let txId: string;
    if (targetId) {
      const { data: upd, error } = await admin.from('wallet_transactions').update(row).eq('id', targetId).eq('status', 'pending').select('id').maybeSingle();
      if (error) throw new Error(error.code === '23505' ? 'TxID ini sudah dikreditkan.' : error.message);
      if (!upd) throw new Error('Pengajuan member sudah diproses. Muat ulang lalu coba lagi.');
      txId = upd.id;
      await admin.from('deposit_intents').update({ status: 'credited', tx_hash: hash, credited_at: now }).eq('claim_tx_id', txId).eq('status', 'pending');
    } else {
      const { data: ins, error } = await admin.from('wallet_transactions').insert({ ...row, user_id: memberId, type: 'deposit' }).select('id').single();
      if (error) throw new Error(error.code === '23505' ? 'TxID ini sudah dikreditkan.' : error.message);
      txId = ins.id;
    }
    return { ok: true, amount, member: names.get(memberId)?.code ?? '—', txId };
  });

/** Owner 1 only: credit a member when the blockchain check is unavailable. Recorded as "TxID pending"; refuses a second pending credit for the same member until the first gets its TxID. */
export const manualCreditNoHash = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { walletCode: string; member: string; amount: number; note: string }) => z.object({
    walletCode: z.string().trim().min(2).max(20), member: z.string().trim().min(2).max(60), amount: z.number().min(1).max(5000), note: z.string().trim().min(5).max(120),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { recoveryCaller, memberNames } = await import('./deposit-recovery.server');
    const caller = await recoveryCaller(context, admin);
    if (!caller.owner1) throw new Error('Kredit tanpa TxID hanya untuk Owner 1.');
    const wallet = caller.wallets.find(w => w.code === data.walletCode);
    if (!wallet) throw new Error('Wallet tidak ditemukan.');
    const key = data.member.replace(/^@/, '');
    const { data: byCode } = await admin.from('referral_codes').select('user_id').ilike('code', key).limit(2);
    let memberId = byCode?.length === 1 ? byCode[0]!.user_id : null;
    if (!memberId) { const { data: byName } = await admin.from('profiles').select('user_id').ilike('username', key).limit(2); if (byName?.length === 1) memberId = byName[0]!.user_id; }
    if (!memberId) throw new Error('Member tidak ditemukan.');
    if (memberId === caller.userId) throw new Error('Tidak bisa mengkreditkan ke akun sendiri.');
    const { data: clone } = await admin.from('bix_clone_accounts').select('user_id').eq('user_id', memberId).maybeSingle();
    if (clone) throw new Error('Akun clone tidak boleh menerima deposit.');
    const { data: open } = await admin.from('wallet_transactions').select('id,amount_usd,created_at').eq('user_id', memberId).eq('type', 'deposit').eq('status', 'approved').is('tx_hash', null).ilike('note', 'Manual owner credit%').limit(1);
    if (open?.length) throw new Error(`Member ini masih punya kredit manual ${open[0]!.amount_usd} USD tanpa TxID. Lengkapi TxID-nya dulu lewat Cek on-chain agar tidak ganda.`);
    const amount = manualCreditAmount(data.amount);
    const names = await memberNames(admin);
    const now = new Date().toISOString();
    const { data: ins, error } = await admin.from('wallet_transactions').insert({ user_id: memberId, type: 'deposit', amount_usd: amount, fee_usd: 0, net_usd: amount, status: 'approved', wallet_code: wallet.code, network: wallet.network, address: wallet.address, verified_at: now, reviewed_at: now,
      note: `Manual owner credit · TxID pending · Owner 1 ${names.get(caller.userId)?.code ?? ''} · ${data.note}` }).select('id').single();
    if (error) throw new Error(error.message);
    return { ok: true, amount, member: names.get(memberId)?.code ?? '—', txId: ins.id };
  });
