import { describe,it,expect } from 'vitest';
import { DEFAULT_NFT_CATALOG, catalogImage, packageArtwork, visibleCatalog } from '@/lib/nft-catalog';
describe('NFT catalog rules',()=>{
 it('contains 100 distinct artwork designs',()=>{expect(DEFAULT_NFT_CATALOG).toHaveLength(100);expect(new Set(DEFAULT_NFT_CATALOG.map(i=>catalogImage(i.id))).size).toBe(100);});
 it('includes reactor, BIXFOX and BIXCOIN themes',()=>{expect(new Set(DEFAULT_NFT_CATALOG.map(i=>i.theme))).toEqual(new Set(['REACTOR','BIXFOX','BIXCOIN']));});
 it('hidden artworks cannot appear or be offered in previews',()=>{const items=DEFAULT_NFT_CATALOG.map(i=>({...i,enabled:i.id==='nft-010'}));expect(visibleCatalog(items).map(i=>i.id)).toEqual(['nft-010']);expect(packageArtwork(items,0,30)?.id).toBe('nft-010');});
 it('eight packages with five periods have distinct artwork previews',()=>{const ids=Array.from({length:8},(_,i)=>[30,60,90,180,360].map(d=>packageArtwork(DEFAULT_NFT_CATALOG,i,d)?.id)).flat();expect(new Set(ids).size).toBe(40);});
});
