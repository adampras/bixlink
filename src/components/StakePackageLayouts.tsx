import { useState, type PointerEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DurationPackageCard } from '@/components/DurationPackageCard';
import { InstitutionalPackageTable } from '@/components/InstitutionalStake';
import { number, type Package } from '@/lib/bixlink';

export const STAKE_LAYOUTS = ['quantum3d', 'matrix', 'auric', 'capsule', 'carousel', 'spotlight', 'accordion'] as const;
export type StakeLayout = (typeof STAKE_LAYOUTS)[number];
export const STAKE_LAYOUT_LABEL: Record<StakeLayout, string> = { quantum3d: 'G · 3D Quantum Vault', matrix: 'F · Sovereign Ingot Matrix (emerald-gold)', auric: 'E · Kotak batangan emas (Auric Sovereign)', capsule: 'D · Kotak kapsul mewah', carousel: 'C · Carousel halaman', spotlight: 'A · Spotlight', accordion: 'B · Baris accordion' };

function QuantumVault({ packages, onStake }: { packages: Package[]; onStake: (p: Package) => void }) {
  const [active, setActive] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const i = Math.min(active, packages.length - 1);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -14, y: ((e.clientX - r.left) / r.width - 0.5) * 18 });
  };
  const go = (d: number) => setActive((i + d + packages.length) % packages.length);
  return <section aria-label="Staking packages" className="qv mt-6">
    <header className="qv-head"><span>QUANTUM VAULT · 3D</span><b>Select your tier</b></header>
    <div className="qv-stage">
      {packages.map((p, n) => {
        const off = n - i;
        if (Math.abs(off) > 2) return null;
        return <button key={p.id} type="button" aria-label={`Tier ${n + 1} ${short(Number(p.price_usd))}`} aria-current={off === 0} onClick={() => setActive(n)} className="qv-slab" style={{ transform: `translateX(${off * 58}%) translateZ(${-Math.abs(off) * 160}px) rotateY(${off * -32}deg)`, zIndex: 10 - Math.abs(off), opacity: 1 - Math.abs(off) * 0.3 }}>
          <small>STK-{String(n + 1).padStart(3, '0')}</small><b className="numeric">{short(Number(p.price_usd))}</b><em className="numeric">{p.apy}% APY</em>
        </button>;
      })}
    </div>
    <div className="qv-nav">
      <Button variant="outline" size="icon" aria-label="Previous tier" onClick={() => go(-1)}><ChevronLeft /></Button>
      <span className="numeric">{i + 1} / {packages.length}</span>
      <Button variant="outline" size="icon" aria-label="Next tier" onClick={() => go(1)}><ChevronRight /></Button>
    </div>
    <div className="qv-tilt mx-auto mt-4 max-w-md" onPointerMove={move} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className="qv-tilt-inner" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <DurationPackageCard key={packages[i]!.id} pkg={packages[i]!} index={i} onStake={onStake} />
      </div>
    </div>
    <p className="qv-note">Yield figures are display-only ledger projections, not guaranteed returns.</p>
  </section>;
}

type Props = { packages: Package[]; layout?: string | undefined; onStake: (p: Package) => void };

const short = (v: number) => v >= 1000 ? `$${number(v / 1000, { maximumFractionDigits: 1 })}K` : `$${number(v, { maximumFractionDigits: 0 })}`;

export function StakePackageLayouts({ packages, layout, onStake }: Props) {
  const mode: StakeLayout = (STAKE_LAYOUTS as readonly string[]).includes(layout ?? '') ? (layout as StakeLayout) : 'auric';
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  if (!packages.length) return null;
  if (layout === 'institutional') return <InstitutionalPackageTable packages={packages} onStake={onStake} />;
  if (mode === 'quantum3d') return <QuantumVault packages={packages} onStake={onStake} />;

  if (mode === 'auric') {
    const i = Math.min(active, packages.length - 1);
    const go = (n: number) => { setActive(n); document.getElementById(`auric-pkg-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    return <section aria-label="Staking packages" className="auric-stake mt-6">
      <div className="auric-terminal">
        <p className="auric-terminal-title">BIXLINK SOVEREIGN VAULT · STAKING TERMINAL</p>
      </div>
      <div role="tablist" aria-label="Package tier" className="auric-grid">
        {packages.map((p, n) => <Button variant="outline" key={p.id} role="tab" aria-selected={n === i} onClick={() => go(n)} className="auric-bar"><i aria-hidden /><span>T{String(n + 1).padStart(2, '0')}</span><b className="numeric">{short(Number(p.price_usd))}</b></Button>)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {packages.map((p, n) => <div key={p.id} id={`auric-pkg-${n}`} className={`auric-card ${n === i ? 'is-active' : ''}`}><DurationPackageCard pkg={p} index={n} onStake={onStake} /></div>)}
      </div>
    </section>;
  }

  if (mode === 'matrix') {
    const i = Math.min(active, packages.length - 1);
    return <section aria-label="Staking packages" className="ingot-matrix mt-6">
      <header className="ingot-matrix__head"><span>SOVEREIGN VAULT</span><b>Select your tier</b></header>
      <div role="tablist" aria-label="Package tier" className="ingot-matrix__grid">
        {packages.map((p, n) => <button key={p.id} type="button" role="tab" aria-selected={n === i} onClick={() => setActive(n)} className="ingot"><small>TIER {String(n + 1).padStart(2, '0')}</small><b className="numeric">{short(Number(p.price_usd))}</b><em className="numeric">{p.apy}% APY</em></button>)}
      </div>
      <div className="mx-auto mt-4 max-w-md ingot-matrix__detail">
        <DurationPackageCard key={packages[i]!.id} pkg={packages[i]!} index={i} onStake={onStake} />
      </div>
    </section>;
  }

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
