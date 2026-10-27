import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchRigs, type MiningRig } from '@/lib/mining-rigs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function MiningPreorder({ bixPrice }: { bixPrice: number }) {
  const qc = useQueryClient();
  const { data: rigs = [] } = useQuery({ queryKey: ['mining-rigs'], queryFn: fetchRigs });
  const { data: session } = useQuery({ queryKey: ['mining-session'], queryFn: async () => (await supabase.auth.getSession()).data.session });
  const { data: orders = [] } = useQuery({ enabled: Boolean(session), queryKey: ['mining-preorders', session?.user.id], queryFn: async () => (await supabase.from('bix_mining_preorders').select('id,rig_id,units,price_usd,status,created_at').eq('user_id', session!.user.id).order('created_at', { ascending: false })).data ?? [] });
  const [pick, setPick] = useState<MiningRig | null>(null);
  const [units, setUnits] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    if (!pick) return; setBusy(true); setMsg('');
    const { error } = await supabase.rpc('bix_mining_preorder', { p_rig: pick.id, p_units: units });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg('Pre-order reserved. The owner team will contact you to confirm payment.');
    await qc.invalidateQueries({ queryKey: ['mining-rigs'] }); await qc.invalidateQueries({ queryKey: ['mining-preorders'] });
  }

  return <>
    <div className="grid gap-3 md:grid-cols-3">
      {rigs.filter((r) => r.enabled || r.reserved > 0).map((r) => { const left = Math.max(0, r.quota - r.reserved); const pct = r.quota ? (r.reserved / r.quota) * 100 : 100;
        return <section key={r.id} className="q-panel rounded-2xl p-4 text-center">
          <Cpu className="mx-auto text-primary" size={28} />
          <h2 className="mt-2 text-xs font-black tracking-widest text-primary">{r.name}</h2>
          <p className="numeric mt-1 text-3xl font-black">{r.hashrate_th} <span className="text-sm">TH/s</span></p>
          <p className="text-xs text-muted-foreground">{r.note}</p>
          <p className="numeric mt-2 text-sm">Price <b className="text-chart-2">${r.price_usd.toLocaleString()} USDT</b></p>
          <p className="numeric text-[11px] text-muted-foreground">≈ {(r.price_usd / bixPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} BIX @ ${bixPrice.toFixed(6)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
          <p className="numeric mt-1 text-[11px] text-muted-foreground">{left} / {r.quota} units left</p>
          <button type="button" disabled={!r.enabled || left === 0} onClick={() => { setPick(r); setUnits(1); setMsg(''); }} className="mt-3 w-full rounded-full bg-primary py-2 text-[11px] font-black tracking-widest text-primary-foreground disabled:opacity-50">{left === 0 ? 'SOLD OUT' : r.enabled ? 'PRE-ORDER NOW' : 'CLOSED'}</button>
        </section>; })}
    </div>
    {orders.length > 0 && <section className="q-panel rounded-2xl p-4 text-sm">
      <h3 className="text-xs font-black tracking-widest text-primary">MY PRE-ORDERS</h3>
      {orders.map((o) => <div key={o.id} className="numeric mt-1 flex justify-between border-t border-border pt-1 text-xs"><span>{o.rig_id} × {o.units}</span><span>${Number(o.price_usd).toLocaleString()}</span><span className="capitalize text-primary">{o.status}</span></div>)}
    </section>}
    <Dialog open={Boolean(pick)} onOpenChange={(o) => !o && setPick(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pre-order {pick?.name}</DialogTitle></DialogHeader>
        {pick && <div className="space-y-3 text-sm">
          <label className="grid gap-1">Units (1–10)<input type="number" min={1} max={10} value={units} onChange={(e) => setUnits(Math.min(10, Math.max(1, Math.floor(+e.target.value || 1))))} className="rounded-lg border border-border bg-background p-2" /></label>
          <p className="numeric">Total hashrate <b>{pick.hashrate_th * units} TH/s</b> · Total <b className="text-chart-2">${(pick.price_usd * units).toLocaleString()} USDT</b></p>
          <p className="text-[11px] text-muted-foreground">A pre-order reserves units only. No balance is charged now; payment and activation are confirmed by the owner team before mining launch. Mining output is a projection, not a guaranteed return.</p>
          {!session ? <Link to="/auth" className="block rounded-full bg-primary py-2 text-center text-xs font-black text-primary-foreground">SIGN IN TO PRE-ORDER</Link>
            : <button type="button" disabled={busy} onClick={submit} className="w-full rounded-full bg-primary py-2 text-xs font-black tracking-widest text-primary-foreground disabled:opacity-50">{busy ? 'RESERVING…' : 'CONFIRM PRE-ORDER'}</button>}
          {msg && <p className="text-xs text-primary">{msg}</p>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
