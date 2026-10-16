import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/bixlink';

const STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'] as const;

/** Owner order desk: update status and tracking number. RLS allows only admins to update. */
export function AdminShopOrders({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [edits, setEdits] = useState<Record<string, { status: string; tracking: string }>>({});
  const q = useQuery({ queryKey: ['admin-shop-orders'], queryFn: async () => { const { data, error } = await supabase.from('bix_shop_orders').select('*').order('created_at', { ascending: false }).limit(200); if (error) throw error; return data; } });
  const rows = (q.data ?? []).filter(o => filter === 'all' || o.status === filter);
  const save = async (id: string) => {
    const e = edits[id]; if (!e) return;
    const { error } = await supabase.from('bix_shop_orders').update({ status: e.status, tracking_number: e.tracking.trim() || null, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { onMessage(error.message); return; }
    onMessage('Order updated.'); await qc.invalidateQueries({ queryKey: ['admin-shop-orders'] });
  };
  return <section className="mt-4 min-w-0">
    <div className="flex flex-wrap gap-2">{['all', ...STATUSES].map(s => <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} className="rounded-full capitalize" onClick={() => setFilter(s)}>{s}</Button>)}</div>
    {q.isPending ? <p className="mt-4 text-sm text-muted-foreground">Loading orders…</p> : !rows.length ? <p className="mt-4 text-sm text-muted-foreground">No orders.</p> :
    <div className="mt-4 grid gap-3">{rows.map(o => { const e = edits[o.id] ?? { status: o.status, tracking: o.tracking_number ?? '' }; const items = (o.items as { name: string; qty: number }[]) ?? []; return <article key={o.id} className="min-w-0 rounded-xl border border-border bg-card p-3 text-xs">
      <div className="flex flex-wrap justify-between gap-2"><b className="font-mono">#{o.id.slice(0, 8).toUpperCase()}</b><b className="numeric">{money(Number(o.subtotal_usd) + Number(o.shipping_usd))}</b></div>
      <p className="mt-1 text-muted-foreground">{items.map(i => `${i.qty}× ${i.name}`).join(', ')} · {o.courier}</p>
      <p className="mt-1 break-words">{o.recipient} · {o.phone} · {o.address}, {o.city} {o.postal_code}, {o.country}</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <select className="form-input" value={e.status} onChange={ev => setEdits({ ...edits, [o.id]: { ...e, status: ev.target.value } })}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <input className="form-input" placeholder="Tracking number" maxLength={80} value={e.tracking} onChange={ev => setEdits({ ...edits, [o.id]: { ...e, tracking: ev.target.value } })}/>
        <Button size="sm" onClick={() => save(o.id)}>Save</Button>
      </div>
    </article>; })}</div>}
  </section>;
}
