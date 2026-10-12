import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { X, Search, ArrowUpRight, Layers, ShoppingBag, SlidersHorizontal, Store, Lock, Shield, Gem } from 'lucide-react';
import foxEmblem from '@/assets/marketplace-fox-emblem.jpg.asset.json';
import vaultHero from '@/assets/marketplace-vault-hero.jpg.asset.json';
import heroReal from '@/assets/marketplace-vault-hero-real.png.asset.json';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { ContentImage } from '@/components/ContentImage';
import { MyNftCollection } from '@/components/MyNftCollection';
import { useNftCatalog } from '@/lib/useNftCatalog';
import { useShopCatalog } from '@/lib/useShopCatalog';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { MemberShop } from '@/components/MemberShop';
import { catalogImage, visibleCatalog, type CatalogItem } from '@/lib/nft-catalog';
import { SHOP_IMAGES, publishedProducts, type ShopProduct } from '@/lib/shop';
import { NFT_TIERS } from '@/lib/nft';
import { money, number } from '@/lib/bixlink';
import { AuricCardShowcase } from '@/components/AuricCardShowcase';
const localPrice=(usd:number)=>`≈ IDR ${number(usd*16250,{maximumFractionDigits:0})} · MYR ${number(usd*4.45,{maximumFractionDigits:2})}`;
export const Route = createFileRoute('/nft-marketplace')({head:()=>({meta:[{title:'BIXLINK Marketplace — Reactor Collection & Merchandise'},{name:'description',content:'Explore clear-glass BIXLINK reactor certificates and curated merchandise.'},{property:'og:title',content:'BIXLINK Marketplace'},{property:'og:description',content:'Clear-glass reactor collections and BIXLINK merchandise in the luxury marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Marketplace});
type Selection={kind:'nft';item:CatalogItem}|{kind:'product';item:ShopProduct};
function Marketplace(){
 const q=useNftCatalog(),shop=useShopCatalog(),{user}=useMember(),{data:cfg}=usePublicConfig();
 const [view,setView]=useState('ALL'),[tier,setTier]=useState('ALL'),[category,setCategory]=useState('ALL'),[search,setSearch]=useState(''),[sort,setSort]=useState('featured'),[selected,setSelected]=useState<Selection|null>(null);
 useEffect(()=>{if(!selected)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[selected]);
 const artworks=visibleCatalog(q.data??[]),products=publishedProducts(shop.data??[]);
  const matching=(s:string)=>s.toLowerCase().includes(search.toLowerCase());
  const explore=()=>{setView('ALL');requestAnimationFrame(()=>document.getElementById('market-grid')?.scrollIntoView({behavior:'smooth'}));};
  const hotCls='absolute cursor-pointer rounded-2xl border border-transparent transition duration-200 hover:border-[#39FF14]/70 hover:shadow-[0_0_26px_rgba(57,255,20,0.45)]';
 const nfts=artworks.filter(i=>matching(i.name)&&(tier==='ALL'||i.tier===tier));
 const merch=products.filter(i=>matching(i.name)&&(category==='ALL'||i.category===category)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price'?(a.priceUsd??Infinity)-(b.priceUsd??Infinity):0);
 const nftShown=view==='ALL'||view==='REACTOR',merchShown=view==='ALL'||view==='MERCHANDISE';
 return <BixShell><main className="lux-shop mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
<section aria-label="BIXLINK Marketplace vault" className="market-hero relative mb-8 overflow-hidden rounded-3xl border border-[#39FF14]/20 shadow-[0_30px_90px_-40px_rgba(57,255,20,0.45)] md:mb-12">
  <div className="relative md:hidden">
  <div aria-hidden className="absolute inset-0" style={{ backgroundImage: `linear-gradient(100deg, rgba(2,12,7,0.94) 0%, rgba(2,12,7,0.8) 45%, rgba(3,24,14,0.45) 100%), url(${vaultHero.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
  <div aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#040b07] to-transparent" />
  <div className="relative z-10 flex flex-col gap-8 px-5 py-8 md:px-10 md:py-12">
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[auto_1fr_auto] md:items-center">
      <div className="flex items-center gap-3">
        <img src={foxEmblem.url} alt="BIXLINK emblem" className="h-12 w-12 rounded-xl border border-amber-300/40 object-cover shadow-[0_0_22px_-4px_rgba(255,215,0,0.55)] md:h-14 md:w-14" />
        <span className="text-[10px] font-bold tracking-[0.35em] text-amber-200/80">BIXLINK</span>
      </div>
      <nav aria-label="Marketplace sections" className="order-last flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/45 p-1.5 backdrop-blur-md md:order-none md:justify-self-center">
        <Button variant="ghost" onClick={explore} className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-emerald-100/75 transition hover:bg-[#39FF14]/10 hover:text-[#39FF14]">MARKETPLACE</Button>
        <Button variant="ghost" onClick={()=>setView('OWNED')} className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-emerald-100/75 transition hover:bg-[#39FF14]/10 hover:text-[#39FF14]">VAULT</Button>
        <Button variant="ghost" onClick={()=>setView('REACTOR')} className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-emerald-100/75 transition hover:bg-[#39FF14]/10 hover:text-[#39FF14]">NFTS</Button>
        <Button asChild variant="ghost" className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-emerald-100/75 transition hover:bg-[#39FF14]/10 hover:text-[#39FF14]"><Link to="/about">ABOUT</Link></Button>
      </nav>
      <span aria-hidden className="hidden w-12 md:block" />
    </div>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
      <div>
        <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tight md:text-6xl xl:text-7xl">
          <span className="block bg-gradient-to-r from-emerald-300 via-[#39FF14] to-emerald-600 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(57,255,20,0.35)]">BIXLINK</span>
          <span className="block bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_20px_rgba(255,215,0,0.28)]">MARKETPLACE</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold tracking-[0.3em] text-emerald-200/80 md:text-xs">THE ATELIER &amp; VAULT — CURATED DIGITAL ARTIFACTS</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button onClick={()=>setView('OWNED')} className="rounded-xl border border-[#39FF14]/50 bg-[#39FF14]/10 px-5 py-3 text-sm font-bold text-emerald-50 shadow-[0_0_30px_-8px_rgba(57,255,20,0.6)] backdrop-blur-md transition hover:bg-[#39FF14]/20"><Lock size={16}/>My certificates</Button>
          <Button variant="outline" onClick={explore} className="rounded-xl border border-emerald-300/30 bg-white/5 px-5 py-3 text-sm font-bold text-emerald-100 backdrop-blur-md transition hover:bg-white/10"><Search size={16}/>Explore Collection</Button>
          <Button variant="ghost" onClick={()=>document.getElementById('sell-product')?.scrollIntoView({behavior:'smooth'})} className="rounded-xl px-3 py-3 text-xs font-semibold text-emerald-200/60 transition hover:text-[#39FF14]"><Store size={14}/>Sell product</Button>
        </div>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md transition hover:border-[#39FF14]/40 hover:bg-white/[0.1]"><span className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-3 text-amber-300"><Shield size={26} strokeWidth={1.6}/></span><div><b className="text-sm text-emerald-50">Verified Assets</b><p className="text-xs text-emerald-100/60">Authenticated &amp; immutable</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md transition hover:border-[#39FF14]/40 hover:bg-white/[0.1]"><span className="rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 p-3 text-[#39FF14]"><Gem size={26} strokeWidth={1.6}/></span><div><b className="text-sm text-emerald-50">Decentralized Vault</b><p className="text-xs text-emerald-100/60">Secure storage for digital artifacts</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md transition hover:border-[#39FF14]/40 hover:bg-white/[0.1]"><span className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-3 text-amber-300"><Layers size={26} strokeWidth={1.6}/></span><div><b className="text-sm text-emerald-50">Rare Collections</b><p className="text-xs text-emerald-100/60">Curated by experts · Limited editions</p></div></div>
      </div>
    </div>
  </div>
  </div>
  <div className="relative hidden md:block">
    <img src={heroReal.url} alt="BIXLINK Marketplace — The Atelier & Vault" width={1376} height={768} className="block h-auto w-full" />
    <button type="button" aria-label="Marketplace collection" onClick={explore} className={hotCls} style={{ left: '46%', width: '9.6%', top: '7%', height: '7.6%' }} />
    <button type="button" aria-label="My vault" onClick={()=>setView('OWNED')} className={hotCls} style={{ left: '57.6%', width: '5.2%', top: '7%', height: '7.6%' }} />
    <button type="button" aria-label="Reactor NFTs" onClick={()=>setView('REACTOR')} className={hotCls} style={{ left: '64.9%', width: '5%', top: '7%', height: '7.6%' }} />
    <Link to="/about" aria-label="About BIXLINK" className={hotCls} style={{ left: '71.6%', width: '5.4%', top: '7%', height: '7.6%' }} />
    <button type="button" aria-label="My certificates" onClick={()=>setView('OWNED')} className={hotCls} style={{ left: '7.1%', width: '22.2%', top: '71.6%', height: '11.4%' }} />
    <button type="button" aria-label="Explore Collection" onClick={explore} className={hotCls} style={{ left: '31.6%', width: '23.3%', top: '71.6%', height: '11.4%' }} />
    <button type="button" aria-label="Sell product" onClick={()=>document.getElementById('sell-product')?.scrollIntoView({behavior:'smooth'})} className="absolute right-4 bottom-4 cursor-pointer rounded-full border border-[#39FF14]/40 bg-black/50 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-emerald-200/80 backdrop-blur-md transition hover:border-[#39FF14] hover:text-[#39FF14]">SELL PRODUCT</button>
  </div>
</section>
   <div className="shop-tabs atelier-tabs" id="market-grid" role="tablist" aria-label="Marketplace categories">{[['ALL','All collections'],['REACTOR','Reactor NFTs'],['MERCHANDISE','Merchandise'],['OWNED','My certificates']].map(([id,label])=><Button key={id} role="tab" aria-selected={view===id} variant="ghost" onClick={()=>setView(id??'ALL')}>{label}</Button>)}</div>
 {view==='OWNED'?user?<MyNftCollection userId={user.id} bixPrice={cfg?.bixMarket.priceUsd??.84291}/>:<Button asChild className="mt-8"><Link to="/auth">Sign in to view certificates</Link></Button>:<>
 <div className="shop-toolbar"><label className="shop-search"><Search size={17}/><input aria-label="Search marketplace" placeholder="Search the collection" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="flex flex-wrap items-center gap-2"><SlidersHorizontal size={15}/>{nftShown&&<select className="form-input" aria-label="Reactor rarity" value={tier} onChange={e=>setTier(e.target.value)}>{['ALL',...NFT_TIERS].map(t=><option key={t} value={t}>{t==='ALL'?'All rarities':t}</option>)}</select>}{merchShown&&<><select className="form-input" aria-label="Product category" value={category} onChange={e=>setCategory(e.target.value)}>{['ALL',...new Set(products.map(p=>p.category))].map(c=><option key={c} value={c}>{c==='ALL'?'All categories':c}</option>)}</select><select className="form-input" aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="name">Name A–Z</option><option value="price">Price: low to high</option></select></>}</div></div>
 {nftShown&&<section className="shop-section"><div className="shop-section-title"><div><p className="shop-eyebrow">01 / CRYSTAL ENGINEERING</p><h2>Reactor collection</h2></div><span>{nfts.length} designs</span></div>{q.isError?<p role="alert" className="py-6 text-destructive">Collection unavailable.</p>:q.isPending?<p className="py-6 text-muted-foreground">Loading collection…</p>:<div className="shop-grid">{nfts.map(i=><article className="shop-item" key={i.id}><div className="shop-image-stage"><ContentImage path={i.imagePath} fallbackSrc={catalogImage(i.id)} alt={i.name} className="shop-product-image"/><span className="shop-image-tag">{i.tier}</span></div><div className="shop-item-meta"><p>STAKING CERTIFICATE</p><h3>{i.name}</h3><Button variant="ghost" className="shop-detail" aria-label={`View ${i.name}`} onClick={()=>setSelected({kind:'nft',item:i})}>View certificate<ArrowUpRight size={15}/></Button></div></article>)}</div>}{!q.isPending&&!nfts.length&&<p className="py-8 text-muted-foreground">No matching reactors.</p>}</section>}
 {merchShown&&<section className="shop-section"><div className="shop-section-title"><div><p className="shop-eyebrow">02 / SIGNATURE OBJECTS</p><h2>Merchandise</h2></div><ShoppingBag size={20}/></div>{shop.isError?<p role="alert" className="py-6 text-destructive">Products unavailable.</p>:shop.isPending?<p className="py-6 text-muted-foreground">Loading products…</p>:<div className="shop-grid shop-grid-merch">{merch.map(i=><article className="shop-item" key={i.id}><div className="shop-image-stage"><ContentImage path={i.imagePath} fallbackSrc={SHOP_IMAGES[i.id]} alt={i.name} className="shop-product-image"/>{!i.imagePath&&!SHOP_IMAGES[i.id]&&<ShoppingBag className="shop-placeholder"/>}<span className="shop-image-tag">{i.category}</span></div><div className="shop-item-meta"><p>{i.inquiryUrl?'MERCHANDISE':'MERCHANDISE PREVIEW'}</p><h3>{i.name}</h3><span className="inline-block w-fit rounded-full border border-chart-3/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-chart-3">{i.inquiryUrl?'OFFICIAL MERCHANDISE':'LIMITED EDITION'}</span>{i.priceUsd!==null&&<><b className="numeric">{money(i.priceUsd)}</b><small className="numeric block text-[10px] text-muted-foreground">{localPrice(i.priceUsd)}</small></>}<Button variant="ghost" className="shop-detail" aria-label={`View ${i.name}`} onClick={()=>setSelected({kind:'product',item:i})}>View product<ArrowUpRight size={15}/></Button>{i.inquiryUrl&&<Button className="shop-buy" onClick={()=>setSelected({kind:'product',item:i})}>Buy now</Button>}</div></article>)}</div>}{!shop.isPending&&!merch.length&&<p className="py-8 text-muted-foreground">No matching products.</p>}</section>}
 {view==='ALL'&&<AuricCardShowcase/>}
 </>}
 <aside className="shop-disclosure">Reactor NFTs are in-app staking certificates, not on-chain tokens. Package value and duration determine the tier. Completion and BIX buybacks follow contract terms and owner review, not public trading. Merchandise orders use owner-provided contact links; no payment is processed here.</aside>
 {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div role="dialog" aria-modal="true" aria-label={selected.item.name} className="modal-panel shop-dialog" onClick={e=>e.stopPropagation()}><Button size="icon" variant="outline" className="shop-dialog-close" aria-label="Close product details" onClick={()=>setSelected(null)} autoFocus><X/></Button><ContentImage path={selected.item.imagePath} fallbackSrc={selected.kind==='nft'?catalogImage(selected.item.id):SHOP_IMAGES[selected.item.id]} alt={selected.item.name} className="shop-dialog-image"/><p className="shop-eyebrow mt-5">{selected.kind==='nft'?selected.item.tier:selected.item.category}</p><h2 className="mt-2 font-display text-2xl font-bold">{selected.item.name}</h2>{selected.kind==='nft'?<><p className="mt-3 text-sm text-muted-foreground">Your joined package and staking duration determine the certificate tier and principal value.</p><Button asChild className="shop-outline mt-5 w-full" variant="outline"><Link to="/stake">View staking packages<ArrowUpRight/></Link></Button></>:<><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.item.description}</p>{selected.item.priceUsd!==null&&<><p className="numeric mt-3 text-xl font-bold">{money(selected.item.priceUsd)}</p><p className="numeric text-xs text-muted-foreground">{localPrice(selected.item.priceUsd)} · reference rate</p></>}{selected.item.inquiryUrl?<Button asChild className="shop-outline mt-5 w-full" variant="outline"><a href={selected.item.inquiryUrl} target="_blank" rel="noopener noreferrer">Buy now · contact seller<ArrowUpRight/></a></Button>:<p className="mt-4 text-sm text-muted-foreground">Not available to order yet.</p>}</>}</div></div>}
 <MemberShop userId={user?.id}/>
 </main></BixShell>;
}