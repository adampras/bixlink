import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Bell, Briefcase, ChevronRight, ClipboardList, Home, MessageSquare, Plus, ScanLine, Search, Star, User, ShoppingBasket, Utensils } from 'lucide-react';
import type { BixgoService } from '@/lib/bixgo';
import icRide from '@/assets/bixgo/ic-ride.png';
import icFood from '@/assets/bixgo/ic-food.png';
import icSend from '@/assets/bixgo/ic-send.png';
import icJastip from '@/assets/bixgo/ic-jastip.png';
import icDine from '@/assets/bixgo/ic-dine.png';
import icCar from '@/assets/bixgo/ic-car.png';
import icMart from '@/assets/bixgo/ic-mart.png';
import icBills from '@/assets/bixgo/ic-bills.png';
import icCash from '@/assets/bixgo/ic-cash.png';
import icHealth from '@/assets/bixgo/ic-health.png';
import m1 from '@/assets/bixgo/m1.jpg';
import m2 from '@/assets/bixgo/m2.jpg';
import m3 from '@/assets/bixgo/m3.jpg';
import m4 from '@/assets/bixgo/m4.jpg';
import m5 from '@/assets/bixgo/m5.jpg';
import m6 from '@/assets/bixgo/m6.jpg';
import m7 from '@/assets/bixgo/m7.jpg';
import promo from '@/assets/bixgo/promo.jpg';

export type BixgoView = 'home' | 'order' | 'activity' | 'inbox' | 'account';

const TILES: { label: string; img: string; svc?: BixgoService }[] = [
  { label: 'Motor', img: icRide, svc: 'ride' }, { label: 'Makanan', img: icFood, svc: 'food' },
  { label: 'Express', img: icSend, svc: 'send' }, { label: 'Jastip', img: icJastip },
  { label: 'Dine Out', img: icDine }, { label: 'Mobil', img: icCar, svc: 'car' },
  { label: 'Belanja', img: icMart, svc: 'mart' }, { label: 'Pulsa & bills', img: icBills },
  { label: 'Dana Tunai', img: icCash }, { label: 'Kesehatan', img: icHealth },
];

type Card = { img: string; name: string; promo?: string; ad?: boolean; rating?: number; km?: number; kind: 'food' | 'mart'; svc: BixgoService; brand?: boolean };
const FEED: Card[] = [
  { img: m1, name: 'NASI GORENG KAMBING PAK ORTE', promo: 'Diskon 30%', ad: true, rating: 4.5, km: 0.6, kind: 'food', svc: 'food' },
  { img: m2, name: 'AYAM TALIWANG BU DITA - Karang', promo: 'Diskon 50%', ad: true, rating: 4.8, km: 1.9, kind: 'food', svc: 'food' },
  { img: m3, name: 'Seafood Table - Monjok', promo: 'Diskon total tagihan s.d. 25%', rating: 4.7, km: 2.4, kind: 'food', svc: 'food' },
  { img: m4, name: 'Tempong Arjuna - Pejanggik', promo: 'Diskon 30%', rating: 4.7, km: 1.0, kind: 'food', svc: 'food' },
  { img: m6, name: 'BIXMart Hub - Abian Tubuh', promo: 'Diskon 50%', rating: 4.9, km: 1.1, kind: 'mart', svc: 'mart' },
  { img: promo, name: 'Kode promo: KIRIMBIX', kind: 'food', svc: 'send', brand: true },
  { img: m5, name: 'AYAM GEPREK JUARA - Cilinaya', promo: 'Diskon 50%', rating: 4.6, km: 0.6, kind: 'food', svc: 'food' },
  { img: m7, name: 'Fox Burger - Epicentrum', promo: '39% discount for new users', ad: true, rating: 4.6, km: 2.2, kind: 'food', svc: 'food' },
];

export function BixgoHome({ enabled, balance, onPick, onSoon }: { enabled: Set<BixgoService>; balance: string; onPick: (s: BixgoService) => void; onSoon: (label: string) => void }) {
  const [q, setQ] = useState('');
  const feed = FEED.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return <>
    <header className="px-3 pt-3">
      <div className="relative overflow-hidden rounded-3xl p-4 text-primary-foreground shadow-lg" style={{ background: 'var(--bixgo-header)' }}>
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Kembali" className="grid h-9 w-9 place-items-center rounded-full bg-background/25 backdrop-blur"><ArrowLeft className="h-5 w-5"/></Link>
          <span className="rounded-full bg-background/25 px-3 py-1 text-[11px] font-bold tracking-widest">BIXGO</span>
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight">Where are you going today?</h1>
        <p className="text-xs opacity-90">Ride · Food · Send · Mart dalam satu aplikasi</p>
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-background/10"/>
      </div>
      <label className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground"/>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search food, shopping, or services" className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"/>
      </label>
    </header>
    <section className="no-scrollbar overflow-x-auto px-2 pt-4">
      <div className="grid w-max grid-flow-col grid-rows-2 gap-x-1 gap-y-3">
        {TILES.map(t => <button key={t.label} onClick={() => t.svc && enabled.has(t.svc) ? onPick(t.svc) : onSoon(t.label)} className="flex w-[78px] flex-col items-center gap-1 text-center active:scale-95 transition">
          <img src={t.img} alt="" width={56} height={56} className="h-14 w-14 object-contain drop-shadow-md"/>
          <span className="text-[12px] font-semibold leading-tight">{t.label}</span>
        </button>)}
      </div>
    </section>
    <div className="mt-3 flex justify-center gap-1"><span className="h-1 w-5 rounded-full bg-foreground"/><span className="h-1 w-1 rounded-full bg-muted-foreground"/></div>
    <section className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-3">
      <Link to="/wallet" className="min-w-[132px] rounded-2xl border border-border bg-card px-3 py-2.5"><p className="text-[11px] text-muted-foreground">Balance</p><p className="flex items-center justify-between text-sm font-bold">{balance}<span className="ml-2 inline-block h-5 w-5 rounded-full border-4" style={{ borderColor: 'var(--bixgo-wallet)' }}/></p></Link>
      <Link to="/wallet" className="min-w-[160px] rounded-2xl border border-border bg-card px-3 py-2.5"><p className="text-[11px] text-muted-foreground">Top Up</p><p className="flex items-center justify-between text-sm font-bold">in BIX Wallet<Plus className="ml-2 h-5 w-5 rounded bg-primary p-0.5 text-primary-foreground"/></p></Link>
      <Link to="/pay" className="min-w-[140px] rounded-2xl border border-border bg-card px-3 py-2.5"><p className="text-[11px] text-muted-foreground">Pay now</p><p className="text-sm font-bold">BIX PAY</p></Link>
    </section>
    <section className="mt-4 grid grid-cols-2 gap-3 px-3 pb-6">
      {feed.map(c => <button key={c.name} onClick={() => enabled.has(c.svc) ? onPick(c.svc) : onSoon(c.name)} className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm active:scale-[0.98] transition">
        <div className="relative aspect-square">
          <img src={c.img} alt={c.name} loading="lazy" width={480} height={480} className="h-full w-full object-cover"/>
          {c.ad && <span className="absolute left-2 top-2 rounded-full bg-foreground/75 px-2 py-0.5 text-[10px] font-bold text-background">Iklan</span>}
          {c.promo && <span className="absolute bottom-0 left-0 max-w-[92%] truncate rounded-tr-2xl px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--bixgo-promo)', color: 'var(--bixgo-promo-fg)' }}>{c.promo}</span>}
        </div>
        <div className="p-2.5">
          <p className="line-clamp-2 text-[13px] font-bold leading-snug">{c.name}</p>
          {c.brand ? <p className="mt-1.5 flex items-center gap-1 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">GO</span>BIXGO</p>
            : <div className="mt-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent"/>{c.rating}</span><span className="flex items-center gap-1 text-muted-foreground">{c.kind === 'mart' ? <ShoppingBasket className="h-3.5 w-3.5"/> : <Utensils className="h-3.5 w-3.5"/>}{c.km}km</span></div>}
        </div>
      </button>)}
    </section>
    <p className="px-4 pb-4 text-center text-[10px] text-muted-foreground">Merchant names, photos, and promos are preview examples.</p>
  </>;
}

export function BixgoInbox() {
  const items = [['Promo BIXFood', 'Up to 50% off for selected restaurants today.'], ['BIXRide', 'Your first trip gets a BIX fare discount.'], ['Info BIXGO', 'BIXGO is still in preview — no real payments yet.']];
  return <section className="px-4 py-4"><h2 className="mb-3 text-lg font-bold">Inbox</h2>
    {items.map(([t, b]) => <div key={t} className="mb-2 flex gap-3 rounded-2xl border border-border bg-card p-3"><Bell className="h-5 w-5 shrink-0 text-primary"/><div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted-foreground">{b}</p></div></div>)}
  </section>;
}

export function BixgoAccount({ name, balance, onBack, onSoon }: { name: string; balance: string; onBack: () => void; onSoon: (l: string) => void }) {
  const Row = ({ label, right, badge, to }: { label: string; right?: string; badge?: boolean; to?: string }) => {
    const inner = <><span className="text-[15px] font-semibold">{label}</span><span className="flex items-center gap-2 text-sm">{badge && <b style={{ color: 'var(--bixgo-alert)' }}>New</b>}{right && <b>{right}</b>}<ChevronRight className="h-4 w-4"/></span></>;
    return to ? <Link to={to} className="flex w-full items-center justify-between py-3.5">{inner}</Link> : <button onClick={() => onSoon(label)} className="flex w-full items-center justify-between py-3.5">{inner}</button>;
  };
  return <section className="pb-6">
    <div className="px-4 pt-3"><button aria-label="Back" onClick={onBack}><ArrowLeft className="h-6 w-6"/></button></div>
    <div className="mx-4 mt-3 rounded-3xl bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><User className="h-8 w-8"/></span><b className="flex-1 text-lg">{name}</b><Link to="/profile" className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">Profil</Link></div>
      <button onClick={() => onSoon('BIXGO VIP')} className="mt-3 w-full rounded-full border border-border px-3 py-1.5 text-left text-xs font-semibold">✦ Join BIXGO Unlimited</button>
    </div>
    <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4">
      <div className="min-w-[150px] rounded-2xl border border-border bg-card p-3"><div className="flex justify-between"><span className="inline-block h-8 w-8 rounded-full border-[6px]" style={{ borderColor: 'var(--bixgo-wallet)' }}/><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">Utama</span></div><p className="mt-3 font-bold">BIX Wallet</p><p className="text-sm text-muted-foreground">{balance}</p></div>
      <Link to="/pay" className="min-w-[150px] rounded-2xl p-3 text-primary-foreground" style={{ background: 'var(--bixgo-header)' }}><p className="mt-11 font-bold">BIX PAY</p><p className="text-sm opacity-90">Bayar & transfer</p></Link>
      <button onClick={() => onSoon('Add method')} className="min-w-[120px] rounded-2xl border border-border bg-card p-3 text-left"><Plus className="h-6 w-6 text-primary"/><p className="mt-6 text-sm font-bold">Add method</p></button>
    </div>
    <div className="mx-4 mt-3 space-y-2">
      <button onClick={() => onSoon('Family Account')} className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-sm font-semibold">Open a BIXGO Family account<User className="h-6 w-6 text-primary"/></button>
      <button onClick={() => onSoon('BIXGO for Business')} className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-sm font-semibold">View BIXGO for Business<Briefcase className="h-6 w-6 text-accent"/></button>
    </div>
    <div className="mt-5 px-4">
      <h3 className="text-xl font-black">Lebih banyak keuntungan</h3>
      <Row label="BIXGO Rewards" right="0 BIXP"/><Row label="Langganan"/><Row label="Tantangan" to="/arena"/>
      <h3 className="mt-5 text-xl font-black">Umum</h3>
      <Row label="Favorit"/><Row label="Preferensi makanan" badge/><Row label="Metode Pembayaran" to="/wallet"/><Row label="Settings" to="/settings"/><Row label="Security settings" to="/settings"/><Row label="Bahasa" to="/settings"/><Row label="Saved Places"/><Row label="Calendars" badge/>
      <h3 className="mt-5 text-xl font-black">Help</h3>
      <Row label="Help Center"/>
    </div>
  </section>;
}

export function BixgoBottomNav({ view, setView, inbox }: { view: BixgoView; setView: (v: BixgoView) => void; inbox: number }) {
  const tabs: [BixgoView, string, typeof Home][] = [['home', 'Beranda', Home], ['order', 'Scan', ScanLine], ['activity', 'Aktivitas', ClipboardList], ['inbox', 'Inbox', MessageSquare], ['account', 'Account', User]];
  return <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
    {tabs.map(([k, l, I]) => <button key={k} onClick={() => setView(k)} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${view === k ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
      <I className={`h-5 w-5 ${view === k ? 'fill-primary/20' : ''}`}/>{l}
      {k === 'inbox' && inbox > 0 && <span className="absolute right-[22%] top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-primary-foreground" style={{ background: 'var(--bixgo-alert)' }}>{inbox}</span>}
    </button>)}
  </nav>;
}

