import { lazy, Suspense, useEffect, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { ArrowLeft, Bike, CalendarClock, CarFront, CheckCircle2, Crosshair, Info, Loader2, MapPin, MoreHorizontal, Search, Store, Users } from 'lucide-react';
import { bixgoFare, franchiseFor, haversineKm, splitCommission, type BixgoSettings } from '@/lib/bixgo';
import { getDevicePosition, reverseGeocode, roadRoute, searchPlaces, type Place } from '@/lib/geo';

const BixgoLiveMap = lazy(() => import('@/components/BixgoLiveMap'));
const idr = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
type Opt = { name: string; svc: 'ride' | 'car'; mult: number; seats: number; tag?: string };
const OPTS: Opt[] = [
  { name: 'Car Standard', svc: 'car', mult: 1, seats: 4 },
  { name: 'Car Hemat', svc: 'car', mult: 0.95, seats: 4, tag: 'Hemat' },
  { name: 'Car Plus', svc: 'car', mult: 1.22, seats: 6 },
  { name: 'Bike Standard', svc: 'ride', mult: 1, seats: 1 },
  { name: 'Bike Hemat', svc: 'ride', mult: 0.9, seats: 1, tag: 'Hemat' },
];
const PAYS = ['QRIS', 'BIX PAY', 'Tunai'];

/** Pickup + vehicle selection on a real map with device GPS and real road distance. Booking itself is still a preview: no driver dispatch or payment. */
export function BixgoRideBooking({ cfg, start, onBack, onBooked }: { cfg: BixgoSettings; start: 'ride' | 'car'; onBack: () => void; onBooked: (o: { svc: 'ride' | 'car'; from: string; to: string; total: number; pay: string; name: string }) => void }) {
  const [stage, setStage] = useState<'pickup' | 'choose' | 'booked'>('pickup');
  const [active, setActive] = useState<'from' | 'to'>('from');
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [route, setRoute] = useState<{ km: number; min: number | null; path: [number, number][] | null; road: boolean } | null>(null);
  const [sel, setSel] = useState(OPTS.findIndex(o => o.svc === start));
  const [pay, setPay] = useState(0);

  const locate = async () => {
    setBusy('gps'); setErr('');
    try { const p = await getDevicePosition(); setFrom(await reverseGeocode(p.lat, p.lng)); setActive('to'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'GPS gagal'); } finally { setBusy(null); }
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
    try { const r = await searchPlaces(q, from ?? undefined); setResults(r); if (!r.length) setErr('Alamat tidak ditemukan. Coba nama jalan + kota.'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Pencarian gagal'); } finally { setBusy(null); }
  };
  const choose = (p: Place) => { if (active === 'from') { setFrom(p); setActive('to'); } else setTo(p); setResults([]); setQ(''); };
  const tapMap = async (p: { lat: number; lng: number }) => { setBusy('rev'); const place = await reverseGeocode(p.lat, p.lng); setBusy(null); if (active === 'from') setFrom(place); else setTo(place); };

  const km = route?.km ?? 0;
  const branch = from ? franchiseFor(cfg, from) : null;
  const price = (o: Opt) => { const base = bixgoFare(cfg, o.svc, km).idr * o.mult; const disc = pay === 1 ? base * cfg.bixDiscountPct / 100 : 0; return { base, final: base - disc }; };
  const eta = (o: Opt) => route?.min != null ? Math.round(route.min * (o.svc === 'ride' ? 0.85 : 1)) : bixgoFare(cfg, o.svc, km).etaMin;
  const cur = OPTS[sel]!;
  const commission = Math.round(price(cur).final * cfg.commissionPct / 100);
  const split = splitCommission(branch, commission);

  return <div className="relative min-h-[100dvh] pb-40">
    <div className={`relative overflow-hidden bg-card ${stage === 'pickup' ? 'h-[55dvh]' : 'h-[36dvh]'} transition-all`}>
      <ClientOnly fallback={<div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Memuat peta…</div>}>
        <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Memuat peta…</div>}>
          <BixgoLiveMap from={from} to={to} active={active} path={route?.path ?? null} onPick={p => void tapMap(p)}/>
        </Suspense>
      </ClientOnly>
      <header className="absolute inset-x-3 top-3 z-[500] flex items-center gap-2">
        <button aria-label="Kembali" onClick={stage === 'pickup' ? onBack : () => setStage('pickup')} className="grid h-11 w-11 place-items-center rounded-full bg-background shadow-lg"><ArrowLeft className="h-5 w-5"/></button>
        {stage === 'pickup' && <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex flex-1 items-center gap-2 rounded-full bg-background px-4 py-2.5 shadow-lg">
          <span className={`h-3 w-3 rounded-full border-[3px] ${active === 'from' ? 'border-primary' : 'border-destructive'}`}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={active === 'from' ? 'Cari titik jemput…' : 'Mau ke mana?'} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
          <button aria-label="Cari">{busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4 text-muted-foreground"/>}</button>
        </form>}
      </header>
      {results.length > 0 && <div className="absolute inset-x-3 top-16 z-[500] max-h-60 overflow-y-auto rounded-2xl bg-background shadow-xl">{results.map(r => <button key={`${r.lat},${r.lng}`} onClick={() => choose(r)} className="flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left"><MapPin className="mt-0.5 h-4 w-4 text-primary"/><span><b className="block text-sm">{r.name}</b><span className="text-[11px] text-muted-foreground">{r.detail}</span></span></button>)}</div>}
      {route && <span className="absolute left-1/2 top-16 z-[400] -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-[11px] font-bold shadow">{route.min != null ? `${route.min} mnt · ` : ''}{km.toFixed(1)} km{route.road ? '' : ' (perkiraan)'}</span>}
      <button aria-label="Lokasi saya" onClick={() => void locate()} className="absolute bottom-6 right-3 z-[500] grid h-11 w-11 place-items-center rounded-full bg-background shadow-lg">{busy === 'gps' ? <Loader2 className="h-5 w-5 animate-spin"/> : <Crosshair className="h-5 w-5 text-primary"/>}</button>
    </div>

    {stage === 'pickup' && <section className="relative z-[500] -mt-4 rounded-t-3xl bg-background px-4 pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted"/>
      {err && <p className="mb-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">{err}</p>}
      {(['from', 'to'] as const).map(k => { const p = k === 'from' ? from : to; return <button key={k} onClick={() => setActive(k)} className={`mb-2 flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left ${active === k ? 'border-primary bg-primary/5' : 'border-border'}`}>
        <MapPin className={`mt-0.5 h-5 w-5 ${k === 'from' ? 'text-primary' : 'text-destructive'}`}/>
        <span className="min-w-0 flex-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">{k === 'from' ? 'Jemput' : 'Tujuan'}</span><b className="block truncate text-sm">{p?.name ?? (k === 'from' ? 'Mendeteksi GPS…' : 'Cari alamat atau ketuk peta')}</b>{p && <span className="block truncate text-xs text-muted-foreground">{p.detail}</span>}</span>
      </button>; })}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Store className="h-3.5 w-3.5"/>{branch ? `Dilayani BIXGO ${branch.city}${branch.partner ? ' · ' + branch.partner : ''}` : 'Belum ada cabang franchise di area ini'}</p>
      <button disabled={!from || !to || busy === 'route'} onClick={() => setStage('choose')} className="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-40">{busy === 'route' ? 'Menghitung rute…' : 'Lanjut pilih kendaraan'}</button>
    </section>}

    {stage === 'choose' && <section className="relative z-[500] -mt-4 rounded-t-3xl bg-background px-3 pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted"/>
      <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{from?.name} → {to?.name} · {km.toFixed(1)} km</p>
      {OPTS.filter(o => cfg.services[o.svc].enabled).map(o => { const i = OPTS.indexOf(o); const p = price(o); const I = o.svc === 'car' ? CarFront : Bike; const on = i === sel; return <button key={o.name} onClick={() => setSel(i)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
        <span className={`grid place-items-center rounded-2xl bg-card ${on ? 'h-16 w-20' : 'h-12 w-14'}`}><I className={`${on ? 'h-10 w-10' : 'h-7 w-7'} text-primary`}/></span>
        <span className="flex-1"><b className="block text-sm">{o.name}</b><span className="flex items-center gap-1 text-xs text-muted-foreground">±{eta(o)} mnt • <Users className="h-3 w-3"/>{o.seats}</span>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${on ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border'}`}>{o.svc === 'car' ? `${o.seats} kursi` : 'Bike'}{on && <Info className="h-3 w-3"/>}</span></span>
        <span className="text-right"><b className={`block text-sm ${p.final < p.base ? 'text-primary' : ''}`}>{idr(p.final)}</b>{p.final < p.base && <s className="text-[11px] text-muted-foreground">{idr(p.base)}</s>}{o.tag && <span className="block text-[10px] text-primary">{o.tag}</span>}</span>
      </button>; })}
      <div className="mt-2 rounded-2xl border border-border p-3 text-[11px] text-muted-foreground">
        <b className="text-foreground">Pembagian komisi {cfg.commissionPct}% ({idr(commission)})</b>
        <p>{branch ? `Franchise ${branch.city} ${idr(split.franchise)} · Pusat ${idr(split.platform)} · Pool ${idr(split.pool)}` : `Pusat BIXGO ${idr(split.platform)} (tanpa cabang)`}</p>
      </div>
    </section>}

    {stage === 'booked' && <section className="relative z-[500] -mt-4 rounded-t-3xl bg-background px-4 pt-5 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-primary"/><h2 className="mt-2 text-lg font-black">Pesanan demo dibuat</h2>
      <p className="text-sm text-muted-foreground">{cur.name} · {from?.name} → {to?.name}</p><p className="mt-1 text-xl font-black">{idr(price(cur).final)}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">Lokasi & jarak asli, tetapi pemesanan masih pratinjau — belum ada pengemudi yang dikirim dan tidak ada pembayaran.</p>
      <button onClick={onBack} className="mt-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">Kembali ke Beranda</button>
    </section>}

    {stage === 'choose' && <footer className="fixed inset-x-0 bottom-0 z-[600] mx-auto max-w-xl border-t border-border bg-background px-3 pb-4 pt-2">
      <div className="flex items-center gap-2 border-b border-border pb-2 text-sm">
        <button onClick={() => setPay(p => (p + 1) % PAYS.length)} className="flex flex-1 items-center gap-2 font-bold"><span className="rounded-md bg-foreground px-1.5 text-[10px] text-background">{PAYS[pay]}</span>{PAYS[pay]}{pay === 1 && <span className="text-[10px] text-primary">−{cfg.bixDiscountPct}%</span>}</button>
        <MoreHorizontal className="ml-2 h-5 w-5"/>
      </div>
      <div className="mt-2 flex gap-2">
        <button aria-label="Jadwalkan" className="grid h-12 w-14 place-items-center rounded-full bg-card"><CalendarClock className="h-5 w-5"/></button>
        <button onClick={() => { onBooked({ svc: cur.svc, from: from?.name ?? '', to: to?.name ?? '', total: Math.round(price(cur).final), pay: PAYS[pay]!, name: cur.name }); setStage('booked'); }} className="flex-1 rounded-full bg-primary py-3 text-base font-bold text-primary-foreground">Pesan {cur.name}</button>
      </div>
    </footer>}
  </div>;
}
