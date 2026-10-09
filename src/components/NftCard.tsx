import { money } from '@/lib/bixlink';
import { NFT_ART, NFT_NAME, type NftTier } from '@/lib/nft';

export function NftCard({ tier, packageId, valueUsd, days, serial, compact = false }: { tier: NftTier; packageId: string; valueUsd: number; days: number; serial?: number | null; compact?: boolean }) {
  return <figure className={`nft-card nft-${tier.toLowerCase()} ${compact ? 'nft-compact' : ''}`}>
    <div className="nft-card-top"><span>{tier}</span><span className="numeric">{serial ? `#${String(serial).padStart(5, '0')}` : 'PREVIEW'}</span></div>
    <img src={NFT_ART[tier]} alt={`${NFT_NAME[tier]} reactor NFT`} width={768} height={1024} loading="lazy" className="nft-card-art"/>
    <figcaption className="nft-card-foot">
      <b>{NFT_NAME[tier]}</b>
      <span className="numeric">{packageId} · {days}D</span>
      <strong className="numeric">{money(valueUsd)}</strong>
    </figcaption>
  </figure>;
}
