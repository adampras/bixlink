import { ContentImage } from '@/components/ContentImage';
import { catalogImage, type CatalogItem } from '@/lib/nft-catalog';
export function NftArtwork({ item }: { item: CatalogItem }) { return <figure className={`nft-card nft-${item.tier.toLowerCase()}`}><div className="nft-card-top"><span>{item.tier}</span><span>{item.id}</span></div><ContentImage path={item.imagePath} fallbackSrc={catalogImage(item.id)} alt={item.name} className="nft-catalog-art"/><figcaption className="nft-card-foot"><b>{item.name}</b><span>{item.theme}</span></figcaption></figure>; }
