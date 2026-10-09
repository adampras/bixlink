import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getEditablePackages, saveDurationPackage } from '@/lib/packages.functions';
import { PACKAGE_DURATIONS } from '@/lib/package-options';
import { txFeedback } from '@/components/TxFeedback';

type Row = Awaited<ReturnType<typeof getEditablePackages>>[number];
function Editor({ pkg, index, onSave }: { pkg: Row; index: number; onSave: (m: string) => void }) {
  const [price, setPrice] = useState(Number(pkg.price_usd));
  const [apys, setApys] = useState(pkg.duration_apys);
  const [enabled, setEnabled] = useState(pkg.enabled);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveDurationPackage);
  const qc = useQueryClient();
  return <form className={`duration-package tier-tone-${index % 8}`} onSubmit={async e => {
    e.preventDefault(); setBusy(true);
    try {
      await save({ data: { id: pkg.id, price, apys, enabled } });
      await Promise.all([qc.invalidateQueries({ queryKey: ['duration-package-editor'] }), qc.invalidateQueries({ queryKey: ['bix-public-config'] })]);
      onSave(`${pkg.id} saved — ${enabled ? 'OPEN' : 'CLOSED'}.`); txFeedback.success('Package saved', `${pkg.id} duration APYs updated.`);
    } catch (error) { onSave(error instanceof Error ? error.message : 'Could not save package.'); txFeedback.fail('Package save failed', error); }
    finally { setBusy(false); }
  }}>
    <header className="duration-package-head"><h3 className="text-xl font-bold">{pkg.id}</h3><label className="flex items-center gap-2 text-xs font-bold"><Switch aria-label={`${pkg.id} availability`} checked={enabled} onCheckedChange={setEnabled} disabled={busy}/>{enabled ? 'OPEN' : 'CLOSED'}</label></header>
    <div className="duration-package-body space-y-4">
      <label className="block text-xs font-bold">Package amount (USDT)<input aria-label={`${pkg.id} amount`} className="form-input mt-2" type="number" required min="0.01" max="10000000" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))}/></label>
      <div className="grid grid-cols-2 gap-3">{PACKAGE_DURATIONS.map(d => <label key={d} className="text-xs font-bold">{d}D · monthly APY %<input aria-label={`${pkg.id} ${d}D monthly APY`} className="form-input mt-1" type="number" min="0" max="30" step="0.01" required value={Math.round((apys[String(d)] ?? 0) / 12 * 10000) / 10000} onChange={e => setApys(current => ({ ...current, [String(d)]: Math.round(Number(e.target.value) * 12 * 10000) / 10000 }))}/></label>)}</div>
      <Button className="duration-stake w-full" type="submit" disabled={busy}><Save size={16}/>{busy ? 'Saving…' : 'Save package'}</Button>
    </div>
  </form>;
}
export function AdminDurationPackages({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getEditablePackages);
  const query = useQuery({ queryKey: ['duration-package-editor'], queryFn: () => load() });
  return <section className="mt-8"><h2 className="font-display text-2xl font-bold">Staking packages</h2><p className="mt-2 text-sm text-muted-foreground">Enter monthly APY per duration (0–30% per month). Members also see the daily rate when they pick a period. Separate from BIX Booster APY. Members see the monthly rate. Changes apply to new stakes only.</p>
    {query.isPending ? <p className="mt-6">Loading packages…</p> : query.isError ? <div role="alert" className="mt-6 text-destructive">Could not load packages.<Button variant="outline" className="ml-3" onClick={() => query.refetch()}>Retry</Button></div> : <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{query.data.map((pkg, i) => <Editor key={`${pkg.id}:${JSON.stringify(pkg.duration_apys)}:${pkg.enabled}:${pkg.price_usd}`} pkg={pkg} index={i} onSave={onMessage}/>)}</div>}
  </section>;
}