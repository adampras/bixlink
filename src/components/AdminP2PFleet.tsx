import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { getFleetAdmin, saveFleetConfig, recheckFleetOrder } from '@/lib/p2p-fleet.functions';
import { DEFAULT_FLEET, type FleetConfig } from '@/lib/p2p-fleet';

/** Owner 1: Official Desk fleet size, active %, price corridor, and the live TxID order feed with a fast re-check. */
export function AdminP2PFleet() {
  const load = useServerFn(getFleetAdmin); const save = useServerFn(saveFleetConfig); const recheck = useServerFn(recheckFleetOrder);
  const q = useQuery({ queryKey: ['p2p-fleet-admin'], queryFn: () => load(), refetchInterval: () => (document.hidden ? false : 20_000) });
  const [cfg, setCfg] = useState<FleetConfig>(DEFAULT_FLEET);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => { if (q.data) setCfg(q.data.config); }, [q.data?.config]);
  useEffect(() => {
    const orders = q.data?.orders ?? [];
    if (seen.current) for (const o of orders) if (!seen.current.has(o.id)) toast.success(`New desk order · ${o.merchant} · ${o.status === 'credited' ? `${o.usdt} USDT → ${o.bix} BIX` : o.status}`, { duration: 8000 });
    seen.current = new Set(orders.map((o: any) => o.id));
  }, [q.data?.orders]);
  const num = (k: keyof FleetConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setCfg(c => ({ ...c, [k]: Number(e.target.value) }));
  const active = Math.round(cfg.total * cfg.activePct / 100);

  return <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
    <b>P2P Official Desk fleet</b>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.enabled} onChange={e => setCfg(c => ({ ...c, enabled: e.target.checked }))} /> Desk open</label>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <label>Fleet accounts (50–100)<input type="number" min={50} max={100} value={cfg.total} onChange={num('total')} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-base" /></label>
      <label>Active selling %<input type="number" min={1} max={100} value={cfg.activePct} onChange={num('activePct')} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-base" /></label>
      <label>Min price $<input type="number" step="0.0001" value={cfg.minPrice} onChange={num('minPrice')} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-base" /></label>
      <label>Max price $<input type="number" step="0.0001" value={cfg.maxPrice} onChange={num('maxPrice')} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-base" /></label>
      <label>Min order USDT<input type="number" value={cfg.minUsdt} onChange={num('minUsdt')} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-base" /></label>
      <div className="self-end text-sm">→ <b>{active}</b> accounts selling now</div>
    </div>
    <button className="rounded-xl bg-primary py-2 font-bold text-primary-foreground" onClick={async () => { try { await save({ data: cfg }); toast.success('Desk settings saved'); q.refetch(); } catch (e) { toast.error((e as Error).message); } }}>Save</button>
    <p className="text-[11px] text-muted-foreground">Members pay to their assigned BEP-20 wallet from the Deposit wallets list (one stable wallet per member). BIX is credited automatically once the TxID is confirmed on-chain; each TxID can be used once.</p>
    <b className="text-sm">Latest orders</b>
    <div className="grid gap-1 max-h-96 overflow-y-auto">
      {(q.data?.orders ?? []).map((o: any) => <div key={o.id} className="rounded-lg bg-background/60 px-2 py-1.5 text-xs flex flex-wrap justify-between gap-1">
        <span>{new Date(o.created_at).toLocaleString()} · {o.merchant} · {o.wallet_code}</span>
        <span className="font-bold">{o.status === 'credited' ? `${o.usdt} USDT → ${o.bix} BIX` : o.status}</span>
        <span className="w-full flex gap-3">
          <a className="text-primary underline" href={`https://bscscan.com/tx/${o.tx_hash}`} target="_blank" rel="noreferrer">Open TxID</a>
          {o.status === 'pending' && <button className="text-primary underline" onClick={async () => { try { const r = await recheck({ data: { id: o.id } }); toast.message(r.status); q.refetch(); } catch (e) { toast.error((e as Error).message); } }}>Re-check & release</button>}
          {o.note && <span className="text-muted-foreground">{o.note}</span>}
        </span>
      </div>)}
    </div>
  </section>;
}
