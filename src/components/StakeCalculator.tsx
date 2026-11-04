import { useMemo, useState } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, type Package } from '@/lib/bixlink';

/** Picks the largest open package whose price fits the chosen amount. */
export function fitPackage(packages: Package[], amount: number): Package | null {
  const open = packages.filter(p => p.enabled !== false && !p.retired).sort((a, b) => a.price_usd - b.price_usd);
  let pick: Package | null = null;
  for (const p of open) if (p.price_usd <= amount) pick = p;
  return pick ?? open[0] ?? null;
}

export function StakeCalculator({ packages, onPick }: { packages: Package[]; onPick: (p: Package) => void }) {
  const prices = useMemo(() => [...new Set(packages.filter(p => p.enabled !== false && !p.retired).map(p => p.price_usd))].sort((a, b) => a - b), [packages]);
  const [idx, setIdx] = useState(Math.min(2, Math.max(0, prices.length - 1)));
  if (!prices.length) return null;
  const amount = prices[Math.min(idx, prices.length - 1)] ?? 0;
  const pkg = fitPackage(packages, amount);
  const daily = pkg ? (pkg.price_usd * pkg.apy) / 100 / 365 : 0;
  return <section aria-label="Kalkulator simulasi" className="stake-calc auric-card mb-5 rounded-2xl border p-4">
    <div className="flex items-center justify-between gap-2"><span className="eyebrow flex items-center gap-1"><Calculator size={12}/> SIMULASI INSTAN</span>{pkg && <span className="stake-lux-chip">{pkg.id}</span>}</div>
    <div className="mt-2 flex items-end justify-between gap-2"><b className="numeric font-display text-3xl font-black text-chart-3">{money(amount, { maximumFractionDigits: 0 })}</b><span className="text-[11px] text-muted-foreground">{pkg?.lock_days ?? 0} hari · {pkg?.apy ?? 0}%/thn</span></div>
    <input type="range" aria-label="Pilih nominal" className="stake-calc-range mt-3 w-full" min={0} max={prices.length - 1} step={1} value={Math.min(idx, prices.length - 1)} onChange={e => setIdx(Number(e.target.value))}/>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">{[['Per hari', daily], ['Per 30 hari', daily * 30], [`${pkg?.lock_days ?? 0} hari`, daily * (pkg?.lock_days ?? 0)]].map(([l, v]) => <div key={l as string} className="rounded-xl border border-border bg-card/60 p-2"><span className="block text-[10px] text-muted-foreground">{l}</span><b className="numeric text-sm text-chart-2">{money(v as number)}</b></div>)}</div>
    <p className="mt-2 text-[10px] text-muted-foreground">Proyeksi saja, bukan jaminan hasil. Imbal hasil mengikuti aturan paket.</p>
    {pkg && <Button className="mt-3 w-full rounded-full" onClick={() => onPick(pkg)}><Sparkles size={15}/> Aktifkan {pkg.id}</Button>}
  </section>;
}
