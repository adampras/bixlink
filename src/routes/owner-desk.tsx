import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminWallet, reviewWalletTx, reviewSwap } from '@/lib/bixlink.functions';
import { dateTime, money, number } from '@/lib/bixlink';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, X, Zap } from 'lucide-react';

export const Route = createFileRoute('/owner-desk')({
  head: () => ({ meta: [
    { title: 'Owner Desk · BIXLINK' },
    { name: 'description', content: 'Owner-only withdrawal review and real USDT turnover desk.' },
    { property: 'og:title', content: 'Owner Desk · BIXLINK' },
    { property: 'og:description', content: 'Owner-only withdrawal review and real USDT turnover desk.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: OwnerDesk,
});

const BUYBACK = 0.25;

function OwnerDesk() {
  const fetchData = useServerFn(getAdminWallet); const review = useServerFn(reviewWalletTx); const reviewEx = useServerFn(reviewSwap);
  const qc = useQueryClient(); const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['admin-wallet'], queryFn: () => fetchData(), refetchInterval: 30000 });
  if (q.isError) return <main className="mx-auto max-w-3xl p-6"><p role="alert" className="text-destructive">This page is exclusively for Owner 1.</p><Link to="/profile" className="mt-3 inline-block text-sm underline">Back to Profile</Link></main>;
  if (!q.data) return <main className="mx-auto max-w-3xl p-6 text-muted-foreground">Memuat…</main>;
  const txs = q.data.transactions; const swaps = q.data.swaps;
  const real = txs.filter(t => t.type === 'deposit' && t.status === 'approved' && t.tx_hash);
  const wdDone = txs.filter(t => t.type === 'withdraw' && t.status === 'approved');
  const dep = real.reduce((s, t) => s + Number(t.amount_usd), 0); const wd = wdDone.reduce((s, t) => s + Number(t.amount_usd), 0);
  const pendingWd = txs.filter(t => t.type === 'withdraw' && t.status === 'pending');
  const pendingSell = swaps.filter(s => s.status === 'pending' && s.direction === 'BIX_TO_USDT');
  const recent = txs.filter(t => t.status !== 'pending' && (t.type === 'withdraw' || t.type === 'deposit')).slice(0, 15);
  const act = async (id: string, status: 'approved' | 'rejected', swap = false) => {
    if (!window.confirm(status === 'approved' ? 'Approve this request?' : 'Reject this request?')) return;
    setBusy(id); setMsg('');
    try { swap ? await reviewEx({ data: { id, status } }) : await review({ data: { id, status } }); await qc.invalidateQueries({ queryKey: ['admin-wallet'] }); setMsg(status === 'approved' ? 'Approved.' : 'Rejected.'); }
    catch { setMsg('Failed to process.'); } finally { setBusy(null); }
  };
  const Actions = ({ id, swap }: { id: string; swap?: boolean }) => <div className="flex gap-2">
    <Button size="sm" disabled={busy === id} onClick={() => act(id, 'approved', swap)}><Check/>Approve</Button>
    <Button size="sm" variant="destructive" disabled={busy === id} onClick={() => act(id, 'rejected', swap)}><X/>Reject</Button></div>;
  return <main className="mx-auto max-w-3xl space-y-6 p-4 pb-24 text-foreground">
    <div className="flex items-center justify-between"><Link to="/profile" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={16}/>Profile</Link><h1 className="font-display text-lg font-black">Owner Desk</h1></div>
    {msg && <p role="status" className="text-sm text-chart-2">{msg}</p>}
    <section className="grid grid-cols-3 gap-2 text-center">
      {[['Real deposit', dep, 'text-chart-2'], ['WD approved', wd, 'text-destructive'], ['Net kas', dep - wd, 'text-chart-3']].map(([l, v, c]) => <div key={l as string} className="rounded-xl border border-border bg-card p-3"><span className="text-[10px] text-muted-foreground">{l}</span><b className={`numeric mt-1 block text-sm ${c}`}>{money(v as number)}</b></div>)}
    </section>
    <p className="text-[11px] text-muted-foreground">Omset real = deposit USDT disetujui dengan TxID on-chain ({real.length} transaksi).</p>

    <section><h2 className="mb-2 font-bold">Antrean WD · {pendingWd.length}</h2><div className="space-y-2">
      {pendingWd.map(t => <div key={t.id} className="rounded-xl border border-border bg-card p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2"><b className="numeric text-base">{money(Number(t.amount_usd))}</b><span className="text-muted-foreground">{dateTime(t.created_at)}</span></div>
        {Number(t.fee_usd) > 0 && <p className="text-muted-foreground">Kirim bersih {money(Number(t.net_usd))}</p>}
        <p className="mt-1 break-all font-mono text-muted-foreground">{t.address ?? '—'} {t.network ? `· ${t.network}` : ''}</p>
        <p className="text-muted-foreground">Member {t.user_id.slice(0, 8)}</p>
        <div className="mt-2"><Actions id={t.id}/></div></div>)}
      {!pendingWd.length && <p className="text-sm text-muted-foreground">No pending WD.</p>}</div></section>

    <Link to="/buyback" className="block rounded-xl border border-chart-3 bg-card p-3 text-sm font-bold text-chart-3">⚡ Open Dev Buyback (track BIX source) →</Link>
    <section><h2 className="mb-2 font-bold">Jual BIX → USDT · {pendingSell.length}</h2><div className="space-y-2">
      {pendingSell.map(s => { const fast = Number(s.price_usd) <= BUYBACK; return <div key={s.id} className={`rounded-xl border bg-card p-3 text-xs ${fast ? 'border-chart-3' : 'border-border'}`}>
        {fast && <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-black text-chart-3"><Zap size={11}/>DEV BUYBACK $0.25 · PRIORITAS</span>}
        <p><b>{number(Number(s.amount_in), { maximumFractionDigits: 4 })} BIX</b> → <b className="text-chart-2">{money(Number(s.amount_out))}</b> @ ${Number(s.price_usd).toFixed(4)}</p>
        <p className="text-muted-foreground">{dateTime(s.created_at)} · Member {s.user_id.slice(0, 8)}</p>
        <div className="mt-2"><Actions id={s.id} swap/></div></div>; })}
      {!pendingSell.length && <p className="text-sm text-muted-foreground">No pending sales.</p>}</div></section>

    <section><h2 className="mb-2 font-bold">Recent history</h2><div className="divide-y divide-border rounded-xl border border-border bg-card text-xs">
      {recent.map(t => <div key={t.id} className="flex items-center justify-between p-3"><span className="capitalize">{t.type} · {dateTime(t.reviewed_at ?? t.created_at)}</span><span className={t.status === 'approved' ? 'text-chart-2' : 'text-destructive'}>{money(Number(t.amount_usd))} · {t.status}</span></div>)}
      {!recent.length && <p className="p-3 text-muted-foreground">No history yet.</p>}</div></section>
  </main>;
}
