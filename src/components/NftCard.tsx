import type { CSSProperties } from 'react';
import { money } from '@/lib/bixlink';
import { NFT_ART, NFT_NAME, nftSignature, type NftTier } from '@/lib/nft';
import { catalogImage } from '@/lib/nft-catalog';
import { packageCard } from '@/lib/package-cards';
import { ContentImage } from '@/components/ContentImage';

export function NftCard({ tier, packageId, valueUsd, days, serial, compact = false, artworkId, imagePath }: { tier: NftTier; packageId: string; valueUsd: number; days: number; serial?: number | null; compact?: boolean; artworkId?: string | null | undefined; imagePath?: string | null | undefined }) {
  const pass = packageCard(packageId);
  if (pass) return <figure className={`nft-card pass-card ${compact ? 'nft-compact' : ''}`}>
    <img src={pass.url} alt={`${pass.name} member pass`} className="pass-card-art" loading="lazy"/>
    <figcaption className="nft-card-foot">
      <b>{pass.name}</b>
      <span className="numeric">{serial ? `#${String(serial).padStart(5, '0')} · ` : ''}{days}D lock · Member Pass NFT</span>
      <strong className="numeric">{money(valueUsd)}</strong>
    </figcaption>
  </figure>;
  const sig = nftSignature(valueUsd, days);
  const style = { '--nft-hue': `${sig.hue}deg`, '--nft-boost': String(0.9 + sig.power * 0.06) } as CSSProperties;
  return <figure className={`nft-card nft-${tier.toLowerCase()} nft-power-${sig.power} ${compact ? 'nft-compact' : ''}`} style={style} data-signature={sig.code}>
    <div className="nft-card-top"><span>{tier}</span><span className="numeric">{serial ? `#${String(serial).padStart(5, '0')}` : sig.code}</span></div>
    <div className="nft-card-stage">
      <ContentImage path={imagePath ?? undefined} fallbackSrc={catalogImage(artworkId) ?? NFT_ART[tier]} alt={`${NFT_NAME[tier]} NFT`} className="nft-card-art"/>
      <span className="nft-card-days numeric">{days} DAYS</span>
    </div>
    <figcaption className="nft-card-foot">
      <b>{NFT_NAME[tier]}</b>
      <span className="numeric">{packageId} · {days}D lock</span>
      <strong className="numeric">{money(valueUsd)}</strong>
    </figcaption>
  </figure>;
}
