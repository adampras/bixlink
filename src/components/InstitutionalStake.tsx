import { Crown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { money, number, type Package } from '@/lib/bixlink';

const TIERS = ['Genesis', 'Prime', 'Vanguard', 'Sovereign', 'Regent', 'Imperial', 'Consortium', 'Apex', 'Paragon', 'Dynasty'];

/** Institutional summary — display-only projections from active contract snapshots. */
export function InstitutionalStakeHeader({ active, principal, live, perDay }: { active: number; principal: number; live: number; perDay: number }) {
  const cell = (label: string, node: React.ReactNode, tone = 'text-foreground') => <div className="vault-metric"><dt>{label}</dt><dd className={`numeric ${tone}`}>{node}</dd></div>;
  return <section aria-label="Institutional staking overview" className="vault-desk mt-5">
    <div className="flex items-center justify-between gap-2"><p className="vault-eyebrow">Sovereign Institutional Desk</p><span className="vault-badge"><ShieldCheck size={12}/>Non-custodial</span></div>
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cell('Active contracts', <AnimatedNumber value={active} digits={0}/>)}
      {cell('Principal', <>$<AnimatedNumber value={principal}/></>, 'text-chart-3')}
      {cell('Profit · projected', <>$<AnimatedNumber value={live} digits={4}/></>, 'text-chart-2')}
      {cell('Daily · projected', <>$<AnimatedNumber value={perDay}/></>)}
    </dl>
    <p className="mt-3 text-[10px] text-muted-foreground">All profit figures are projections from contract snapshots, not spendable balances. Crypto asset values are volatile and carry risk.</p>
  </section>;
}

/** Obsidian vault cards: tier badge, value, duration, rate, full-width action. */
export function InstitutionalPackageTable({ packages, onStake }: { packages: Package[]; onStake: (p: Package) => void }) {
  const top = packages.length - 1;
  return <section aria-label="Staking packages" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
    {packages.map((p, n) => <article key={p.id} className={`vault-card ${n === top ? 'is-flagship' : ''}`}>
      <div className="flex items-center justify-between gap-1"><span className="vault-tier">T{String(n + 1).padStart(2, '0')} · {TIERS[n % TIERS.length]}</span>{n === top && <Crown size={14} className="text-chart-3" aria-label="Flagship"/>}</div>
      <b className="numeric vault-value">{money(Number(p.price_usd), { maximumFractionDigits: 0, minimumFractionDigits: 0 })}</b>
      <dl className="vault-terms"><div><dt>Duration</dt><dd className="numeric">{p.lock_days} days</dd></div><div><dt>Rate</dt><dd className="numeric text-chart-2">{number(Number(p.apy) / 12, { maximumFractionDigits: 2 })}%/mo</dd></div></dl>
      <Button size="sm" className="mt-3 w-full rounded-full" onClick={() => onStake(p)}>Stake</Button>
    </article>)}
  </section>;
}
