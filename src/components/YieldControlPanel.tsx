import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEditablePackages, saveDurationPackage } from '@/lib/packages.functions';
import { updateSetting } from '@/lib/bixlink.functions';
import { useMember, usePublicConfig, useReviewerAccess } from '@/lib/useMember';
import { PACKAGE_DURATIONS } from '@/lib/package-options';
import { apyToDaily, cleanDaily, DAILY_MAX, DAILY_MIN, DAILY_STEP, flatApys, ladderApys, shiftApys } from '@/lib/yield-preset';
import { number } from '@/lib/bixlink';

export function YieldControlPanel({ market = true }: { market?: boolean }) {
  const { data: cfg } = usePublicConfig();
  const { user } = useMember();
  const reviewer = useReviewerAccess(user?.id);
  const canEdit = Boolean(cfg?.isAdmin || reviewer.data);
  const load = useServerFn(getEditablePackages);
  const save = useServerFn(saveDurationPackage);
  const saveSetting = useServerFn(updateSetting);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['duration-package-editor'], queryFn: () => load(), enabled: canEdit });
  const [price, setPrice] = useState('');
  const [flat, setFlat] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const current = cfg?.bixMarket.priceUsd ?? 0;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['bix-public-packages'] }),qc.invalidateQueries({ queryKey: ['duration-package-editor'] }), qc.invalidateQueries({ queryKey: ['bix-public-config'] }), qc.invalidateQueries({ queryKey: ['bix-home-market'] })]);

  async function applyAll(make: (apys: Record<string, number>) => Record<string, number>, label: string) {
    if (!q.data) return; setBusy(true); setMsg('');
    try { for (const p of q.data) await save({ data: { id: p.id, price: Number(p.price_usd), apys: make(p.duration_apys), enabled: p.enabled } }); await refresh(); setMsg(`${label} — ${q.data.length} packages updated. Active staking remains unchanged.`); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed to apply.'); } finally { setBusy(false); }
  }
  async function savePrice(v: number) {
    setBusy(true); setMsg('');
    try { await saveSetting({ data: { key: 'bix_market', value: { priceUsd: v } } }); await refresh(); setMsg(`BIX internal price set to $${v}.`); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save price.'); } finally { setBusy(false); }
  }

  return <div className="py-6">
    <div className="eyebrow">OWNER CONTROL</div>
    <h2 className="font-display mt-2 text-2xl font-bold">Daily yield control</h2>
    {!cfg ? <p className="mt-6">Loading…</p> : !canEdit ? <p className="mt-6 text-muted-foreground">Owner access only. <Link to="/" className="text-chart-3">Back to HOME</Link></p> : <>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      {market && cfg.isAdmin && <section className="mt-6 border-y border-border py-5">
        <h2 className="font-display text-xl font-bold">Internal BIX price</h2>
        <p className="mt-1 text-xs text-muted-foreground">Current reference: <b className="numeric text-chart-3">${number(current, { maximumFractionDigits: 6 })}</b> · presale price $0.50. Ledger reference only.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input aria-label="BIX price" className="form-input numeric max-w-[180px]" type="number" min="0.000001" step="0.000001" placeholder={String(current)} value={price === '' && current ? String(current) : price} onChange={e => setPrice(e.target.value)}/>
          <Button disabled={busy || !(Number(price || current) > 0)} onClick={() => savePrice(Number(price || current))}><Save size={16}/>Save</Button>
          <Button variant="outline" disabled={busy} onClick={() => savePrice(0.5)}>Match presale $0.50</Button>
        </div>
      </section>}
      <section className="mt-6 border-y border-border py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-xl font-bold">{q.data?.length ?? 'All'} paket · profit harian flat</h2><p className="mt-1 text-xs text-muted-foreground">Range 0.5%–1.2% per day. Active staking continues using previous rates. Projection, not a guarantee.</p></div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-3"><p className="text-xs font-bold">1 · Tangga durasi</p><p className="mt-1 text-[11px] text-muted-foreground">30H 0,5% · 60H 0,6% · 90H 0,8% · 180H 1,0% · 360H 1,2%</p><Button className="mt-2 w-full" variant="outline" disabled={busy || !q.data} onClick={() => applyAll(() => ladderApys(), 'Tangga durasi diterapkan')}><Sparkles size={16}/>Terapkan</Button></div>
          <div className="rounded-xl border border-border p-3"><p className="text-xs font-bold">2 · Flat sama rata</p><div className="mt-2 flex gap-2"><input aria-label="Flat daily profit" className="form-input numeric" type="number" min={DAILY_MIN} max={DAILY_MAX} step={DAILY_STEP} value={flat} onChange={e => setFlat(Number(e.target.value))} onBlur={() => setFlat(cleanDaily(flat))}/><span className="self-center text-xs">%/hari</span></div><Button className="mt-2 w-full" disabled={busy || !q.data} onClick={() => applyAll(() => flatApys(flat), `Flat ${cleanDaily(flat)}% diterapkan`)}>Apply to all</Button></div>
          <div className="rounded-xl border border-border p-3"><p className="text-xs font-bold">3 · Geser sedikit</p><p className="mt-1 text-[11px] text-muted-foreground">Adjust all packages up/down by 0.05%, staying within 0.5%–1.2%.</p><div className="mt-2 grid grid-cols-2 gap-2"><Button variant="outline" disabled={busy || !q.data} onClick={() => applyAll(a => shiftApys(a, -DAILY_STEP), 'Turun 0,05%')}><Minus size={16}/>0,05%</Button><Button variant="outline" disabled={busy || !q.data} onClick={() => applyAll(a => shiftApys(a, DAILY_STEP), 'Naik 0,05%')}><Plus size={16}/>0,05%</Button></div></div>
        </div>
        {q.isPending ? <p className="mt-4">Loading packages…</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-2 text-left">Paket</th>{PACKAGE_DURATIONS.map(d => <th key={d} className="p-2">{d} hari</th>)}</tr></thead>
          <tbody>{(q.data ?? []).map(p => <tr key={p.id} className="border-t border-border"><td className="p-2 font-bold">{p.id} <span className="text-xs text-muted-foreground">${number(Number(p.price_usd))}</span></td>{PACKAGE_DURATIONS.map(d => <td key={d} className="numeric p-2 text-center text-xs"><b className="text-chart-2">{apyToDaily(p.duration_apys[String(d)] ?? 0)}%</b></td>)}</tr>)}</tbody></table></div>}
        <p className="mt-3 text-xs text-muted-foreground">Modify a specific package in the "Edit package" tab.</p>
      </section>
    </>}
  </div>;
}
