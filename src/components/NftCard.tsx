import { money } from '@/lib/bixlink';
import { NFT_ART, NFT_NAME, type NftTier } from '@/lib/nft';
import { catalogImage } from '@/lib/nft-catalog';
import { ContentImage } from '@/components/ContentImage';

export function NftCard({ tier, packageId, valueUsd, days, serial, compact = false, artworkId, imagePath }: { tier: NftTier; packageId: string; valueUsd: number; days: number; serial?: number | null; compact?: boolean; artworkId?: string | null; imagePath?: string | null }) {
  return <figure className={`nft-card nft-${tier.toLowerCase()} ${compact ? 'nft-compact' : ''}`}>
    <div className="nft-card-top"><span>{tier}</span><span className="numeric">{serial ? `#${String(serial).padStart(5, '0')}` : 'PREVIEW'}</span></div>
    <ContentImage path={imagePath ?? undefined} fallbackSrc={catalogImage(artworkId) ?? NFT_ART[tier]} alt={`${NFT_NAME[tier]} reactor NFT`} className="nft-card-art"/>
    <figcaption className="nft-card-foot">
      <b>{NFT_NAME[tier]}</b>
      <span className="numeric">{packageId} · {days}D</span>
      <strong className="numeric">{money(valueUsd)}</strong>
    </figcaption>
  </figure>;
}
