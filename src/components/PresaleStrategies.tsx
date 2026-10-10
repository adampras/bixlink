import { useState } from 'react';
import { Crown, Gem, Layers } from 'lucide-react';
import { number } from '@/lib/bixlink';
import { genesisTier, strategyQuote, type PresaleStrategy } from '@/lib/presale-strategy';
import type { PresalePackage } from '@/lib/presale';
import poster from '@/assets/presale-rocket-dark-poster.jpg.asset.json';
import video from '@/assets/presale-rocket-dark.mp4.asset.json';

const STRATS: { id: PresaleStrategy; name: string; tag: string; icon: typeof Layers; fit: string }[] = [
  { id: 'hybrid', name: 'Hybrid', tag: '50% USDT staking + 50% BIX', icon: Layers, fit: 'Daily USDT rotation' },
  { id: 'dividend', name: 'Dividend', tag: 'Full BIX + daily USDT dividend', icon: Gem, fit: 'Steady capital recovery' },
  { id: 'founder', name: 'Founder', tag: 'Full BIX + bonus BIX & perks', icon: Crown, fit: 'Long-term holders' },
];

export function PresaleStrategies({ packages }: { packages: PresalePackage[] }) {
  const [s, setS] = useState<PresaleStrategy>('hybrid');
  const [i, setI] = useState(0);
  const p = packages[i] ?? packages[0];
  if (!p) return null;
  const price = p.bix > 0 ? p.usd / p.bix : 0;
  const q = strategyQuote(s, p.usd, price, p.releaseDays);
  const tier = genesisTier(p.usd);
  const row = (k: string, v: string) => <div className="flex justify-between border-b border-border py-2 text-sm"><span className="text-muted-foreground">{k}</span><b className="numeric">{v}</b></div>;
  return <section className="mt-6 rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
    <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-black">Choose your strategy</h2><span className="rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold text-chart-3">PREVIEW</span></div>
    <div className="mt-3 grid grid-cols-3 gap-2">{STRATS.map(x => <button key={x.id} type="button" onClick={() => setS(x.id)} className={`rounded-xl border p-2 text-left transition ${s === x.id ? 'border-primary bg-primary/10' : 'border-border'}`}><x.icon size={16} className="text-primary"/><b className="mt-1 block text-xs">{x.name}</b><span className="block text-[10px] leading-tight text-muted-foreground">{x.fit}</span></button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{packages.map((pk, j) => <button key={pk.usd} type="button" onClick={() => setI(j)} className={`numeric rounded-full border px-3 py-1 text-xs ${j === i ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>${number(pk.usd)}</button>)}</div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <p className="text-xs text-primary">{STRATS.find(x => x.id === s)!.tag}</p>
        {row('BIX allocation', `${number(q.bix)} BIX`)}
        {s === 'hybrid' && row('USDT staking principal', `$${number(q.stakingUsd)}`)}
        {s === 'dividend' && row(`USDT dividend (0.2%/day · ${p.releaseDays}d)`, `$${number(q.dividendUsd, { maximumFractionDigits: 2 })}`)}
        {s === 'founder' && row(`Bonus BIX (20% APY · ${p.releaseDays}d)`, `+${number(q.bonusBix)} BIX`)}
        {row('Release', `${p.releaseDays} days`)}
        {row('Genesis NFT', tier)}
        {s === 'founder' && <p className="mt-2 text-xs text-muted-foreground">Founder perks: Auric Card whitelist priority and Founder badge.</p>}
      </div>
      <figure className="genesis-card relative overflow-hidden rounded-2xl border border-primary/40 bg-background">
        <video autoPlay muted loop playsInline preload="metadata" poster={poster.url} className="aspect-[4/3] w-full object-contain"><source src={video.url} type="video/mp4"/></video>
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-3">
          <span className="text-[10px] font-bold tracking-widest text-chart-3">GENESIS NODE · {s.toUpperCase()}</span>
          <b className="block font-display text-lg">{tier}</b>
          <span className="numeric text-xs text-muted-foreground">#GEN-•••• · ${number(p.usd)} · {number(q.bix + q.bonusBix)} BIX</span>
        </figcaption>
      </figure>
    </div>
    <p className="mt-3 text-[11px] text-muted-foreground">Strategy figures are a preview and are not yet credited. Purchases currently follow the standard presale terms below until the owner activates strategies. No guarantee of profit.</p>
  </section>;
}
