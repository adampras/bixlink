import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { BIXGO_SERVICES, bixgoFare, readBixgo, type BixgoService, type BixgoSettings } from '@/lib/bixgo';
import { ArrowLeft, Bike, Car, CheckCircle2, Construction, History, MapPin, Minus, Navigation, Package, Plus, ShoppingBasket, Star, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { BixgoRideBooking } from '@/components/BixgoRideBooking';
import { BixgoBills } from '@/components/BixgoBills';
import { BixgoTravel } from '@/components/BixgoTravel';
import { GLOBAL_CITIES, GLOBAL_CURRENCIES, cryptoEquivalent, formatMoney, readCurrency, saveCurrency, type GlobalCurrency } from '@/lib/bixgo-global';
import { BixgoAccount, BixgoBottomNav, BixgoHome, BixgoInbox, type BixgoView } from '@/components/BixgoHome';

export const Route = createFileRoute('/bixgo')({
  head: () => ({ meta: [
    { title: 'BIXGO — Rides, Food & Courier | BIXLINK' },
    { name: 'description', content: 'BIXGO super-app preview: BIXRide, BIXCar, BIXFood, BIXSend and BIXMart with global fare estimates in USD, EUR, AED, SGD, USDT and BIX.' },
    { property: 'og:title', content: 'BIXGO — BIXLINK super-app' },
    { property: 'og:description', content: 'Ride, car, food, courier and grocery fare estimates inside the BIXLINK ecosystem.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: BixgoPage,
});

const ICON = { ride: Bike, car: Car, food: UtensilsCrossed, send: Package, mart: ShoppingBasket } as const;
let fmt = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const idr = (n: number) => fmt(n);
type Step = 'form' | 'search' | 'track' | 'done';
type Item = { id: string; name: string; price: number; store: string };
const CATALOG: Record<'food' | 'mart', Item[]> = {
  food: [
    { id: 'f1', name: 'Wagyu Burger Deluxe', price: 224000, store: 'Fox Burger Global' },
    { id: 'f2', name: 'Salmon Poke Bowl', price: 192000, store: 'Marina Kitchen' },
    { id: 'f3', name: 'Nasi Goreng Signature', price: 96000, store: 'Nusantara Lounge' },
    { id: 'f4', name: 'Iced Flat White', price: 72000, store: 'Kopi Fox' },
  ],
  mart: [
    { id: 'm1', name: 'Travel Essentials Kit', price: 352000, store: 'BIXMart Global' },
    { id: 'm2', name: 'Fresh Fruit Box', price: 288000, store: 'BIXMart Global' },
    { id: 'm3', name: 'Sparkling Water ×12', price: 160000, store: 'BIXMart Global' },
    { id: 'm4', name: 'Power Bank 20,000 mAh', price: 480000, store: 'BIXMart Global' },
  ],
};
const TIERS = { ride: [['Standard', 1], ['Comfort', 1.25]], car: [['Economy', 1], ['Executive', 1.8], ['BIX Black', 2.4], ['Airport XL', 2]] } as const;
const SIZES = [['Small ≤5 kg', 1], ['Medium ≤20 kg', 1.3], ['Large ≤50 kg', 1.7]] as const;
const STAGES: Record<BixgoService, string[]> = {
  ride: ['Partner assigned', 'Heading to pickup', 'On the trip', 'Arrived'],
  car: ['Driver assigned', 'Heading to pickup', 'On the trip', 'Arrived'],
  food: ['Order received', 'Restaurant preparing', 'Courier on the way', 'Delivered'],
  mart: ['Order received', 'Picking items', 'Courier on the way', 'Delivered'],
  send: ['Courier assigned', 'Picking up package', 'In transit', 'Delivered'],
};
const PARTNERS = ['Andi P.', 'Rina S.', 'Budi H.', 'Dewi K.', 'Fajar M.'];
type Order = { id: string; at: string; svc: BixgoService; from: string; to: string; total: number; pay: string; rating?: number };
const HKEY = 'bixgo_demo_orders';

function BixgoPage() {
  const [cfg, setCfg] = useState<BixgoSettings | null>(null);
  const isAdmin = usePublicConfig().data?.isAdmin === true;
  const [svc, setSvc] = useState<BixgoService>('ride');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [km, setKm] = useState(5);
  const [payBix, setPayBix] = useState(false);
  const [tier, setTier] = useState(0);
  const [size, setSize] = useState(0);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('form');
  const [stage, setStage] = useState(0);
  const [partner, setPartner] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'order' | 'history'>('order');
  const [view, setView] = useState<BixgoView>('home');
  const [sub, setSub] = useState<null | 'ride' | 'car' | 'bills' | 'travel'>(null);
  const [cur, setCur] = useState<GlobalCurrency>('USD');
  const [city, setCity] = useState<string>(GLOBAL_CITIES[0].id);
  useEffect(() => { setCur(readCurrency()); }, []);
  const pickCur = (c: GlobalCurrency) => { setCur(c); saveCurrency(c); };
  const { user } = useMember();

  useEffect(() => { void supabase.from('app_settings').select('value').eq('key', 'bixgo').maybeSingle().then(({ data }) => setCfg(readBixgo(data?.value))); }, []);
  useEffect(() => { try { setOrders(JSON.parse(localStorage.getItem(HKEY) || '[]')); } catch { /* ignore */ } }, []);
  const persist = (o: Order[]) => { setOrders(o); localStorage.setItem(HKEY, JSON.stringify(o.slice(0, 30))); };
  const list = useMemo(() => cfg ? BIXGO_SERVICES.filter(s => cfg.services[s.key].enabled) : [], [cfg]);
  useEffect(() => { if (list.length && !list.some(s => s.key === svc)) setSvc(list[0]!.key); }, [list, svc]);
  useEffect(() => { if (step !== 'search') return; const t = setTimeout(() => { setPartner(PARTNERS[Math.floor(Math.random() * PARTNERS.length)]!); setStage(0); setStep('track'); }, 2200); return () => clearTimeout(t); }, [step]);
  useEffect(() => { if (step !== 'track') return; if (stage >= 3) return; const t = setTimeout(() => setStage(s => s + 1), 2500); return () => clearTimeout(t); }, [step, stage]);

  if (!cfg) return <BixShell><main className="px-5 py-16 text-center text-sm text-muted-foreground">Loading BIXGO…</main></BixShell>;
  if (!cfg.enabled && !isAdmin) return <BixShell><main className="mx-auto max-w-xl px-5 py-16"><section className="rounded-3xl border border-primary/30 bg-card/80 p-6 text-center">
    <Construction className="mx-auto h-10 w-10 text-primary"/><p className="mt-3 text-xs uppercase tracking-[0.3em] text-primary">BIXGO</p>
    <h1 className="mt-1 font-display text-2xl font-bold">Under Reconstruction</h1>
    <p className="mt-2 text-sm text-muted-foreground">{cfg.notice || 'BIXGO rides, food and courier services are being prepared. Please check back soon.'}</p>
    <Button asChild className="mt-5"><Link to="/dashboard">Back to dashboard</Link></Button></section></main></BixShell>;

  fmt = (n: number) => formatMoney(n, cur, cfg.usdtIdr);
  const meta = BIXGO_SERVICES.find(s => s.key === svc)!;
  const shop = svc === 'food' || svc === 'mart';
  const catalog = shop ? CATALOG[svc] : [];
  const items = catalog.filter(i => cart[i.id]);
  const subtotal = items.reduce((a, i) => a + i.price * (cart[i.id] ?? 0), 0);
  const mult = svc === 'ride' || svc === 'car' ? (TIERS[svc][tier]?.[1] ?? 1) : svc === 'send' ? SIZES[size]![1] : 1;
  const base = bixgoFare(cfg, svc, km, false);
  const delivery = Math.round(base.idr * mult);
  const service = shop ? 2000 : 0;
  const gross = delivery + subtotal + service;
  const discount = payBix ? Math.round(gross * cfg.bixDiscountPct / 100) : 0;
  const total = gross - discount;
  const usdt = +(total / cfg.usdtIdr).toFixed(2);
  const canOrder = from.trim() && to.trim() && (!shop || items.length > 0);
  const add = (id: string, d: number) => setCart(c => { const n = Math.max(0, (c[id] ?? 0) + d); const x = { ...c, [id]: n }; if (!n) delete x[id]; return x; });
  const reset = () => { setStep('form'); setFrom(''); setTo(''); setCart({}); setNote(''); };
  const finish = () => { persist([{ id: 'BG-' + Date.now().toString(36).toUpperCase(), at: new Date().toISOString(), svc, from, to, total, pay: payBix ? 'BIX' : 'IDR/USDT' }, ...orders]); setStep('done'); };
  const rate = (r: number) => { const [first, ...rest] = orders; if (first) persist([{ ...first, rating: r }, ...rest]); };
  const pos = step === 'track' ? 10 + stage * 27 : 9;

  const enabledSet = new Set(list.map(s => s.key));
  const soon = (l: string) => l === 'Pulsa & bills' ? setSub('bills') : l === 'Travel & eSIM' ? setSub('travel') : toast(`${l} — coming soon to BIXGO`);
  const pick = (s: BixgoService) => { if (s === 'ride' || s === 'car') { setSub(s); return; } setSvc(s); setTier(0); setCart({}); setStep('form'); setView('order'); setTab('order'); };
  const go = (v: BixgoView) => { setView(v); if (v === 'activity') setTab('history'); if (v === 'order') setTab('order'); };
  const memberName = user?.email?.split('@')[0] || 'Member BIXLINK';

  return <div className="bixgo-grab fixed inset-0 z-[60] overflow-y-auto"><div className="mx-auto min-h-full max-w-xl">
    {!cfg.enabled && isAdmin && <p className="border-b border-accent/40 bg-accent/20 px-3 py-2 text-[11px]">Admin 1 preview · Under Reconstruction (only visible to you)</p>}
    {!sub && <div className="sticky top-0 z-10 flex items-center gap-2 overflow-x-auto border-b border-border bg-background/90 px-3 py-2 backdrop-blur">
      <span className="shrink-0 rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary">GLOBAL</span>
      <select aria-label="City" value={city} onChange={e => { setCity(e.target.value); const c = GLOBAL_CITIES.find(x => x.id === e.target.value); if (c) pickCur(c.cur); }} className="shrink-0 rounded-full border border-border bg-card px-2 py-1 text-[11px]">{GLOBAL_CITIES.map(c => <option key={c.id} value={c.id}>{c.city}, {c.country}</option>)}</select>
      <div className="flex shrink-0 gap-1">{GLOBAL_CURRENCIES.map(c => <button key={c.code} onClick={() => pickCur(c.code)} className={`rounded-full border px-2 py-1 text-[11px] ${cur === c.code ? 'border-primary bg-primary/15 font-bold' : 'border-border'}`}>{c.code}</button>)}</div>
    </div>}
    {sub === 'travel' && <BixgoTravel cur={cur} usdtIdr={cfg.usdtIdr} onBack={() => setSub(null)}/>}
    {sub === 'bills' && <BixgoBills onBack={() => setSub(null)}/>}
    {(sub === 'ride' || sub === 'car') && <BixgoRideBooking cfg={cfg} start={sub} onBack={() => setSub(null)} onBooked={o => persist([{ id: 'BG-' + Date.now().toString(36).toUpperCase(), at: new Date().toISOString(), svc: o.svc, from: o.from, to: o.to, total: o.total, pay: o.pay }, ...orders])}/>}
    {!sub && <>
    {view === 'home' && <BixgoHome enabled={enabledSet} balance="Open Wallet" onPick={pick} onSoon={soon}/>}
    {view === 'inbox' && <BixgoInbox/>}
    {view === 'account' && <BixgoAccount name={memberName} balance="View balance" onBack={() => go('home')} onSoon={soon}/>}
    {(view === 'order' || view === 'activity') && <main className="px-4 pb-6 pt-4">
    <section className="flex items-center gap-3">
      <button aria-label="Back" onClick={() => go('home')}><ArrowLeft className="h-6 w-6"/></button>
      <h1 className="flex-1 text-xl font-black">{view === 'activity' ? 'Aktivitas' : meta.name}</h1>
      <div className="flex gap-2">{(['order', 'history'] as const).map(t => <button key={t} onClick={() => go(t === 'order' ? 'order' : 'activity')} className={`rounded-full border px-3 py-1 text-[11px] ${tab === t ? 'border-primary bg-primary/15' : 'border-border'}`}>{t === 'order' ? 'Order' : `History (${orders.length})`}</button>)}</div>
    </section>


    {tab === 'history' ? <section className="mt-4 space-y-2">
      {!orders.length && <p className="rounded-2xl border border-border p-4 text-center text-xs text-muted-foreground">No demo orders yet.</p>}
      {orders.map(o => { const I = ICON[o.svc]; return <div key={o.id} className="rounded-2xl border border-border bg-card/80 p-3 text-xs">
        <div className="flex items-center justify-between"><span className="flex items-center gap-1 font-semibold"><I className="h-4 w-4 text-primary"/>{BIXGO_SERVICES.find(s => s.key === o.svc)?.name}</span><b>{idr(o.total)}</b></div>
        <p className="mt-1 text-muted-foreground">{o.from} → {o.to}</p>
        <p className="text-muted-foreground">{new Date(o.at).toLocaleString()} · {o.pay} · {o.id}{o.rating ? ` · ${'★'.repeat(o.rating)}` : ''}</p></div>; })}
      {orders.length > 0 && <Button variant="outline" className="w-full" onClick={() => persist([])}><History className="mr-1 h-4 w-4"/>Clear demo history</Button>}
    </section> : <>
    <div className="mt-4 grid grid-cols-5 gap-2">{list.map(s => { const I = ICON[s.key]; return <button key={s.key} disabled={step !== 'form'} onClick={() => { setSvc(s.key); setTier(0); setCart({}); }} className={`rounded-2xl border px-1 py-3 text-center transition disabled:opacity-50 ${svc === s.key ? 'border-primary bg-primary/15 shadow-[0_0_18px_-6px_var(--primary)]' : 'border-border bg-card/70'}`}>
      <I className="mx-auto h-5 w-5 text-primary"/><b className="mt-1 block text-[10px]">{s.name}</b></button>; })}</div>

    <section className="mt-4 rounded-3xl border border-border bg-card/80 p-4">
      <div className="relative h-40 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:22px_22px]"/>
        <svg viewBox="0 0 300 160" className="absolute inset-0 h-full w-full"><path d="M40 125 C 110 120, 120 40, 255 35" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="8 6"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="1s" repeatCount="indefinite"/></path></svg>
        <MapPin className="absolute left-[9%] top-[70%] h-5 w-5 text-primary"/><Navigation className="absolute right-[12%] top-[14%] h-5 w-5 text-accent"/>
        {step === 'track' && (() => { const I = ICON[svc]; return <I className="absolute h-6 w-6 rounded-full bg-primary p-1 text-primary-foreground transition-all duration-[2400ms]" style={{ left: `${pos}%`, top: `${70 - stage * 18}%` }}/>; })()}
        <span className="absolute bottom-2 right-2 rounded-full bg-card/90 px-2 py-0.5 text-[10px]">{km} km · ~{base.etaMin} min</span>
      </div>

      {step === 'form' && <>
        {shop && <div className="mt-3 space-y-2"><p className="text-xs font-semibold">{svc === 'food' ? 'Popular menu' : 'Daily essentials'}</p>
          {catalog.map(i => <div key={i.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
            <div><b>{i.name}</b><p className="text-muted-foreground">{i.store} · {idr(i.price)}</p></div>
            <div className="flex items-center gap-2"><button aria-label="Remove" onClick={() => add(i.id, -1)} className="rounded-full border border-border p-1"><Minus className="h-3 w-3"/></button><b className="w-4 text-center">{cart[i.id] ?? 0}</b><button aria-label="Add" onClick={() => add(i.id, 1)} className="rounded-full border border-primary p-1"><Plus className="h-3 w-3"/></button></div>
          </div>)}</div>}
        {(svc === 'ride' || svc === 'car') && <div className="mt-3 flex gap-2">{TIERS[svc].map(([n, m], i) => <button key={n} onClick={() => setTier(i)} className={`flex-1 rounded-xl border py-2 text-[11px] ${tier === i ? 'border-primary bg-primary/15' : 'border-border'}`}>{n}<span className="block text-muted-foreground">×{m}</span></button>)}</div>}
        {svc === 'send' && <div className="mt-3 flex gap-2">{SIZES.map(([n], i) => <button key={n} onClick={() => setSize(i)} className={`flex-1 rounded-xl border py-2 text-[11px] ${size === i ? 'border-primary bg-primary/15' : 'border-border'}`}>{n}</button>)}</div>}
        <label className="mt-3 block text-xs">{shop ? 'Store / pickup' : 'Pickup'}<input className="form-input mt-1" value={from} onChange={e => setFrom(e.target.value)} placeholder={shop ? (catalog[0]?.store ?? '') : 'Enter pickup address'}/></label>
        <label className="mt-2 block text-xs">{shop || svc === 'send' ? 'Delivery address' : 'Destination'}<input className="form-input mt-1" value={to} onChange={e => setTo(e.target.value)} placeholder="Enter destination"/></label>
        <label className="mt-2 block text-xs">Note for partner<input className="form-input mt-1" value={note} maxLength={120} onChange={e => setNote(e.target.value)} placeholder={svc === 'send' ? 'Recipient name & phone' : 'Optional'}/></label>
        <label className="mt-2 block text-xs">Estimated distance: <b>{km} km</b><input type="range" min={1} max={40} value={km} onChange={e => setKm(Number(e.target.value))} className="mt-1 w-full accent-[var(--primary)]"/></label>
        <div className="mt-3 flex gap-2">{[false, true].map(b => <button key={String(b)} onClick={() => setPayBix(b)} className={`flex-1 rounded-xl border py-2 text-xs ${payBix === b ? 'border-primary bg-primary/15' : 'border-border'}`}>{b ? `BIX · −${cfg.bixDiscountPct}%` : 'IDR / USDT'}</button>)}</div>
      </>}

      <div className="mt-3 space-y-1 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs">
        {shop && <div className="flex justify-between"><span>Items subtotal</span><span>{idr(subtotal)}</span></div>}
        <div className="flex justify-between"><span>{shop || svc === 'send' ? 'Delivery fee' : `${meta.name} fare`}</span><span>{idr(delivery)}</span></div>
        {shop && <div className="flex justify-between"><span>Service fee</span><span>{idr(service)}</span></div>}
        {payBix && <div className="flex justify-between text-primary"><span>BIX discount</span><span>−{idr(discount)}</span></div>}
        <div className="flex justify-between border-t border-border pt-1 text-sm"><b>Total</b><b>{idr(total)}</b></div>
        <div className="flex justify-between text-[11px] text-muted-foreground"><span>Crypto equivalent</span><span className="tabular-nums">{cryptoEquivalent(total, cfg.usdtIdr).usdt} USDT · {cryptoEquivalent(total, cfg.usdtIdr).bix} BIX</span></div>
        <div className="flex justify-between text-muted-foreground"><span>≈ USDT</span><span>{usdt} USDT</span></div>
      </div>

      {step === 'form' && <Button className="mt-3 w-full" disabled={!canOrder} onClick={() => setStep('search')}>{shop ? `Order ${meta.name}` : `Find ${meta.name} partner`}</Button>}
      {step === 'search' && <div className="mt-3 animate-pulse rounded-2xl border border-border p-3 text-center text-sm">Searching nearby partners…</div>}
      {step === 'track' && <div className="mt-3 rounded-2xl border border-primary/40 p-3 text-xs">
        <p className="text-sm font-semibold">{partner} · demo partner ★4.9</p>
        <ol className="mt-2 space-y-1">{STAGES[svc].map((s, i) => <li key={s} className={`flex items-center gap-2 ${i <= stage ? 'text-foreground' : 'text-muted-foreground'}`}><CheckCircle2 className={`h-4 w-4 ${i <= stage ? 'text-primary' : 'opacity-30'}`}/>{s}</li>)}</ol>
        <Button className="mt-2 w-full" disabled={stage < 3} onClick={finish}>{stage < 3 ? 'In progress…' : 'Complete & view receipt'}</Button>
        {stage < 3 && <Button variant="ghost" className="mt-1 w-full" onClick={reset}>Cancel order</Button>}
      </div>}
      {step === 'done' && <div className="mt-3 rounded-2xl border border-primary/40 p-3 text-xs">
        <p className="flex items-center gap-1 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary"/>Demo receipt · {orders[0]?.id}</p>
        <p className="mt-1">{meta.name} · {from} → {to}</p>
        {items.map(i => <p key={i.id}>{cart[i.id]}× {i.name}</p>)}
        <p>{km} km · {idr(total)} ({payBix ? 'BIX' : 'IDR/USDT'}) · partner {partner}</p>
        <div className="mt-2 flex items-center gap-1">Rate: {[1, 2, 3, 4, 5].map(r => <button key={r} aria-label={`${r} stars`} onClick={() => rate(r)}><Star className={`h-5 w-5 ${(orders[0]?.rating ?? 0) >= r ? 'fill-accent text-accent' : 'text-muted-foreground'}`}/></button>)}</div>
        <p className="mt-1 text-muted-foreground">Preview only — nothing was charged and no real partner was dispatched.</p>
        <Button variant="outline" className="mt-2 w-full" onClick={reset}>New order</Button></div>}
    </section></>}
    <p className="mt-4 text-center text-[10px] text-muted-foreground">BIXGO is in preview. Fares are estimates; no booking, payment or dispatch is performed.</p>
    </main>}
    <BixgoBottomNav view={view} setView={go} inbox={3}/>
    </>}
  </div></div>;
}
