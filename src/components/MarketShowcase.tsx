import { useEffect, useState } from 'react';
import { Zap, Crown, Radio, ChevronRight, Star, Shirt, Gem, Coffee, Briefcase, Award, Sparkles, Package, Gift, Watch, Truck } from 'lucide-react';
import shirt from '@/assets/shop-shirt.jpg';
import cap from '@/assets/shop-cap.jpg';
import tumbler from '@/assets/shop-tumbler.jpg';
import hoodie from '@/assets/shop-hoodie.jpg';
import mug from '@/assets/shop-mug.jpg';
import deskmat from '@/assets/shop-deskmat.jpg';

type Item = { name: string; img: string; price: number; was: number; sold: string; stock: number };
const ITEMS: Item[] = [
  { name: 'Fox Signature Hoodie', img: hoodie, price: 59, was: 89, sold: '1.2k', stock: 82 },
  { name: 'Signature Tee', img: shirt, price: 29, was: 45, sold: '2.4k', stock: 64 },
  { name: 'Auric Cap', img: cap, price: 24, was: 35, sold: '980', stock: 71 },
  { name: 'Obsidian Fox Mug', img: mug, price: 18, was: 26, sold: '1.6k', stock: 48 },
  { name: 'Thermal Vessel', img: tumbler, price: 32, was: 49, sold: '760', stock: 90 },
  { name: 'Leather Desk Set', img: deskmat, price: 79, was: 120, sold: '410', stock: 37 },
];
const CATS = [
  { l: 'Apparel', i: Shirt }, { l: 'NFT Pass', i: Gem }, { l: 'Lifestyle', i: Coffee }, { l: 'Desk Set', i: Briefcase }, { l: 'Certificate', i: Award },
  { l: 'Limited', i: Sparkles }, { l: 'Bundles', i: Package }, { l: 'Gifts', i: Gift }, { l: 'Accessories', i: Watch }, { l: 'Delivery', i: Truck },
];
const BANNERS = [
  { t: 'GENESIS DROP', s: 'Official BIXLINK merchandise collection' },
  { t: 'INSURED DELIVERY', s: 'Packed and shipped by the official store' },
  { t: 'PLATINUM PASS', s: 'Emerald & gold consortium certificate' },
];
const off = (i: Item) => Math.round((1 - i.price / i.was) * 100);
const pad = (n: number) => String(n).padStart(2, '0');

export function MarketShowcase({ onOrder }: { onOrder: () => void }) {
  const [left, setLeft] = useState(4 * 3600);
  const [b, setB] = useState(0);
  useEffect(() => { const t = setInterval(() => { setLeft(v => (v <= 1 ? 4 * 3600 : v - 1)); }, 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setB(v => (v + 1) % BANNERS.length), 4500); return () => clearInterval(t); }, []);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  const Head = ({ icon: I, title, extra }: { icon: typeof Zap; title: string; extra?: React.ReactNode }) => (
    <div className="ms-head"><span className="ms-title"><I size={16} />{title}</span>{extra}<button type="button" onClick={onOrder} className="ms-more">See all<ChevronRight size={14} /></button></div>
  );
  return (
    <div className="ms-wrap">
      <p className="ms-note">Sample showcase — product details, prices and availability are confirmed by the official store before ordering.</p>
      <div className="ms-cats" role="list">{CATS.map(c => <button type="button" role="listitem" key={c.l} onClick={onOrder} className="ms-cat"><span><c.i size={20} /></span>{c.l}</button>)}</div>

      <div className="ms-banner" aria-live="polite">
        <img src={ITEMS[b * 2]!.img} alt="" aria-hidden />
        <div><small>BIXLINK STORE</small><b>{BANNERS[b]!.t}</b><p>{BANNERS[b]!.s}</p></div>
        <span className="ms-dots">{BANNERS.map((_, i) => <i key={i} data-on={i === b} />)}</span>
      </div>

      <section>
        <Head icon={Zap} title="FLASH DROP" extra={<span className="ms-timer numeric">{pad(h)}:{pad(m)}:{pad(s)}</span>} />
        <div className="ms-rail">{ITEMS.map(i => (
          <button type="button" key={i.name} onClick={onOrder} className="ms-card ms-flash">
            <div className="ms-img"><img src={i.img} alt={i.name} loading="lazy" width={816} height={816} /><em>OFFICIAL</em><strong>-{off(i)}%</strong></div>
            <b className="numeric">${i.price}</b><s className="numeric">${i.was}</s>
            <span className="ms-bar"><i style={{ width: `${i.stock}%` }} /><small>{i.stock > 80 ? 'ALMOST GONE' : 'LIMITED STOCK'}</small></span>
          </button>))}</div>
      </section>

      <section>
        <Head icon={Crown} title="BEST SELLERS" />
        <div className="ms-grid3">{ITEMS.slice(0, 3).map((i, n) => (
          <button type="button" key={i.name} onClick={onOrder} className="ms-card">
            <div className="ms-img"><img src={i.img} alt={i.name} loading="lazy" width={816} height={816} /><em className="ms-top">TOP {n + 1}</em></div>
            <h4>{i.name}</h4><small>{i.sold}+ sold</small>
          </button>))}</div>
      </section>

      <section>
        <Head icon={Radio} title="LIVE PREVIEW" />
        <div className="ms-rail">{ITEMS.slice().reverse().map(i => (
          <button type="button" key={i.name} onClick={onOrder} className="ms-live">
            <img src={i.img} alt={i.name} loading="lazy" width={816} height={816} />
            <em><i />PREVIEW</em><span>{i.name}</span>
          </button>))}</div>
      </section>

      <section>
        <Head icon={Sparkles} title="ALL PRODUCTS" />
        <div className="ms-grid2">{ITEMS.map(i => (
          <article key={i.name} className="ms-card">
            <div className="ms-img"><img src={i.img} alt={i.name} loading="lazy" width={816} height={816} /><em>OFFICIAL</em></div>
            <h4>{i.name}</h4>
            <div className="ms-row"><b className="numeric">${i.price}</b><small><Star size={10} />5.0 · {i.sold} sold</small></div>
            <button type="button" onClick={onOrder} className="ms-order">Details / Order</button>
          </article>))}</div>
      </section>
    </div>
  );
}
