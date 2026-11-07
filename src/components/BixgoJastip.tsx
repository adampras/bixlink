import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

/** Jastip fee: 10% of the item budget, minimum Rp10.000 (estimate shown before sending). */
export const jastipFee = (budget: number) => Math.max(10000, Math.round(Math.max(0, budget) * 0.1));

type Row = { id: string; item: string; store: string; qty: number; item_budget_idr: number; fee_idr: number; dropoff: string; status: string; pay_method: string; created_at: string; city: string; note: string | null };
const LABEL: Record<string, string> = { pending: 'Waiting', accepted: 'Accepted', shopping: 'Shopping', delivering: 'On the way', completed: 'Done', cancelled: 'Cancelled' };
const NEXT: Record<string, string> = { pending: 'accepted', accepted: 'shopping', shopping: 'delivering', delivering: 'completed' };
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export function BixgoJastip({ city, isAdmin, onBack }: { city: string; isAdmin: boolean; onBack: () => void }) {
  const [item, setItem] = useState(''); const [store, setStore] = useState(''); const [qty, setQty] = useState(1);
  const [budget, setBudget] = useState(0); const [drop, setDrop] = useState(''); const [note, setNote] = useState('');
  const [bix, setBix] = useState(false); const [rows, setRows] = useState<Row[]>([]); const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser(); setUid(u.user?.id ?? null); if (!u.user) return;
    const { data } = await supabase.from('bixgo_jastip_requests').select('*').order('created_at', { ascending: false }).limit(30);
    setRows((data ?? []) as Row[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const fee = jastipFee(budget);
  const send = async () => {
    if (!uid) { toast.error('Sign in to send a Jastip request'); return; }
    setBusy(true);
    const { error } = await supabase.from('bixgo_jastip_requests').insert({ city, item: item.trim(), store: store.trim(), qty, item_budget_idr: budget, fee_idr: fee, dropoff: drop.trim(), note: note.trim() || null, pay_method: bix ? 'BIX Token' : 'Cash' });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Jastip request sent'); setItem(''); setStore(''); setBudget(0); setNote(''); void load();
  };
  const act = async (fn: 'bixgo_jastip_cancel' | 'bixgo_jastip_set_status', r: Row, status?: string) => {
    const { error } = fn === 'bixgo_jastip_cancel' ? await supabase.rpc(fn, { _id: r.id }) : await supabase.rpc(fn, { _id: r.id, _status: status! });
    if (error) toast.error(error.message); else void load();
  };
  const ok = item.trim().length > 1 && store.trim().length > 1 && drop.trim().length > 1;
  return <main className="px-4 pb-24 pt-4">
    <div className="flex items-center gap-3"><button aria-label="Back" onClick={onBack}><ArrowLeft className="h-6 w-6"/></button><h1 className="flex-1 text-xl font-black">BIX Jastip</h1><ShoppingBag className="h-6 w-6 text-primary"/></div>
    <p className="mt-1 text-xs text-muted-foreground">We buy it for you at any store and deliver it to your door.</p>
    <section className="mt-4 space-y-2 rounded-3xl border border-border bg-card/80 p-4 text-xs">
      <label className="block">What should we buy?<input className="form-input mt-1" maxLength={200} value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Martabak manis keju"/></label>
      <label className="block">Store / location<input className="form-input mt-1" maxLength={200} value={store} onChange={e => setStore(e.target.value)} placeholder="Store name or address"/></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">Quantity<input type="number" min={1} max={50} className="form-input mt-1" value={qty} onChange={e => setQty(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}/></label>
        <label className="block">Item budget (Rp)<input type="number" min={0} className="form-input mt-1" value={budget || ''} onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))}/></label>
      </div>
      <label className="block">Deliver to<input className="form-input mt-1" maxLength={200} value={drop} onChange={e => setDrop(e.target.value)} placeholder="Your address"/></label>
      <label className="block">Note<input className="form-input mt-1" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Size, colour, alternatives…"/></label>
      <div className="flex gap-2">{[false, true].map(b => <button key={String(b)} onClick={() => setBix(b)} className={`flex-1 rounded-xl border py-2 ${bix === b ? 'border-primary bg-primary/15 font-bold' : 'border-border'}`}>{b ? 'BIX' : 'Cash'}</button>)}</div>
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
        <div className="flex justify-between"><span>Items (estimate)</span><span>{rp(budget)}</span></div>
        <div className="flex justify-between"><span>Jastip fee</span><span>{rp(fee)}</span></div>
        <div className="flex justify-between border-t border-border pt-1 text-sm font-bold"><span>Estimated total</span><span>{rp(budget + fee)}</span></div>
      </div>
      <Button className="w-full" disabled={!ok || busy} onClick={() => void send()}>Send Jastip request</Button>
      <p className="text-center text-[10px] text-muted-foreground">Request only — nothing is charged now. You pay the final receipt amount on delivery.</p>
    </section>
    <h2 className="mt-5 text-sm font-bold">{isAdmin ? 'All Jastip requests' : 'My Jastip'}</h2>
    {!uid && <p className="mt-2 text-xs text-muted-foreground">Sign in to see your requests.</p>}
    {uid && !rows.length && <p className="mt-2 text-xs text-muted-foreground">No requests yet.</p>}
    <div className="mt-2 space-y-2">{rows.map(r => <div key={r.id} className="rounded-2xl border border-border bg-card/80 p-3 text-xs">
      <div className="flex justify-between"><b>{r.qty}× {r.item}</b><span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{LABEL[r.status] ?? r.status}</span></div>
      <p className="text-muted-foreground">{r.store} → {r.dropoff}</p>
      <p className="text-muted-foreground">{rp(Number(r.item_budget_idr) + Number(r.fee_idr))} · {r.pay_method} · {r.city} · {new Date(r.created_at).toLocaleString()}</p>
      {r.note && <p className="text-muted-foreground">“{r.note}”</p>}
      <div className="mt-2 flex gap-2">
        {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => void act('bixgo_jastip_cancel', r)}>Cancel</Button>}
        {isAdmin && NEXT[r.status] && <Button size="sm" onClick={() => void act('bixgo_jastip_set_status', r, NEXT[r.status])}>Mark {LABEL[NEXT[r.status]!]}</Button>}
      </div>
    </div>)}</div>
  </main>;
}
