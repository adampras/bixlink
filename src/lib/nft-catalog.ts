import { z } from 'zod';
import { NFT_TIERS, NFT_NAME, NFT_ART, nftTier, type NftTier } from '@/lib/nft';
const images = import.meta.glob('../assets/nft-catalog/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;
export const NFT_THEMES = ['REACTOR', 'BIXFOX', 'BIXCOIN'] as const;
export const catalogItemSchema = z.object({ id: z.string().min(1).max(80), name: z.string().trim().min(1).max(60), theme: z.enum(NFT_THEMES), tier: z.enum(['COMMON','RARE','EPIC','LEGENDARY','MYTHIC']), enabled: z.boolean(), imagePath: z.string().regex(/^images\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/).optional() });
export const catalogSchema = z.object({ items: z.array(catalogItemSchema).min(1).max(1000) }).refine(c => new Set(c.items.map(i => i.id)).size === c.items.length, 'Duplicate NFT IDs');
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export const DEFAULT_NFT_CATALOG: CatalogItem[] = NFT_TIERS.map(tier => ({ id: `glass-${tier.toLowerCase()}`, name: NFT_NAME[tier], theme: 'REACTOR', tier, enabled: true }));
export function catalogImage(id?: string | null) { const glass = NFT_TIERS.find(t => id === `glass-${t.toLowerCase()}`); if (glass) return NFT_ART[glass]; const n = Number(id?.replace('nft-','')); if (!n || n > 100) return undefined; const theme = n <= 35 ? 'reactor' : n <= 70 ? 'bixfox' : 'bixcoin'; const index = n <= 35 ? n : n <= 70 ? n-35 : n-70; return images[`../assets/nft-catalog/${theme}-${String(index).padStart(2,'0')}.jpg`]; }
export function reactorCatalog(items: CatalogItem[]) { return items.filter(i => i.theme === 'REACTOR'); }
export function visibleCatalog(items: CatalogItem[]) { return reactorCatalog(items).filter(i => i.enabled); }
export function packageArtwork(items: CatalogItem[], index: number, days: number, price: number) { const active = visibleCatalog(items).filter(i => i.tier === nftTier(price, days)); return active[index % Math.max(1,active.length)]; }
export function artworkTier(item: CatalogItem): NftTier { return item.tier; }
