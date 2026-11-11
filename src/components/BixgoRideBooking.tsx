import { lazy, Suspense, useEffect, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { ArrowLeft, CalendarClock, CheckCircle2, Crosshair, Info, Loader2, MapPin, MoreHorizontal, Search, Store, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BixgoVehicleIcon, vehicleKind } from '@/components/BixgoVehicleIcon';
import { BixgoRadar } from '@/components/BixgoRadar';
import { formatMoney, cryptoEquivalent, type GlobalCurrency } from '@/lib/bixgo-global';
import { bixgoFare, cityFare, franchiseFor, haversineKm, splitCommission, type BixgoSettings } from '@/lib/bixgo';
import { getDevicePosition, reverseGeocode, roadRoute, searchPlaces, type Place } from '@/lib/geo';

const BixgoLiveMap = lazy(() => import('@/components/BixgoLiveMap'));
type Opt = { name: string; svc: 'ride' | 'car'; mult: number; seats: number; tag?: string };
const OPTS: Opt[] = [
  { name: 'BIX Urban', svc: 'car', mult: 1, seats: 4 },
  { name: 'BIX Executive', svc: 'car', mult: 1.6, seats: 6, tag: 'Innova Zenix · Premium' },
  { name: 'BIX Black', svc: 'car', mult: 3.5, seats: 6, tag: 'Alphard · Camry · EV · VIP' },
  { name: 'BIX Moto', svc: 'ride', mult: 1, seats: 1 },
  { name: 'BIX Moto Saver', svc: 'ride', mult: 0.9, seats: 1, tag: 'Saver' },
];
const LANDMARKS: Place[] = [
  { name: 'Lombok Epicentrum Mall', detail: 'Jl. Sriwijaya, Mataram', lat: -8.5913, lng: 116.1063 },
  { name: 'Mataram Mall', detail: 'Cakranegara, Mataram', lat: -8.5853, lng: 116.1176 },
  { name: 'Kuliner Rembiga', detail: 'Rembiga, Mataram', lat: -8.5617, lng: 116.0985 },
  { name: 'Kota Tua Ampenan', detail: 'Ampenan, Mataram', lat: -8.5700, lng: 116.0730 },
  { name: 'Pantai Senggigi', detail: 'Batu Layar, Lombok Barat', lat: -8.4897, lng: 116.0424 },
  { name: 'Bandara Lombok (LOP)', detail: 'Praya, Lombok Tengah', lat: -8.7573, lng: 116.2766 },
];
const PAYS = ['USDT', 'BIX Token', 'Cash', 'QRIS', 'Bank'];

/** Pickup + vehicle selection on a real map with device GPS and real road distance. Booking itself is still a preview: no driver dispatch or payment. */
export function BixgoRideBooking({ cfg, start, onBack, onBooked, cur: money = 'USD', city = '' }: { cfg: BixgoSettings; cur?: GlobalCurrency; city?: string; start: 'ride' | 'car'; onBack: () => void; onBooked: (o: { svc: 'ride' | 'car'; from: string; to: string; total: number; pay: string; name: string }) => void }) {
  const [stage, setStage] = useState<'pickup' | 'choose' | 'booked'>('pickup');
  const [bid, setBid] = useState<string | null>(null);
  const [active, setActive] = useState<'from' | 'to'>('from');
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [landmark, setLandmark] = useState('');
  const [route, setRoute] = useState<{ km: number; min: number | null; path: [number, number][] | null; road: boolean } | null>(null);
  const [sel, setSel] = useState(OPTS.findIndex(o => o.svc === start));
  const [pay, setPay] = useState(0);
  const idr = (n: number) => formatMoney(n, money, cfg.usdtIdr);
  const [ref, setRef] = useState('');

  const locate = async () => {
    setBusy('gps'); setErr('');
    try { const p = await getDevicePosition(); setFrom(await reverseGeocode(p.lat, p.lng)); setActive('to'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'GPS failed'); } finally { setBusy(null); }
  };
  useEffect(() => { void locate(); }, []);
  useEffect(() => {
    if (!from || !to) { setRoute(null); return; }
    let live = true; setBusy('route');
    roadRoute(from, to, haversineKm(from, to)).then(r => { if (live) setRoute(r); }).finally(() => live && setBusy(null));
    return () => { live = false; };
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  const search = async () => {
    setBusy('search'); setErr('');
    try { const r = await searchPlaces(q, from ?? undefined); setResults(r); if (!r.length) setErr('Address not found. Try street name + city.'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Search failed'); } finally { setBusy(null); }
  };
  const choose = (p: Place) => { if (active === 'from') { setFrom(p); setActive('to'); } else setTo(p); setResults([]); setQ(''); };
  const tapMap = async (p: { lat: number; lng: number }) => { setBusy('rev'); const place = await reverseGeocode(p.lat, p.lng); setBusy(null); if (active === 'from') setFrom(place); else setTo(place); };

  const km = route?.km ?? 0;
  const branch = from ? franchiseFor(cfg, from) : null;
  const price = (o: Opt) => { const base = cityFare(cfg, city, bixgoFare(cfg, o.svc, km).idr * o.mult); const disc = pay === 1 ? base * cfg.bixDiscountPct / 100 : 0; return { base, final: base - disc }; };
  const eta = (o: Opt) => route?.min != null ? Math.round(route.min * (o.svc === 'ride' ? 0.85 : 1)) : bixgoFare(cfg, o.svc, km).etaMin;
  const cur = OPTS[sel]!;
  const commission = Math.round(price(cur).final * cfg.commissionPct / 100);
  const split = splitCommission(branch, commission);

  return <div className="relative min-h-[100dvh] pb-40">
    <div className={`relative overflow-hidden bg-card ${stage === 'pickup' ? 'h-[55dvh]' : 'h-[36dvh]'} transition-all`}>
      <ClientOnly fallback={<div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Loading map…</div>}>
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Loading map…</div>}>
          <BixgoLiveMap from={from} to={to} active={active} path={route?.path ?? null} onPick={p => void tapMap(p)}/>
        </Suspense>
      </ClientOnly>
      <header className="absolute inset-x-3 top-3 z-[500] flex items-center gap-2">
        <button aria-label="Back" onClick={stage === 'pickup' ? onBack : () => setStage('pickup')} className="grid h-11 w-11 place-items-center rounded-full bg-background shadow-lg"><ArrowLeft className="h-5 w-5"/></button>
        {stage === 'pickup' && <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex flex-1 items-center gap-2 rounded-full bg-background px-4 py-2.5 shadow-lg">
          <span className={`h-3 w-3 rounded-full border-[3px] ${active === 'from' ? 'border-primary' : 'border-destructive'}`}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={active === 'from' ? 'Search pickup point…' : 'Where to?'} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
          <button aria-label="Search">{busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4 text-muted-foreground"/>}</button>
        </form>}
      </header>
      {results.length > 0 && <div className="absolute inset-x-3 top-16 z-[500] max-h-60 overflow-y-auto rounded-2xl bg-background shadow-xl">{results.map(r => <button key={`${r.lat},${r.lng}`} onClick={() => choose(r)} className="flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left"><MapPin className="mt-0.5 h-4 w-4 text-primary"/><span><b className="block text-sm">{r.name}</b><span className="text-[11px] text-muted-foreground">{r.detail}</span></span></button>)}</div>}
      {route && <span className="absolute left-1/2 top-16 z-[400] -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-[11px] font-bold shadow">{route.min != null ? `${route.min} min · ` : ''}{km.toFixed(1)} km{route.road ? '' : ' (estimate)'}</span>}
      <button aria-label="My location" onClick={() => void locate()} className="absolute bottom-6 right-3 z-[500] grid h-11 w-11 place-items-center rounded-full bg-background shadow-lg">{busy === 'gps' ? <Loader2 className="h-5 w-5 animate-spin"/> : <Crosshair className="h-5 w-5 text-primary"/>}</button>
    </div>

    {stage === 'pickup' && <section className="relative z-[500] -mt-4 rounded-t-3xl bg-background px-4 pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted"/>
      {err && <p className="mb-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">{err}</p>}
      {city.startsWith('mataram') || city.startsWith('lombok') || !city ? <div className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">{LANDMARKS.map(l => <button key={l.name} onClick={() => choose(l)} className="bixgo-landmark shrink-0 rounded-full border border-primary/40 bg-card px-3 py-1.5 text-[11px] font-semibold active:scale-95">📍 {l.name}</button>)}</div> : null}
      {(['from', 'to'] as const).map(k => { const p = k === 'from' ? from : to; return <button key={k} onClick={() => setActive(k)} className={`mb-2 flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left ${active === k ? 'border-primary bg-primary/5' : 'border-border'}`}>
        <MapPin className={`mt-0.5 h-5 w-5 ${k === 'from' ? 'text-primary' : 'text-destructive'}`}/>
        <span className="min-w-0 flex-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">{k === 'from' ? 'Pickup' : 'Destination'}</span><b className="block truncate text-sm">{p?.name ?? (k === 'from' ? 'Detecting GPS…' : 'Search an address or tap the map')}</b>{p && <span className="block truncate text-xs text-muted-foreground">{p.detail}</span>}</span>
      </button>; })}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Store className="h-3.5 w-3.5"/>{branch ? `Served by BIXGO ${branch.city}${branch.partner ? ' · ' + branch.partner : ''}` : 'No city franchise in this area yet'}</p>
      <button disabled={!from || !to || busy === 'route'} onClick={() => setStage('choose')} className="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-40">{busy === 'route' ? 'Calculating route…' : 'Continue to select vehicle'}</button>
    </section>}

    {stage === 'choose' && <section className="relative z-[500] -mt-4 rounded-t-3xl bg-background px-3 pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted"/>
      <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{from?.name} → {to?.name} · {km.toFixed(1)} km</p>
      {OPTS.filter(o => cfg.services[o.svc].enabled).map(o => { const i = OPTS.indexOf(o); const p = price(o); const vk = vehicleKind(o.name); const on = i === sel; return <button key={o.name} onClick={() => setSel(i)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
        <span className={`bixgo-veh-tile grid shrink-0 place-items-center rounded-2xl transition-all ${vk === 'black' ? 'is-vip' : ''} ${on ? 'h-16 w-20' : 'h-12 w-16'}`}><BixgoVehicleIcon kind={vk} className={on ? 'w-16' : 'w-12'}/></span>
        <span className="flex-1"><b className="block text-sm">{o.name}</b><span className="flex items-center gap-1 text-xs text-muted-foreground">±{eta(o)} min • <Users className="h-3 w-3"/>{o.seats}</span>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${on ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border'}`}>{o.svc === 'car' ? `${o.seats} seats` : 'Bike'}{on && <Info className="h-3 w-3"/>}</span></span>
        <span className="text-right"><b className={`block text-sm ${p.final < p.base ? 'text-primary' : ''}`}>{idr(p.final)}</b>{p.final < p.base && <s className="text-[11px] text-muted-foreground">{idr(p.base)}</s>}{o.tag && <span className="block text-[10px] text-primary">{o.tag}</span>}</span>
      </button>; })}
      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">{['Vetted Executive Drivers', 'Real-time GPS Route', 'USDT / BIX Settlement'].map(b => <span key={b} className="rounded-full border border-primary/40 px-2 py-0.5 text-primary">✓ {b}</span>)}</div>
      <div className="mt-2 rounded-2xl border border-border p-3 text-[11px] text-muted-foreground">
        <b className="text-foreground">Commission split {cfg.commissionPct}% ({idr(commission)})</b>
        <p>{branch ? `Franchise ${branch.city} ${idr(split.franchise)} · Center ${idr(split.platform)} · Pool ${idr(split.pool)}` : `BIXGO Center ${idr(split.platform)} (no branch)`}</p>
      </div>
    </section>}

    {stage === 'booked' && <section className={`relative z-[500] -mt-4 rounded-t-3xl px-4 pb-6 pt-5 text-center ${bid ? 'bixgo-sheet' : 'bg-background'}`}>
      {bid ? <BixgoRadar bookingId={bid} summary={{ from: from?.name ?? '', to: to?.name ?? '', fare: idr(price(cur).final), pay: PAYS[pay]!, kind: vehicleKind(cur.name) }} onRetry={() => { setBid(null); setStage('choose'); }} onSwitch={() => { setBid(null); setStage('choose'); }} onClose={onBack}/> : <><CheckCircle2 className="mx-auto h-12 w-12 text-primary"/><h2 className="mt-2 text-lg font-black">{ref ? `Booking request #${ref} sent` : 'Demo booking created'}</h2>
      <p className="text-sm text-muted-foreground">{cur.name} · {from?.name} → {to?.name}</p><p className="mt-1 text-xl font-black">{idr(price(cur).final)}</p><p className="text-[11px] text-muted-foreground tabular-nums">≈ {cryptoEquivalent(price(cur).final, cfg.usdtIdr).usdt} USDT · {cryptoEquivalent(price(cur).final, cfg.usdtIdr).bix} BIX</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{ref ? (pay === 0 ? 'When a driver accepts, the fare is held from your USDT wallet and settled on completion.' : pay === 1 ? 'When a driver accepts, the BIX fare (with your discount) is held from your BIX balance and settled on completion.' : pay === 2 ? 'Pay the driver in cash. The final fare may differ slightly based on the driver’s own rate.' : pay === 3 ? 'When a driver accepts, their QR appears on your trip screen. Scan it, then tap “I\'ve paid”.' : 'When a driver accepts, their bank account appears on your trip screen. Transfer, then tap “I\'ve paid”.') : 'Sign in to send a real request to the operator. Nothing was charged.'}</p>
      <button onClick={onBack} className="mt-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">Back to Home</button></>}
    </section>}

    {stage === 'choose' && <footer className="fixed inset-x-0 bottom-0 z-[600] mx-auto max-w-xl border-t border-border bg-background px-3 pb-4 pt-2">
      <div className="flex items-center gap-2 border-b border-border pb-2 text-sm">
        <button onClick={() => setPay(p => (p + 1) % PAYS.length)} className="flex flex-1 items-center gap-2 font-bold"><span className="rounded-md bg-foreground px-1.5 text-[10px] text-background">{PAYS[pay]}</span>{PAYS[pay]}{pay === 1 && <span className="text-[10px] text-primary">−{cfg.bixDiscountPct}%</span>}</button>
        <MoreHorizontal className="ml-2 h-5 w-5"/>
      </div>
      <input value={landmark} maxLength={120} onChange={e => setLandmark(e.target.value)} placeholder="Pickup landmark (e.g. in front of the black gate)" className="mt-2 w-full rounded-full border border-border bg-card px-4 py-2 text-xs outline-none"/>
      <div className="mt-2 flex gap-2">
        <button aria-label="Schedule" className="grid h-12 w-14 place-items-center rounded-full bg-card"><CalendarClock className="h-5 w-5"/></button>
        <button disabled={busy === 'book'} onClick={async () => { const total = Math.round(price(cur).final); setBusy('book'); const { data: u } = await supabase.auth.getUser(); if (u.user) { const { data, error } = await supabase.from('bixgo_bookings').insert({ city, service: cur.svc, vehicle: cur.name, pickup: (from?.name ?? '').slice(0, 200), dropoff: (to?.name ?? '').slice(0, 200), km: +km.toFixed(2), total_idr: total, pay_method: PAYS[pay]!, pickup_note: landmark.trim().slice(0, 120), pickup_lat: from?.lat ?? null, pickup_lng: from?.lng ?? null, dropoff_lat: to?.lat ?? null, dropoff_lng: to?.lng ?? null }).select('id').single(); if (error) { setErr(error.message); setBusy(null); return; } setRef(data.id.slice(0, 8).toUpperCase()); setBid(data.id); } setBusy(null); onBooked({ svc: cur.svc, from: from?.name ?? '', to: to?.name ?? '', total, pay: PAYS[pay]!, name: cur.name }); setStage('booked'); }} className="flex-1 rounded-full bg-primary py-3 text-base font-bold text-primary-foreground">Book {cur.name}</button>
      </div>
    </footer>}
  </div>;
}
