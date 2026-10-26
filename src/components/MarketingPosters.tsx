import { HUB_IMAGES } from '@/components/HighlightsHub';

type Poster = { no: string; image: keyof typeof HUB_IMAGES; title: string; body: string; badges: string[] };
const POSTERS: Poster[] = [
  { no: '01', image: 'launch', title: 'Genesis Presale & Smart Allocation', body: 'Fixed 21,000,000 BIX supply with a $0.50 / BIX presale entry and a 3,150,000 BIX pool cap. Every purchase stores its allocation and release terms at the moment of purchase.', badges: ['21M supply', '$0.50 / BIX', 'Tiered max cap'] },
  { no: '02', image: 'stake', title: 'Non-Custodial Staking & Booster APY', body: 'Hybrid USDT and BIX staking contracts with selectable durations. Daily yield is a transparent projection, not a spendable balance, and Booster dividends settle in BIX.', badges: ['Non-custodial', 'Selectable tenor', 'Booster in BIX'] },
  { no: '03', image: 'p2p', title: 'Internal Market & BIX PAY', body: 'Member-to-member P2P trading inside the internal ledger with no fee, a Dev Buyback window locked at $0.25 / BIX, and instant BIX PAY transfers between members.', badges: ['Buyback $0.25', 'P2P 0% fee', 'BIX PAY instant'] },
  { no: '04', image: 'arena', title: 'Fox Arena & Welcome Bonus', body: 'Every verified new member receives 100 BIXP automatically. Social and daily missions are claimed once through server-verified rewards within the promotional budget.', badges: ['100 BIXP welcome', 'Daily missions', 'Verified claims'] },
  { no: '05', image: 'launch', title: 'BIX Studio — Creative Suite', body: 'Leaders create official posters, event banners, presentations and media for their team using Studio Credits, kept separate from BIX, BIXP and USDT.', badges: ['Poster & banner', 'Studio Credit', 'Team promotion'] },
  { no: '06', image: 'nft', title: 'NFT Certificates & Official Store', body: 'Each stake can carry an in-app NFT certificate, including the $7,000 PLATINUM emerald-gold pass. Official merchandise is ordered directly with the seller.', badges: ['PLATINUM $7K', 'Official store', 'Direct order'] },
];

export function MarketingPosters() {
  return <section aria-label="Marketing posters" className="mt-8 grid gap-4 sm:grid-cols-2">
    {POSTERS.map(p => <article key={p.no} className="overflow-hidden rounded-2xl border border-chart-3/40 bg-card shadow-lg">
      <div className="relative aspect-[16/9]"><img src={HUB_IMAGES[p.image]} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover"/><span className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent"/><span className="numeric absolute left-3 top-3 rounded-full border border-chart-3/60 bg-background/70 px-2 py-0.5 text-[10px] font-bold text-chart-3">POSTER {p.no}</span></div>
      <div className="p-4"><h2 className="font-display text-base font-bold text-chart-3">{p.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{p.body}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{p.badges.map(b => <span key={b} className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-semibold">{b}</span>)}</div></div>
    </article>)}
  </section>;
}
