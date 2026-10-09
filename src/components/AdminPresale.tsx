import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { getPresaleStatus, savePresale } from '@/lib/presale.functions';
import type { PresaleConfig } from '@/lib/presale';

export function AdminPresale({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getPresaleStatus); const save = useServerFn(savePresale);
  const [cfg, setCfg] = useState<PresaleConfig | null>(null); const [used, setUsed] = useState(0);
  useEffect(() => { load().then(s => { setCfg(s.config); setUsed(Number(s.poolUsed)); }).catch(e => onMessage(e.message)); }, []);
  if (!cfg) return <p className="mt-8 text-sm text-muted-foreground">Loading presale…</p>;
  const setPkg = (i: number, k: 'usd' | 'bix' | 'releaseDays', v: number) => setCfg({ ...cfg, packages: cfg.packages.map((p, j) => j === i ? { ...p, [k]: v } : p) });
  const num = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
  return <section className="mt-8 grid max-w-3xl gap-4">
    <h2 className="font-display text-xl font-black">PRESALE STAKING BIX</h2>
    <p className="text-xs text-muted-foreground">Separate from the 8 USDT packages and free mining. BIX is locked and released by mining over the duration you set. Pool comes from the Mining &amp; Staking Rewards allocation (max 10,500,000). Used: {used.toLocaleString()} BIX.</p>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })}/> Presale open</label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Sponsor % (direct referrer, max 10)<input type="number" className={num} value={cfg.sponsorPct} onChange={e => setCfg({ ...cfg, sponsorPct: Number(e.target.value) })}/></label>
      <label className="text-xs">Pool cap (BIX)<input type="number" className={num} value={cfg.poolCap} onChange={e => setCfg({ ...cfg, poolCap: Number(e.target.value) })}/></label>
    </div>
    {cfg.packages.map((p, i) => <div key={i} className="grid grid-cols-3 gap-2 rounded-lg border border-border p-3">
      <label className="text-xs">Package USDT<input type="number" className={num} value={p.usd} onChange={e => setPkg(i, 'usd', Number(e.target.value))}/></label>
      <label className="text-xs">BIX received<input type="number" className={num} value={p.bix} onChange={e => setPkg(i, 'bix', Number(e.target.value))}/></label>
      <label className="text-xs">Release days<input type="number" className={num} value={p.releaseDays} onChange={e => setPkg(i, 'releaseDays', Number(e.target.value))}/></label>
    </div>)}
    <Button className="w-fit" onClick={async () => { try { setCfg(await save({ data: cfg })); onMessage('Presale settings saved.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Save failed'); } }}>Save presale</Button>
  </section>;
}
