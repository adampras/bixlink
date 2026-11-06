import { useState } from 'react';
import { ArrowUpRight, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number, type Package } from '@/lib/bixlink';
import { initialDuration, packageApy, PACKAGE_DURATIONS } from '@/lib/package-options';
import { dailyRate } from '@/lib/nft';
import { VaultFacilityDialog, VIP_PASS_THRESHOLD } from '@/components/VaultFacility';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMember } from '@/lib/useMember';

export function DurationPackageCard({ pkg, index, onStake }: { pkg: Package; index: number; onStake: (p: Package) => void }) {
  const { user } = useMember();
  const lock = useQuery({ queryKey: ['requires-360', user?.id], enabled: !!user, staleTime: 60_000, queryFn: async () => Boolean((await supabase.rpc('bix_requires_360', { p_user: user!.id })).data) });
  const [pickedDays, setDays] = useState(initialDuration(pkg));
  const days = lock.data ? 360 : pickedDays;
  const [popup, setPopup] = useState(false);
  const apy = packageApy(pkg, days);
  const price = Number(pkg.price_usd);
  const perDay = price * dailyRate(apy) / 100;
  return <article className={`duration-package tier-tone-${index % 8}`} aria-label={`${pkg.id} package`}>
    <header className="duration-package-head">
      <div><p className="text-xs font-bold">Tier {String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 text-2xl font-bold">{pkg.id}</h3></div>
      <strong className="duration-price">{number(price, { maximumFractionDigits: 2 })} USDT</strong>
    </header>
    <div className="duration-package-body">
      <p className="duration-label">Choose duration</p>
      <div className="duration-options" role="group" aria-label={`${pkg.id} duration`}>
        {PACKAGE_DURATIONS.map(d => <Button key={d} variant="outline" aria-pressed={days === d} disabled={!!lock.data && d !== 360} className="duration-option" onClick={() => setDays(d)}>{d}D</Button>)}
      </div>
      {lock.data && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-chart-3">360 Days Mandatory Lock · Leader / Loan account</p>}
      <dl className="duration-yield"><div><dt>Daily profit · flat</dt><dd className="numeric">{number(dailyRate(apy), { maximumFractionDigits: 2 })}% / day · ${number(perDay, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</dd></div><div><dt>Profit · {days} days</dt><dd className="numeric">${number(perDay * days, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</dd></div></dl>
      <div className="lux-ledger" aria-label="Projected settlement">
        <div className="lux-ledger-daily"><span>Daily profit</span><b className="numeric">${number(perDay, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} / day</b></div>
        <div><span>Principal</span><b className="numeric">${number(price, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</b></div>
        <i aria-hidden>+</i>
        <div><span>Profit</span><b className="numeric">${number(perDay * days, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</b></div>
        <i aria-hidden>=</i>
        <div className="lux-ledger-total"><span>Total received</span><b className="numeric">${number(price + perDay * days, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</b></div>
      </div>
      <div className="lux-horizon" aria-hidden><span>Day 0</span><em/><span>Day {days} · principal return</span></div>
      <Button variant="outline" className="mt-3 w-full justify-start gap-2 text-xs" onClick={() => setPopup(true)} aria-label="Open Vault Bond Deed and VIP Pass"><ScrollText size={15} className="text-chart-3"/><span className="text-left"><b className="block text-chart-3">Vault Bond Deed{price >= VIP_PASS_THRESHOLD ? ' + Titanium VIP Pass' : ''}</b><span className="text-muted-foreground">{price >= VIP_PASS_THRESHOLD ? 'Both facilities included' : `VIP Pass unlocks at $${VIP_PASS_THRESHOLD} active staking`}</span></span></Button>
      <div className="duration-package-action"><Button className="duration-stake" onClick={() => { setPopup(false); onStake({ ...pkg, lock_days: days, apy }); }}>Stake now <ArrowUpRight size={18}/></Button><p className="duration-risk">{days}D lock · APY snapshot · Projection, not guaranteed.</p></div>
    </div>
    {popup && <VaultFacilityDialog principal={price} days={days} apy={apy} label={pkg.id} onClose={() => setPopup(false)}/>}
  </article>;
}
