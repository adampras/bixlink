import type { CSSProperties } from 'react';
import { money } from '@/lib/bixlink';
import { NFT_ART, NFT_NAME, nftSignature, type NftTier } from '@/lib/nft';
import { catalogImage } from '@/lib/nft-catalog';
import { ContentImage } from '@/components/ContentImage';

export function NftCard({ tier, packageId, valueUsd, days, serial, compact = false, artworkId, imagePath }: { tier: NftTier; packageId: string; valueUsd: number; days: number; serial?: number | null; compact?: boolean; artworkId?: string | null | undefined; imagePath?: string | null | undefined }) {
  const sig = nftSignature(valueUsd, days);
  const style = { '--nft-hue': `${sig.hue}deg`, '--nft-boost': String(0.9 + sig.power * 0.06) } as CSSProperties;
  return <figure className={`nft-card nft-${tier.toLowerCase()} nft-power-${sig.power} ${compact ? 'nft-compact' : ''}`} style={style} data-signature={sig.code}>
    <div className="nft-card-top"><span>{tier}</span><span className="numeric">{serial ? `#${String(serial).padStart(5, '0')}` : sig.code}</span></div>
    <div className="nft-card-stage">
      <ContentImage path={imagePath ?? undefined} fallbackSrc={catalogImage(artworkId) ?? NFT_ART[tier]} alt={`${NFT_NAME[tier]} reactor NFT`} className="nft-card-art"/>
      <span className="nft-card-grade numeric">GRADE {sig.grade}</span>
      <span className="nft-card-days numeric">{days} DAYS</span>
    </div>
    <figcaption className="nft-card-foot">
      <b>{NFT_NAME[tier]}</b>
      <span className="numeric">{packageId} · {days}D lock</span>
      <span className="nft-power" aria-label={`Power ${sig.power} of 5`}>{[1,2,3,4,5].map(i => <i key={i} data-on={i <= sig.power}/>)}</span>
      <strong className="numeric">{money(valueUsd)}</strong>
    </figcaption>
  </figure>;
}
