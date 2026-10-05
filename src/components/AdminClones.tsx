import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { allocateBix, createClones, getAdminClones } from '@/lib/bixlink.functions';
import { Copy, Plus, UsersRound } from 'lucide-react';

export function AdminClones({ onMessage }: { onMessage: (m: string) => void }) {
  const list = useServerFn(getAdminClones); const create = useServerFn(createClones); const allocate = useServerFn(allocateBix);
  const { data = [], refetch } = useQuery({ queryKey: ['admin-clones'], queryFn: () => list() });
  const [count, setCount] = useState('10'); const [amount, setAmount] = useState('100000'); const [busy, setBusy] = useState(false);
  const total = data.reduce((s, c) => s + c.allocated, 0);
  return <div className="mt-8 space-y-6">
    <section className="rounded-[20px] border border-chart-3 bg-card p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-black"><UsersRound size={18}/> Clone accounts</h3>
      <p className="mt-1 text-xs text-muted-foreground">Internal owner accounts placed directly at L1 under the owner, with an initial BIX allocation. They are excluded from public member statistics.</p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Clones</span><b className="numeric block text-xl">{data.length}</b></div><div className="col-span-2 rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Total allocated</span><b className="numeric block text-xl text-chart-3">{total.toLocaleString()} BIX</b></div></div>
      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async e => { e.preventDefault(); if (!window.confirm(`Create ${count} clone accounts with ${Number(amount).toLocaleString()} BIX each?`)) return; setBusy(true); try { const r = await create({ data: { count: Number(count), amount: Number(amount) } }); await refetch(); onMessage(`${r.created} clone accounts created.`); } catch (err) { onMessage(err instanceof Error ? err.message : 'Could not create clones.'); await refetch(); } setBusy(false); }}>
        <label className="text-xs text-muted-foreground">NUMBER OF ACCOUNTS<input className="form-input mt-2" type="number" min="1" max="50" value={count} onChange={e => setCount(e.target.value)}/></label>
        <label className="text-xs text-muted-foreground">BIX PER ACCOUNT<input className="form-input mt-2" type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)}/></label>
        <Button disabled={busy} className="self-end rounded-full bg-chart-3 text-background"><Plus/> {busy ? 'Creating…' : 'Add clones'}</Button>
      </form>
    </section>
    <div className="space-y-2">{data.map(c => <div key={c.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-xs">
      <div><b className="text-sm">{c.label}</b> <span className="ml-1 rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold text-chart-3">CLONE · L1</span><div className="mt-1 text-muted-foreground">@{c.username} · <span className="numeric">{c.code}</span> <button title="Copy code" onClick={() => { navigator.clipboard.writeText(c.code); onMessage('Code copied.'); }}><Copy size={11}/></button></div><div className="text-muted-foreground">{c.email} · {new Date(c.created_at).toLocaleString()}</div></div>
      <div className="flex items-center gap-2"><b className="numeric text-chart-3">{c.allocated.toLocaleString()} BIX</b><Button size="sm" variant="outline" className="rounded-full" onClick={async () => { const v = Number(window.prompt(`Add BIX to ${c.label}`, '100000')); if (!(v > 0)) return; try { await allocate({ data: { userId: c.user_id, amount: v, note: 'Owner top-up' } }); await refetch(); onMessage('BIX added.'); } catch { onMessage('Could not add BIX.'); } }}><Plus/> BIX</Button></div>
    </div>)}{!data.length && <p className="text-sm text-muted-foreground">No clone accounts yet.</p>}</div>
  </div>;
}
