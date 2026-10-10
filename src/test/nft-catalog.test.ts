import { describe,it,expect } from 'vitest';
import { DEFAULT_NFT_CATALOG, packageArtwork, visibleCatalog } from '@/lib/nft-catalog';
import { nftTier } from '@/lib/nft';
import { DEFAULT_PRODUCTS, publishedProducts, shopSchema } from '@/lib/shop';
describe('Approved reactor collection',()=>{
 it('offers reactors only, never BIXFOX or BIXCOIN',()=>{expect(new Set(DEFAULT_NFT_CATALOG.map(i=>i.theme))).toEqual(new Set(['REACTOR']));expect(visibleCatalog([...DEFAULT_NFT_CATALOG,{...DEFAULT_NFT_CATALOG[0],id:'fox',name:'fox',theme:'BIXFOX',tier:'COMMON',enabled:true}])).toHaveLength(5);});
 it('matches package value and duration to the contract tier',()=>{for(const usd of [50,100,500,3000,10000])for(const d of [30,60,90,180,360])expect(packageArtwork(DEFAULT_NFT_CATALOG,0,d,usd)?.tier).toBe(nftTier(usd,d));expect(packageArtwork(DEFAULT_NFT_CATALOG,0,360,10000)?.tier).toBe('MYTHIC');expect(packageArtwork(DEFAULT_NFT_CATALOG,0,30,50)?.tier).toBe('COMMON');});
 it('never selects hidden artwork',()=>{expect(packageArtwork(DEFAULT_NFT_CATALOG.map(i=>({...i,enabled:false})),0,30,50)).toBeUndefined();});
});
describe('Owner marketplace catalog',()=>{
 it('hides unpublished products',()=>{expect(publishedProducts(DEFAULT_PRODUCTS.map(i=>({...i,enabled:i.id==='shirt'}))).map(i=>i.id)).toEqual(['shirt']);});
 it('supports removing all merchandise',()=>{expect(shopSchema.parse({items:[]})).toEqual({items:[]});});
 it('allows only secure contact links',()=>{expect(shopSchema.safeParse({items:[{...DEFAULT_PRODUCTS[0],inquiryUrl:'javascript:alert(1)'}]}).success).toBe(false);});
});