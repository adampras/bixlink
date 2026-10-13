import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Shuffle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEditablePackages, saveDurationPackage } from '@/lib/packages.functions';
import { updateSetting } from '@/lib/bixlink.functions';
import { useMember, usePublicConfig, useReviewerAccess } from '@/lib/useMember';
import { PACKAGE_DURATIONS } from '@/lib/package-options';
import { fluctuatedApys, standardApys } from '@/lib/yield-preset';
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const current = cfg?.bixMarket.priceUsd ?? 0;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['bix-public-packages'] }),qc.invalidateQueries({ queryKey: ['duration-package-editor'] }), qc.invalidateQueries({ queryKey: ['bix-public-config'] }), qc.invalidateQueries({ queryKey: ['bix-home-market'] })]);

  async function applyStandard() {
    if (!q.data) return; setBusy(true); setMsg('');
    try { for (const [i, p] of q.data.entries()) await save({ data: { id: p.id, price: Number(p.price_usd), apys: standardApys(i, q.data.length), enabled: p.enabled } }); await refresh(); setMsg(`Standard rates saved for ${q.data.length} packages. Existing stakes unchanged.`); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not apply.'); } finally { setBusy(false); }
  }
  async function applyDaily() {
    if (!q.data) return; setBusy(true); setMsg('');
    const day = new Date().toISOString().slice(0, 10);
    try { for (const [i, p] of q.data.entries()) await save({ data: { id: p.id, price: Number(p.price_usd), apys: fluctuatedApys(i, day, q.data.length), enabled: p.enabled } }); await refresh(); setMsg(`Profit harian ${day} diperbarui untuk ${q.data.length} paket (0.50%–0.98%, hanya stake baru).`); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not apply.'); } finally { setBusy(false); }
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
          <div><h2 className="font-display text-xl font-bold">{q.data?.length ?? 'All'} staking packages · daily profit</h2><p className="mt-1 text-xs text-muted-foreground">Daily reference rates · 0.50%–0.98%. Running stakes keep their original terms. No guaranteed profit.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !q.data} onClick={applyStandard}><Sparkles size={16}/>Standard</Button>
            <Button disabled={busy || !q.data} onClick={applyDaily}><Shuffle size={16}/>{busy ? 'Applying…' : 'Update daily profit · all packages'}</Button>
          </div>
        </div>
        {q.isPending ? <p className="mt-4">Loading packages…</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-2 text-left">Package</th>{PACKAGE_DURATIONS.map(d => <th key={d} className="p-2">{d}D now → standard</th>)}</tr></thead>
          <tbody>{(q.data ?? []).map((p, i) => { const std = standardApys(i, q.data?.length ?? 8); return <tr key={p.id} className="border-t border-border"><td className="p-2 font-bold">{p.id} <span className="text-xs text-muted-foreground">${number(Number(p.price_usd))}</span></td>{PACKAGE_DURATIONS.map(d => <td key={d} className="numeric p-2 text-center text-xs">{number((p.duration_apys[String(d)] ?? 0) / 365, { maximumFractionDigits: 2 })}% → <b className="text-chart-2">{number((std[String(d)] ?? 0) / 365, { maximumFractionDigits: 2 })}%</b></td>)}</tr>; })}</tbody></table></div>}
        <p className="mt-3 text-xs text-muted-foreground">Fine-tune any single package in Admin → Packages.</p>
      </section>
    </>}
  </div>;
}
