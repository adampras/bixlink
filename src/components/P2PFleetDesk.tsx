import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Copy, ShieldCheck, X } from 'lucide-react';
import { getFleetDesk, submitFleetBuy, recheckMyFleetOrder } from '@/lib/p2p-fleet.functions';
import type { FleetMerchant } from '@/lib/p2p-fleet';

/** Official Desk: Owner 1 liquidity fleet. Member pays real USDT BEP-20 to their assigned wallet, submits TxID, BIX is credited after on-chain verification. */
export function P2PFleetDesk() {
  const qc = useQueryClient();
  const load = useServerFn(getFleetDesk); const submit = useServerFn(submitFleetBuy); const recheck = useServerFn(recheckMyFleetOrder);
  const q = useQuery({ queryKey: ['p2p-fleet'], queryFn: () => load(), refetchInterval: () => (document.hidden ? false : 60_000) });
  const [pick, setPick] = useState<FleetMerchant | null>(null);
  const [usdt, setUsdt] = useState('100'); const [tx, setTx] = useState(''); const [busy, setBusy] = useState(false);
  const d = q.data;
  if (!d?.enabled) return null;

  const done = (r: { status: string; reason?: string; bix?: number }) => {
    if (r.status === 'credited') { toast.success(`${r.bix?.toLocaleString()} BIX credited to your wallet`); setPick(null); setTx(''); }
    else if (r.status === 'pending') toast.message(`Waiting for blockchain confirmation. ${r.reason ?? ''}`);
    else toast.error(r.reason ?? 'Transfer could not be verified.');
    qc.invalidateQueries({ queryKey: ['p2p-fleet'] });
  };
  const send = async () => {
    if (!pick) return; setBusy(true);
    try { done(await submit({ data: { merchant: pick.name, txHash: tx.trim() } })); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const est = pick ? Math.floor((Number(usdt) || 0) / pick.price * 100) / 100 : 0;

  return <section className="rounded-2xl border border-primary/30 bg-card p-4 grid gap-3" aria-label="Official Desk">
    <header className="flex items-center justify-between gap-2">
      <div><b className="text-sm tracking-wide">OFFICIAL DESK · BUY BIX WITH USDT</b><p className="text-[11px] text-muted-foreground">BIXLINK liquidity merchants · pay USDT BEP-20 · auto-credit after on-chain check</p></div>
      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/15 text-primary">{d.merchants.length} ONLINE</span>
    </header>
    <div className="grid gap-2 max-h-80 overflow-y-auto">
      {d.merchants.map(m => <button key={m.name} onClick={() => setPick(m)} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-left hover:border-primary">
        <span><b className="text-sm">{m.name}</b> <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">OFFICIAL DESK</span><br /><small className="text-muted-foreground">{m.fills} fills · stock {m.stockBix.toLocaleString()} BIX</small></span>
        <span className="text-right"><b className="text-primary">${m.price.toFixed(4)}</b><br /><small className="text-muted-foreground">per BIX</small></span>
      </button>)}
    </div>
    {d.orders.length > 0 && <div className="grid gap-1">
      <small className="font-bold text-muted-foreground">MY DESK ORDERS</small>
      {d.orders.map((o: any) => <div key={o.id} className="flex justify-between text-xs rounded-lg bg-background/50 px-2 py-1.5">
        <span>{o.merchant} · {Number(o.usdt) || '—'} USDT</span>
        <span className={o.status === 'credited' ? 'text-primary font-bold' : o.status === 'rejected' ? 'text-destructive' : ''}>{o.status === 'credited' ? `+${Number(o.bix).toLocaleString()} BIX` : o.status}
          {o.status === 'pending' && <button className="ml-2 underline" onClick={async () => { try { done(await recheck({ data: { id: o.id } })); } catch (e) { toast.error((e as Error).message); } }}>check</button>}</span>
      </div>)}
    </div>}
    <p className="text-[10px] text-muted-foreground">Official Desk merchants are BIXLINK-operated liquidity accounts. BIX is an internal ledger asset; you only receive BIX after the USDT transfer is confirmed on BNB Smart Chain.</p>

    {pick && d.wallet && <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center bg-background/90 p-3" onClick={() => setPick(null)}>
      <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-card p-4 grid gap-3" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><b>Buy from {pick.name}</b><button aria-label="Close" onClick={() => setPick(null)}><X size={18} /></button></div>
        <label className="text-xs">Amount USDT<input inputMode="decimal" value={usdt} onChange={e => setUsdt(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" /></label>
        <p className="text-sm">You receive ≈ <b className="text-primary">{est.toLocaleString()} BIX</b> @ ${pick.price.toFixed(4)} <small className="text-muted-foreground">(final amount uses the USDT actually received · min {d.minUsdt})</small></p>
        <div className="rounded-xl bg-background p-3 text-xs grid gap-1">
          <span className="text-muted-foreground">1 · Send USDT on <b>BNB Smart Chain (BEP-20)</b> only to:</span>
          <code className="break-all text-sm select-text">{d.wallet.address}</code>
          <button className="justify-self-start flex items-center gap-1 text-primary" onClick={() => { navigator.clipboard.writeText(d.wallet!.address); toast.success('Address copied'); }}><Copy size={14} /> Copy address</button>
        </div>
        <label className="text-xs">2 · Paste the TxID (transaction hash)<input value={tx} onChange={e => setTx(e.target.value)} placeholder="0x…" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-mono" /></label>
        <button disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(tx.trim())} onClick={send} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"><ShieldCheck size={16} /> {busy ? 'Verifying on-chain…' : 'Verify & receive BIX'}</button>
      </div>
    </div>}
  </section>;
}
