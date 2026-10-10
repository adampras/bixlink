import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Sparkles } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { getEditablePackages, saveDurationPackage } from '@/lib/packages.functions';
import { updateSetting } from '@/lib/bixlink.functions';
import { usePublicConfig } from '@/lib/useMember';
import { PACKAGE_DURATIONS } from '@/lib/package-options';
import { standardApys } from '@/lib/yield-preset';
import { number } from '@/lib/bixlink';

export const Route = createFileRoute('/yield-control')({
  head: () => ({ meta: [{ title: 'Yield & Market Control — BIXLINK' }, { name: 'description', content: 'Owner control for staking daily profit and the internal BIX price.' }, { property: 'og:title', content: 'Yield & Market Control — BIXLINK' }, { property: 'og:description', content: 'Owner control for staking profit and BIX reference price.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: YieldControl,
});

function YieldControl() {
  const { data: cfg } = usePublicConfig();
  const load = useServerFn(getEditablePackages);
  const save = useServerFn(saveDurationPackage);
  const saveSetting = useServerFn(updateSetting);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['duration-package-editor'], queryFn: () => load(), enabled: !!cfg?.isAdmin });
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const current = cfg?.bixMarket.priceUsd ?? 0;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['duration-package-editor'] }), qc.invalidateQueries({ queryKey: ['bix-public-config'] }), qc.invalidateQueries({ queryKey: ['bix-home-market'] })]);

  async function applyStandard() {
    if (!q.data) return; setBusy(true); setMsg('');
    try { for (const [i, p] of q.data.entries()) await save({ data: { id: p.id, price: Number(p.price_usd), apys: standardApys(i), enabled: p.enabled } }); await refresh(); setMsg('Standard 0.5%–1% daily profit applied to all 8 packages (new stakes only).'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not apply.'); } finally { setBusy(false); }
  }
  async function savePrice(v: number) {
    setBusy(true); setMsg('');
    try { await saveSetting({ data: { key: 'bix_market', value: { priceUsd: v } } }); await refresh(); setMsg(`BIX internal price set to $${v}.`); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save price.'); } finally { setBusy(false); }
  }

  return <BixShell><main className="mx-auto max-w-6xl px-5 py-8 pb-28">
    <div className="eyebrow">OWNER CONTROL</div>
    <h1 className="section-title !text-3xl">YIELD &amp; MARKET</h1>
    {!cfg ? <p className="mt-6">Loading…</p> : !cfg.isAdmin ? <p className="mt-6 text-muted-foreground">Owner access only. <Link to="/" className="text-chart-3">Back to HOME</Link></p> : <>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      <section className="auric-card mt-6 p-5">
        <h2 className="font-display text-xl font-bold">Internal BIX price</h2>
        <p className="mt-1 text-xs text-muted-foreground">Current reference: <b className="numeric text-chart-3">${number(current, { maximumFractionDigits: 6 })}</b> · presale price $0.10. Ledger reference only.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input aria-label="BIX price" className="form-input numeric max-w-[180px]" type="number" min="0.000001" step="0.000001" placeholder={String(current)} value={price} onChange={e => setPrice(e.target.value)}/>
          <Button disabled={busy || !(Number(price) > 0)} onClick={() => savePrice(Number(price))}><Save size={16}/>Save</Button>
          <Button variant="outline" disabled={busy} onClick={() => savePrice(0.1)}>Match presale $0.10</Button>
        </div>
      </section>
      <section className="auric-card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-xl font-bold">8 staking packages · daily profit</h2><p className="mt-1 text-xs text-muted-foreground">Projection rates; running stakes keep their original terms.</p></div>
          <Button disabled={busy || !q.data} onClick={applyStandard}><Sparkles size={16}/>{busy ? 'Applying…' : 'Apply standard 0.5%–1%'}</Button>
        </div>
        {q.isPending ? <p className="mt-4">Loading packages…</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="p-2 text-left">Package</th>{PACKAGE_DURATIONS.map(d => <th key={d} className="p-2">{d}D now → standard</th>)}</tr></thead>
          <tbody>{(q.data ?? []).map((p, i) => { const std = standardApys(i); return <tr key={p.id} className="border-t border-border"><td className="p-2 font-bold">{p.id} <span className="text-xs text-muted-foreground">${number(Number(p.price_usd))}</span></td>{PACKAGE_DURATIONS.map(d => <td key={d} className="numeric p-2 text-center text-xs">{number((p.duration_apys[String(d)] ?? 0) / 365, { maximumFractionDigits: 2 })}% → <b className="text-chart-2">{number((std[String(d)] ?? 0) / 365, { maximumFractionDigits: 2 })}%</b></td>)}</tr>; })}</tbody></table></div>}
        <p className="mt-3 text-xs text-muted-foreground">Fine-tune any single package in Admin → Packages.</p>
      </section>
    </>}
  </main></BixShell>;
}
