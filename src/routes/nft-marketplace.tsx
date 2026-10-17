import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { X, Search, ArrowUpRight, Layers, ShoppingBag, SlidersHorizontal, Store, Lock } from 'lucide-react';
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
import { ShopCart } from '@/components/ShopCart';
import { ShopOrders, shopOrdersKey } from '@/components/ShopOrders';
import { cartUnits, type CartLine } from '@/lib/shipping';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
const localPrice=(usd:number)=>`≈ IDR ${number(usd*16250,{maximumFractionDigits:0})} · MYR ${number(usd*4.45,{maximumFractionDigits:2})}`;
export const Route = createFileRoute('/nft-marketplace')({head:()=>({meta:[{title:'BIXLINK Marketplace — Reactor Collection & Merchandise'},{name:'description',content:'Explore clear-glass BIXLINK reactor certificates and curated merchandise.'},{property:'og:title',content:'BIXLINK Marketplace'},{property:'og:description',content:'Clear-glass reactor collections and BIXLINK merchandise in the luxury marketplace.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Marketplace});
type Selection={kind:'nft';item:CatalogItem}|{kind:'product';item:ShopProduct};
function Marketplace(){
 const q=useNftCatalog(),shop=useShopCatalog(),{user}=useMember(),{data:cfg}=usePublicConfig();
 const [view,setView]=useState('ALL'),[tier,setTier]=useState('ALL'),[category,setCategory]=useState('ALL'),[search,setSearch]=useState(''),[sort,setSort]=useState('featured'),[selected,setSelected]=useState<Selection|null>(null);
 useEffect(()=>{if(!selected)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[selected]);
 const [cart,setCart]=useState<CartLine[]>([]),[cartOpen,setCartOpen]=useState(false),qc=useQueryClient();
 const addToCart=(p:ShopProduct)=>{if(p.priceUsd===null)return;setCart(c=>c.some(l=>l.id===p.id)?c.map(l=>l.id===p.id?{...l,qty:Math.min(99,l.qty+1)}:l):[...c,{id:p.id,name:p.name,priceUsd:p.priceUsd!,qty:1}]);toast.success(`${p.name} added to cart`);};
 const artworks=visibleCatalog(q.data??[]),products=publishedProducts(shop.data??[]);
  const matching=(s:string)=>s.toLowerCase().includes(search.toLowerCase());
  const explore=()=>{setView('ALL');requestAnimationFrame(()=>document.getElementById('market-grid')?.scrollIntoView({behavior:'smooth'}));};
  const hotCls='market-art-action';
 const nfts=artworks.filter(i=>matching(i.name)&&(tier==='ALL'||i.tier===tier));
 const merch=products.filter(i=>matching(i.name)&&(category==='ALL'||i.category===category)).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='price'?(a.priceUsd??Infinity)-(b.priceUsd??Infinity):0);
 const nftShown=view==='ALL'||view==='REACTOR',merchShown=view==='ALL'||view==='MERCHANDISE';
 return <BixShell><main className="lux-shop mx-auto max-w-7xl px-5 py-4 md:px-8 md:py-6">
<section aria-label="BIXLINK Marketplace vault" className="compact-market-hero relative">
  <img src={vaultHero.url} alt="" aria-hidden className="compact-market-bg" />
  <div className="compact-market-mobile relative md:hidden">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-3"><img src={foxEmblem.url} alt="BIXLINK emblem" className="h-11 w-11 shrink-0 rounded-lg border border-chart-3/40 object-cover"/><span className="text-xs font-bold text-chart-3">THE ATELIER &amp; VAULT</span></div>
      <Button asChild size="icon" variant="ghost" aria-label="About BIXLINK"><Link to="/about"><ArrowUpRight size={18}/></Link></Button>
    </header>
    <h1 className="font-display"><span>BIXLINK</span><span>MARKETPLACE</span></h1>
    <p className="text-xs text-muted-foreground">Digital certificates &amp; signature objects</p>
    <div className="compact-market-actions">
      <Button variant="outline" onClick={()=>setView('OWNED')}><Lock size={15}/>My certificates</Button>
      <Button onClick={explore}><Search size={15}/>Explore Collection</Button>
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
      <span className="flex items-center gap-2 text-[10px] text-muted-foreground"><Layers size={14}/>NFTs &amp; merchandise</span>
      <Button variant="ghost" size="sm" onClick={()=>document.getElementById('sell-product')?.scrollIntoView({behavior:'smooth'})}><Store size={14}/>Sell product</Button>
    </div>
  </div>
  <div className="market-art-frame relative hidden md:block">
    <img src={heroReal.url} alt="BIXLINK Marketplace — The Atelier & Vault" width={1376} height={768} className="block h-auto w-full" />
    <Button variant="ghost" type="button" aria-label="Marketplace collection" onClick={explore} className={hotCls} style={{ left: '46%', width: '9.6%', top: '7%', height: '7.6%' }} />
    <Button variant="ghost" type="button" aria-label="My vault" onClick={()=>setView('OWNED')} className={hotCls} style={{ left: '57.6%', width: '5.2%', top: '7%', height: '7.6%' }} />
    <Button variant="ghost" type="button" aria-label="Reactor NFTs" onClick={()=>setView('REACTOR')} className={hotCls} style={{ left: '64.9%', width: '5%', top: '7%', height: '7.6%' }} />
    <Link to="/about" aria-label="About BIXLINK" className={hotCls} style={{ left: '71.6%', width: '5.4%', top: '7%', height: '7.6%' }} />
    <Button variant="ghost" type="button" aria-label="My certificates" onClick={()=>setView('OWNED')} className={hotCls} style={{ left: '7.1%', width: '22.2%', top: '71.6%', height: '11.4%' }} />
    <Button variant="ghost" type="button" aria-label="Explore Collection" onClick={explore} className={hotCls} style={{ left: '31.6%', width: '23.3%', top: '71.6%', height: '11.4%' }} />
    <Button variant="ghost" type="button" aria-label="Sell product" onClick={()=>document.getElementById('sell-product')?.scrollIntoView({behavior:'smooth'})} className="market-sell-action">SELL PRODUCT</Button>
  </div>
</section>
   <div className="shop-tabs atelier-tabs" id="market-grid" role="tablist" aria-label="Marketplace categories">{[['ALL','All collections'],['REACTOR','Reactor NFTs'],['MERCHANDISE','Merchandise'],['OWNED','My certificates']].map(([id,label])=><Button key={id} role="tab" aria-selected={view===id} variant="ghost" onClick={()=>setView(id??'ALL')}>{label}</Button>)}</div>
 {view==='OWNED'?user?<MyNftCollection userId={user.id} bixPrice={cfg?.bixMarket.priceUsd??.84291}/>:<Button asChild className="mt-8"><Link to="/auth">Sign in to view certificates</Link></Button>:<>
 <div className="shop-toolbar"><label className="shop-search"><Search size={17}/><input aria-label="Search marketplace" placeholder="Search the collection" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="flex flex-wrap items-center gap-2"><SlidersHorizontal size={15}/>{nftShown&&<select className="form-input" aria-label="Reactor rarity" value={tier} onChange={e=>setTier(e.target.value)}>{['ALL',...NFT_TIERS].map(t=><option key={t} value={t}>{t==='ALL'?'All rarities':t}</option>)}</select>}{merchShown&&<><select className="form-input" aria-label="Product category" value={category} onChange={e=>setCategory(e.target.value)}>{['ALL',...new Set(products.map(p=>p.category))].map(c=><option key={c} value={c}>{c==='ALL'?'All categories':c}</option>)}</select><select className="form-input" aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="name">Name A–Z</option><option value="price">Price: low to high</option></select></>}</div></div>
 {nftShown&&<section className="shop-section"><div className="shop-section-title"><div><p className="shop-eyebrow">01 / CRYSTAL ENGINEERING</p><h2>Reactor collection</h2></div><span>{nfts.length} designs</span></div>{q.isError?<p role="alert" className="py-6 text-destructive">Collection unavailable.</p>:q.isPending?<p className="py-6 text-muted-foreground">Loading collection…</p>:<div className="shop-grid">{nfts.map(i=><article className="shop-item" key={i.id}><div className="shop-image-stage"><ContentImage path={i.imagePath} fallbackSrc={catalogImage(i.id)} alt={i.name} className="shop-product-image"/><span className="shop-image-tag">{i.tier}</span></div><div className="shop-item-meta"><p>STAKING CERTIFICATE</p><h3>{i.name}</h3><Button variant="ghost" className="shop-detail" aria-label={`View ${i.name}`} onClick={()=>setSelected({kind:'nft',item:i})}>View certificate<ArrowUpRight size={15}/></Button></div></article>)}</div>}{!q.isPending&&!nfts.length&&<p className="py-8 text-muted-foreground">No matching reactors.</p>}</section>}
 {merchShown&&<section className="shop-section"><div className="shop-section-title"><div><p className="shop-eyebrow">02 / SIGNATURE OBJECTS</p><h2>Merchandise</h2></div><ShoppingBag size={20}/></div>{shop.isError?<p role="alert" className="py-6 text-destructive">Products unavailable.</p>:shop.isPending?<p className="py-6 text-muted-foreground">Loading products…</p>:<div className="shop-grid shop-grid-merch">{merch.map(i=><article className="shop-item" key={i.id}><div className="shop-image-stage"><ContentImage path={i.imagePath} fallbackSrc={SHOP_IMAGES[i.id]} alt={i.name} className="shop-product-image"/>{!i.imagePath&&!SHOP_IMAGES[i.id]&&<ShoppingBag className="shop-placeholder"/>}<span className="shop-image-tag">{i.category}</span></div><div className="shop-item-meta"><p>{i.inquiryUrl?'MERCHANDISE':'MERCHANDISE PREVIEW'}</p><h3>{i.name}</h3><span className="inline-block w-fit rounded-full border border-chart-3/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-chart-3">{i.inquiryUrl?'OFFICIAL MERCHANDISE':'LIMITED EDITION'}</span>{i.priceUsd!==null&&<><b className="numeric">{money(i.priceUsd)}</b><small className="numeric block text-[10px] text-muted-foreground">{localPrice(i.priceUsd)}</small></>}<Button variant="ghost" className="shop-detail" aria-label={`View ${i.name}`} onClick={()=>setSelected({kind:'product',item:i})}>View product<ArrowUpRight size={15}/></Button>{i.priceUsd!==null&&<Button className="shop-buy" onClick={()=>addToCart(i)}><ShoppingBag size={14}/>Add to cart</Button>}</div></article>)}</div>}{!shop.isPending&&!merch.length&&<p className="py-8 text-muted-foreground">No matching products.</p>}</section>}
 </>}
 <aside className="shop-disclosure">Reactor NFTs are in-app staking certificates, not on-chain tokens. Package value and duration determine the tier. Completion and BIX buybacks follow contract terms and owner review, not public trading. Merchandise orders use owner-provided contact links; no payment is processed here.</aside>
 {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div role="dialog" aria-modal="true" aria-label={selected.item.name} className="modal-panel shop-dialog" onClick={e=>e.stopPropagation()}><Button size="icon" variant="outline" className="shop-dialog-close" aria-label="Close product details" onClick={()=>setSelected(null)} autoFocus><X/></Button><ContentImage path={selected.item.imagePath} fallbackSrc={selected.kind==='nft'?catalogImage(selected.item.id):SHOP_IMAGES[selected.item.id]} alt={selected.item.name} className="shop-dialog-image"/><p className="shop-eyebrow mt-5">{selected.kind==='nft'?selected.item.tier:selected.item.category}</p><h2 className="mt-2 font-display text-2xl font-bold">{selected.item.name}</h2>{selected.kind==='nft'?<><p className="mt-3 text-sm text-muted-foreground">Your joined package and staking duration determine the certificate tier and principal value.</p><Button asChild className="shop-outline mt-5 w-full" variant="outline"><Link to="/stake">View staking packages<ArrowUpRight/></Link></Button></>:<><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.item.description}</p>{selected.item.priceUsd!==null&&<><p className="numeric mt-3 text-xl font-bold">{money(selected.item.priceUsd)}</p><p className="numeric text-xs text-muted-foreground">{localPrice(selected.item.priceUsd)} · reference rate</p></>}{selected.item.inquiryUrl?<Button asChild className="shop-outline mt-5 w-full" variant="outline"><a href={selected.item.inquiryUrl} target="_blank" rel="noopener noreferrer">Buy now · contact seller<ArrowUpRight/></a></Button>:<p className="mt-4 text-sm text-muted-foreground">Not available to order yet.</p>}</>}</div></div>}
 {user&&<section className="shop-section"><div className="shop-section-title"><div><p className="shop-eyebrow">03 / ORDERS</p><h2>My orders</h2></div></div><ShopOrders userId={user.id}/></section>}
 <MemberShop userId={user?.id}/>
 {view!=='OWNED'&&<div className="mx-auto max-w-7xl"><AuricCardShowcase/></div>}
 {cart.length>0&&<Button className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-4 z-40 rounded-full shadow-lg xl:bottom-6" onClick={()=>setCartOpen(true)} aria-label="Open cart"><ShoppingBag size={16}/>Cart · {cartUnits(cart)}</Button>}
 <ShopCart open={cartOpen} onClose={()=>setCartOpen(false)} lines={cart} setLines={setCart} userId={user?.id} onOrdered={()=>{setCart([]);setCartOpen(false);qc.invalidateQueries({queryKey:shopOrdersKey(user?.id)});}}/>
 </main></BixShell>;
}