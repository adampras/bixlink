import { useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number, type Package } from '@/lib/bixlink';
import { initialDuration, packageApy, PACKAGE_DURATIONS } from '@/lib/package-options';
import { dailyRate, nftTier, nftSignature, NFT_ART, NFT_NAME } from '@/lib/nft';
import type { CSSProperties } from 'react';
import { NftCard } from '@/components/NftCard';
import { packageArtwork } from '@/lib/nft-catalog';
import { useNftCatalog } from '@/lib/useNftCatalog';
import { createPortal } from 'react-dom';
import { packageCard } from '@/lib/package-cards';
import { valueCard } from '@/lib/value-cards';

export function DurationPackageCard({ pkg, index, onStake }: { pkg: Package; index: number; onStake: (p: Package) => void }) {
  const [days, setDays] = useState(initialDuration(pkg));
  const [popup, setPopup] = useState(false);
  const apy = packageApy(pkg, days);
  const price = Number(pkg.price_usd);
  const perDay = price * dailyRate(apy) / 100;
  const tier = nftTier(price, days);
  const catalog = useNftCatalog();
  const art = packageArtwork(catalog.data ?? [], index, days, price);
  const card = valueCard(price) ?? packageCard(pkg.id, price);
  return <article className={`duration-package tier-tone-${index % 8}`} aria-label={`${pkg.id} package`}>
    <header className="duration-package-head">
      <div><p className="text-xs font-bold">Tier {String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 text-2xl font-bold">{pkg.id}</h3></div>
      <strong className="duration-price">{number(price, { maximumFractionDigits: 2 })} USDT</strong>
    </header>
    <div className="duration-package-body">
      <p className="duration-label">Choose duration</p>
      <div className="duration-options" role="group" aria-label={`${pkg.id} duration`}>
        {PACKAGE_DURATIONS.map(d => <Button key={d} variant="outline" aria-pressed={days === d} className="duration-option" onClick={() => setDays(d)}>{d}D</Button>)}
      </div>
      <dl className="duration-yield"><div><dt>Daily projection</dt><dd className="numeric">{number(dailyRate(apy), { maximumFractionDigits: 3 })}% · ${number(perDay, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</dd></div><div><dt>Total · {days} days</dt><dd className="numeric">${number(perDay * days, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</dd></div></dl>
      {(() => { if (card) return <Button variant="ghost" className="pass-mini" onClick={() => setPopup(true)} aria-label={`Preview ${card.name} NFT`}><img src={card.url} alt={`${card.name} member pass`} loading="lazy"/><span className="text-xs"><b className="block text-chart-3">{card.name}</b><span className="text-muted-foreground">Member Pass NFT</span></span></Button>; const sig = nftSignature(price, days); return <Button variant="ghost" className="nft-mini" style={{ '--nft-hue': `${sig.hue}deg`, '--nft-boost': String(0.9 + sig.power * 0.06) } as CSSProperties} onClick={() => setPopup(true)} aria-label="Preview NFT certificate"><img src={NFT_ART[tier]} alt="" loading="lazy"/><span className="text-xs"><b className="block text-chart-3">{NFT_NAME[tier]}</b><span className="text-muted-foreground">In-app certificate</span></span></Button>; })()}
      <div className="duration-package-action"><Button className="duration-stake" onClick={() => { setPopup(false); onStake({ ...pkg, lock_days: days, apy }); }}>Stake now <ArrowUpRight size={18}/></Button><p className="duration-risk">{days}D lock · APY snapshot · Projection, not guaranteed.</p></div>
    </div>
    {popup && createPortal(<div className="nft-pop" role="dialog" aria-modal="true" aria-label="Package NFT preview" onClick={() => setPopup(false)}>
      <div className="relative" onClick={e => e.stopPropagation()}><Button variant="outline" size="icon" className="absolute -right-3 -top-3 z-10" aria-label="Close NFT preview" onClick={() => setPopup(false)}><X/></Button>{card ? <img src={card.url} alt="Member pass NFT" className="pass-pop"/> : <NftCard tier={tier} packageId={pkg.id} valueUsd={price} days={days} artworkId={art?.id} imagePath={art?.imagePath} compact/>}</div>
      <p className="nft-pop-note">{valueCard(price)?.name ?? packageCard(pkg.id)?.name ?? art?.name ?? 'Member Pass'} · ${number(price, { maximumFractionDigits: 0 })} · {days}D lock. In-app staking certificate, not a payment card.</p>
    </div>, document.body)}
  </article>;
}
