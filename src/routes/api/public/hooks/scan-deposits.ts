import { createFileRoute } from '@tanstack/react-router';

// Runs every 5 minutes: matches pending exact-amount deposits against the owner wallets on chain.
// Idempotent and only credits a confirmed on-chain transfer to the member who requested that exact amount.
export const Route = createFileRoute('/api/public/hooks/scan-deposits')({
  server: { handlers: { POST: async ({ request }) => {
    const { authenticateCronRequest } = await import('@/integrations/supabase/cron-auth');
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { matchIntent } = await import('@/lib/deposit-match.server');
    const { data: intents } = await supabaseAdmin.from('deposit_intents').select('*').eq('status', 'pending').order('created_at').limit(100);
    const cache = new Map();
    let credited = 0;
    for (const i of intents ?? []) { const r = await matchIntent(supabaseAdmin, i, cache); if (r.status === 'credited') credited++; }
    // Smart queue: TxIDs submitted before the exchange broadcast or before enough confirmations.
    const { verifyUsdtDeposit } = await import('@/lib/deposit.server');
    const since = new Date(Date.now() - 72 * 3600_000).toISOString();
    const { data: queued } = await supabaseAdmin.from('wallet_transactions').select('id,tx_hash,network,address,note').eq('type', 'deposit').eq('status', 'pending').is('verified_at', null).like('note', 'Queued TxID%').gte('created_at', since).limit(50);
    let queueCredited = 0;
    for (const q of queued ?? []) {
      if (!q.tx_hash || !q.address || !q.network) continue;
      const asset = /· USDC /.test(q.note ?? '') ? 'USDC' : 'USDT';
      const r = await verifyUsdtDeposit(q.network as 'BEP20' | 'TRC20' | 'ERC20', q.tx_hash, q.address, asset);
      if (!r.ok) {
        if (!r.pending) await supabaseAdmin.from('wallet_transactions').update({ status: 'rejected', note: `${q.note} · ${r.reason}`, reviewed_at: new Date().toISOString() }).eq('id', q.id).eq('status', 'pending');
        continue;
      }
      if (r.amount < 1) continue;
      const amount = Math.floor(r.amount * 100) / 100; const now = new Date().toISOString();
      const { error } = await supabaseAdmin.from('wallet_transactions').update({ status: 'approved', amount_usd: amount, net_usd: amount, verified_at: now, reviewed_at: now, note: `Auto-verified (queue) · ${asset}` }).eq('id', q.id).eq('status', 'pending');
      if (!error) queueCredited++;
    }
    credited += queueCredited;
    try { const { dispatchWalletAlerts } = await import('@/lib/notify.server'); await dispatchWalletAlerts(supabaseAdmin); } catch (e) { console.error('notify', e); }
    return Response.json({ checked: intents?.length ?? 0, queued: queued?.length ?? 0, credited });
  } } },
});
