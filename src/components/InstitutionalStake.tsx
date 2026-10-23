import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, number, type Package } from '@/lib/bixlink';

/** Institutional summary strip — display-only projections from active contract snapshots. */
export function InstitutionalStakeHeader({ active, principal, live, perDay }: { active: number; principal: number; live: number; perDay: number }) {
  const cell = (label: string, value: string, tone = '') => <div className="min-w-0 border-l border-chart-3/30 px-3 py-2"><dt className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt><dd className={`numeric mt-1 truncate font-display text-sm font-bold sm:text-lg ${tone}`}>{value}</dd></div>;
  return <section aria-label="Institutional staking overview" className="mt-5 rounded-2xl border border-chart-3/40 bg-card/70 p-4 backdrop-blur-xl">
    <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-chart-3">Sovereign Institutional Desk</p><span className="inline-flex items-center gap-1 text-[10px] text-chart-2"><ShieldCheck size={12}/>Non-custodial</span></div>
    <dl className="mt-3 grid grid-cols-2 gap-y-2 sm:grid-cols-4">
      {cell('Kontrak aktif', String(active))}
      {cell('Principal', money(principal), 'text-chart-3')}
      {cell('Profit berjalan · proyeksi', `$${live.toFixed(4)}`, 'text-chart-2')}
      {cell('Rate harian · proyeksi', `$${perDay.toFixed(2)}`)}
    </dl>
    <p className="mt-3 text-[10px] text-muted-foreground">Semua angka profit adalah proyeksi dari snapshot kontrak, bukan saldo yang dapat dibelanjakan. Nilai aset kripto dapat berubah dan berisiko.</p>
  </section>;
}

/** Institutional package table: tier, value, duration, rate, action. */
export function InstitutionalPackageTable({ packages, onStake }: { packages: Package[]; onStake: (p: Package) => void }) {
  return <section aria-label="Staking packages" className="mt-5 overflow-hidden rounded-2xl border border-border bg-card/60">
    <div className="grid grid-cols-[2.2rem_1fr_auto] gap-2 border-b border-border px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:grid-cols-[3rem_1fr_6rem_6rem_7rem]"><span>Tier</span><span>Nilai</span><span className="hidden sm:block">Durasi</span><span className="hidden sm:block">Rate</span><span className="text-right">Aksi</span></div>
    {packages.map((p, n) => <div key={p.id} className="grid grid-cols-[2.2rem_1fr_auto] items-center gap-2 border-b border-border/60 px-3 py-3 last:border-0 sm:grid-cols-[3rem_1fr_6rem_6rem_7rem]">
      <span className="numeric text-xs font-bold text-chart-3">T{String(n + 1).padStart(2, '0')}</span>
      <div className="min-w-0"><b className="numeric block">{money(Number(p.price_usd))}</b><span className="numeric text-[11px] text-muted-foreground sm:hidden">{p.lock_days} hari · {number(Number(p.apy) / 12, { maximumFractionDigits: 2 })}%/bln</span></div>
      <span className="numeric hidden text-sm sm:block">{p.lock_days} hari</span>
      <span className="numeric hidden text-sm text-chart-2 sm:block">{number(Number(p.apy) / 12, { maximumFractionDigits: 2 })}%/bln</span>
      <Button size="sm" className="justify-self-end rounded-full" onClick={() => onStake(p)}>Stake</Button>
    </div>)}
  </section>;
}
