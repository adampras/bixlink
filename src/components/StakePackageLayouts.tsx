import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DurationPackageCard } from '@/components/DurationPackageCard';
import { number, type Package } from '@/lib/bixlink';

export const STAKE_LAYOUTS = ['capsule', 'carousel', 'spotlight', 'accordion'] as const;
export type StakeLayout = (typeof STAKE_LAYOUTS)[number];
export const STAKE_LAYOUT_LABEL: Record<StakeLayout, string> = { capsule: 'D · Kotak kapsul mewah', carousel: 'C · Carousel halaman', spotlight: 'A · Spotlight', accordion: 'B · Baris accordion' };

type Props = { packages: Package[]; layout?: string | undefined; onStake: (p: Package) => void };

const short = (v: number) => v >= 1000 ? `$${number(v / 1000, { maximumFractionDigits: 1 })}K` : `$${number(v, { maximumFractionDigits: 0 })}`;

export function StakePackageLayouts({ packages, layout, onStake }: Props) {
  const mode: StakeLayout = (STAKE_LAYOUTS as readonly string[]).includes(layout ?? '') ? (layout as StakeLayout) : 'carousel';
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  if (!packages.length) return null;

  if (mode === 'capsule') {
    const i = Math.min(active, packages.length - 1);
    return <section aria-label="Staking packages" className="mt-6">
      <div role="tablist" aria-label="Package tier" className="stake-capsules">
        {packages.map((p, n) => <button key={p.id} type="button" role="tab" aria-selected={n === i} onClick={() => setActive(n)} className="stake-capsule"><span>T{String(n + 1).padStart(2, '0')}</span><b className="numeric">{short(Number(p.price_usd))}</b></button>)}
      </div>
      <div className="mx-auto mt-4 max-w-md">
        <DurationPackageCard key={packages[i]!.id} pkg={packages[i]!} index={i} onStake={onStake} />
      </div>
    </section>;
  }

  if (mode === 'spotlight') {
    const i = Math.min(active, packages.length - 1);
    return <section aria-label="Staking packages" className="mt-6">
      <div role="tablist" aria-label="Package tier" className="stake-pills">
        {packages.map((p, n) => <button key={p.id} type="button" role="tab" aria-selected={n === i} onClick={() => setActive(n)} className="stake-pill"><span>T{String(n + 1).padStart(2, '0')}</span><b className="numeric">${number(Number(p.price_usd), { maximumFractionDigits: 0 })}</b></button>)}
      </div>
      <div className="mx-auto mt-4 max-w-md">
        <DurationPackageCard key={packages[i]!.id} pkg={packages[i]!} index={i} onStake={onStake} />
      </div>
      <Pager page={i} total={packages.length} onPage={setActive} />
    </section>;
  }

  if (mode === 'accordion') {
    return <section aria-label="Staking packages" className="mt-6 space-y-2">
      {packages.map((p, n) => {
        const isOpen = open === n;
        return <div key={p.id} className="stake-row">
          <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : n)} className="stake-row-head">
            <span className="numeric text-[10px] font-bold text-muted-foreground">T{String(n + 1).padStart(2, '0')}</span>
            <b className="min-w-0 flex-1 truncate text-left text-sm">{p.id}</b>
            <span className="numeric text-sm font-bold text-chart-3">${number(Number(p.price_usd), { maximumFractionDigits: 0 })}</span>
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && <div className="p-2"><DurationPackageCard pkg={p} index={n} onStake={onStake} /></div>}
        </div>;
      })}
    </section>;
  }

  const perPage = 2;
  const pages = Math.ceil(packages.length / perPage);
  const pg = Math.min(page, pages - 1);
  const slice = packages.slice(pg * perPage, pg * perPage + perPage);
  return <section aria-label="Staking packages" className="mt-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {slice.map((p, k) => <DurationPackageCard key={p.id} pkg={p} index={pg * perPage + k} onStake={onStake} />)}
    </div>
    <Pager page={pg} total={pages} onPage={setPage} />
  </section>;
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (n: number) => void }) {
  return <div className="mt-4 flex items-center justify-center gap-3">
    <Button variant="outline" size="icon" className="rounded-full" aria-label="Previous" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft /></Button>
    <div className="flex gap-1.5">{Array.from({ length: total }, (_, n) => <button key={n} type="button" aria-label={`Page ${n + 1}`} aria-current={n === page} onClick={() => onPage(n)} className={`h-2 rounded-full transition-all ${n === page ? 'w-6 bg-chart-3' : 'w-2 bg-border'}`} />)}</div>
    <span className="numeric text-[11px] text-muted-foreground">{page + 1}/{total}</span>
    <Button variant="outline" size="icon" className="rounded-full" aria-label="Next" disabled={page >= total - 1} onClick={() => onPage(page + 1)}><ChevronRight /></Button>
  </div>;
}
