import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchRigs, type MiningRig } from '@/lib/mining-rigs';
import { Button } from '@/components/ui/button';

const blank: MiningRig = { id: '', name: '', hashrate_th: 10, price_usd: 100, quota: 100, reserved: 0, note: '', enabled: true, sort: 0 };

export function AdminMiningRigs({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const { data: rigs = [] } = useQuery({ queryKey: ['mining-rigs'], queryFn: fetchRigs });
  const { data: orders = [], refetch } = useQuery({ queryKey: ['admin-mining-preorders'], queryFn: async () => (await supabase.from('bix_mining_preorders').select('*').order('created_at', { ascending: false }).limit(100)).data ?? [] });
  const [edit, setEdit] = useState<MiningRig | null>(null);

  async function save() {
    if (!edit) return;
    const { error } = await supabase.rpc('bix_mining_rig_save', { p_id: edit.id.toUpperCase(), p_name: edit.name, p_th: edit.hashrate_th, p_price: edit.price_usd, p_quota: edit.quota, p_note: edit.note, p_enabled: edit.enabled });
    if (error) return onMessage('Failed to save machine: ' + error.message);
    onMessage('Machine package saved.'); setEdit(null); await qc.invalidateQueries({ queryKey: ['mining-rigs'] });
  }
  async function review(id: string, ok: boolean) {
    const { error } = await supabase.rpc('bix_mining_preorder_review', { p_id: id, p_approve: ok });
    if (error) return onMessage(error.message);
    await refetch(); await qc.invalidateQueries({ queryKey: ['mining-rigs'] });
  }
  const f = (k: keyof MiningRig, num = false) => (e: React.ChangeEvent<HTMLInputElement>) => edit && setEdit({ ...edit, [k]: num ? Number(e.target.value) : e.target.value });

  return <section className="mt-6 space-y-4 rounded-2xl border border-border p-4">
    <div className="flex items-center justify-between"><h2 className="font-black">Mining Machine · Packages, Prices & Quotas</h2><Button size="sm" onClick={() => setEdit({ ...blank })}>+ New package</Button></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr>{['Code','Nama','TH/s','USDT Price','Terpesan / Kuota','Status',''].map((x) => <th key={x} className="p-2">{x}</th>)}</tr></thead>
      <tbody>{rigs.map((r) => <tr key={r.id} className="border-t border-border"><td className="p-2 font-mono">{r.id}</td><td className="p-2">{r.name}</td><td className="p-2">{r.hashrate_th}</td><td className="p-2">${r.price_usd.toLocaleString()}</td><td className="p-2">{r.reserved} / {r.quota}</td><td className="p-2">{r.enabled ? 'Open' : 'Close'}</td><td className="p-2"><Button size="sm" variant="outline" onClick={() => setEdit(r)}>Edit</Button></td></tr>)}</tbody></table></div>
    {edit && <div className="grid gap-2 rounded-xl border border-primary/40 p-3 text-sm sm:grid-cols-2">
      <label className="grid gap-1">Code (A-Z, 0-9)<input disabled={rigs.some((r) => r.id === edit.id)} value={edit.id} onChange={f('id')} className="rounded border border-border bg-background p-2" /></label>
      <label className="grid gap-1">Nama<input value={edit.name} onChange={f('name')} className="rounded border border-border bg-background p-2" /></label>
      <label className="grid gap-1">Hashrate TH/s<input type="number" value={edit.hashrate_th} onChange={f('hashrate_th', true)} className="rounded border border-border bg-background p-2" /></label>
      <label className="grid gap-1">USDT Price<input type="number" value={edit.price_usd} onChange={f('price_usd', true)} className="rounded border border-border bg-background p-2" /></label>
      <label className="grid gap-1">Kuota unit<input type="number" value={edit.quota} onChange={f('quota', true)} className="rounded border border-border bg-background p-2" /></label>
      <label className="grid gap-1">Keterangan<input value={edit.note} onChange={f('note')} className="rounded border border-border bg-background p-2" /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />Open pre-order</label>
      <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setEdit(null)}>Batal</Button></div>
    </div>}
    <h3 className="font-black">Incoming pre-orders</h3>
    {!orders.length ? <p className="text-sm text-muted-foreground">No pre-orders yet.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><tbody>{orders.map((o) => <tr key={o.id} className="border-t border-border"><td className="p-2 font-mono text-xs">{o.user_id.slice(0, 8)}…</td><td className="p-2">{o.rig_id} × {o.units}</td><td className="p-2">${Number(o.price_usd).toLocaleString()}</td><td className="p-2 capitalize">{o.status}</td><td className="flex gap-2 p-2">{o.status === 'pending' && <><Button size="sm" onClick={() => review(o.id, true)}>Konfirmasi</Button><Button size="sm" variant="destructive" onClick={() => review(o.id, false)}>Reject</Button></>}</td></tr>)}</tbody></table></div>}
  </section>;
}
