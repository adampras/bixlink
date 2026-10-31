import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePublicConfig } from '@/lib/useMember';
import { BIXGO_SERVICES, bixgoFare, readBixgo, type BixgoService, type BixgoSettings } from '@/lib/bixgo';
import { Bike, Car, CheckCircle2, Construction, MapPin, Navigation, Package, ShoppingBasket, UtensilsCrossed } from 'lucide-react';

export const Route = createFileRoute('/bixgo')({
  head: () => ({ meta: [
    { title: 'BIXGO — Rides, Food & Courier | BIXLINK' },
    { name: 'description', content: 'BIXGO super-app preview: BIXRide, BIXCar, BIXFood, BIXSend and BIXMart with fare estimates in IDR, USDT and BIX.' },
    { property: 'og:title', content: 'BIXGO — BIXLINK super-app' },
    { property: 'og:description', content: 'Ride, car, food, courier and grocery fare estimates inside the BIXLINK ecosystem.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: BixgoPage,
});

const ICON = { ride: Bike, car: Car, food: UtensilsCrossed, send: Package, mart: ShoppingBasket } as const;
const idr = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
type Step = 'form' | 'search' | 'found' | 'done';

function BixgoPage() {
  const [cfg, setCfg] = useState<BixgoSettings | null>(null);
  const isAdmin = usePublicConfig().data?.isAdmin === true;
  const [svc, setSvc] = useState<BixgoService>('ride');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [km, setKm] = useState(5);
  const [payBix, setPayBix] = useState(false);
  const [step, setStep] = useState<Step>('form');
  useEffect(() => { void supabase.from('app_settings').select('value').eq('key', 'bixgo').maybeSingle().then(({ data }) => setCfg(readBixgo(data?.value))); }, []);
  const list = useMemo(() => cfg ? BIXGO_SERVICES.filter(s => cfg.services[s.key].enabled) : [], [cfg]);
  useEffect(() => { if (list.length && !list.some(s => s.key === svc)) setSvc(list[0]!.key); }, [list, svc]);
  useEffect(() => { if (step !== 'search') return; const t = setTimeout(() => setStep('found'), 2200); return () => clearTimeout(t); }, [step]);

  if (!cfg) return <BixShell><main className="px-5 py-16 text-center text-sm text-muted-foreground">Loading BIXGO…</main></BixShell>;
  if (!cfg.enabled && !isAdmin) return <BixShell><main className="mx-auto max-w-xl px-5 py-16"><section className="rounded-3xl border border-primary/30 bg-card/80 p-6 text-center">
    <Construction className="mx-auto h-10 w-10 text-primary"/><p className="mt-3 text-xs uppercase tracking-[0.3em] text-primary">BIXGO</p>
    <h1 className="mt-1 font-display text-2xl font-bold">Under Reconstruction</h1>
    <p className="mt-2 text-sm text-muted-foreground">{cfg.notice || 'BIXGO rides, food and courier services are being prepared. Please check back soon.'}</p>
    <Button asChild className="mt-5"><Link to="/dashboard">Back to dashboard</Link></Button></section></main></BixShell>;

  const fare = bixgoFare(cfg, svc, km, payBix);
  const meta = BIXGO_SERVICES.find(s => s.key === svc)!;
  const isDelivery = svc === 'food' || svc === 'mart' || svc === 'send';
  return <BixShell><main className="mx-auto max-w-xl px-4 pb-24 pt-5">
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/80 p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"/>
      <p className="text-[10px] uppercase tracking-[0.35em] text-primary">BIXLINK super-app</p>
      <h1 className="font-display text-3xl font-black">BIX<span className="text-primary">GO</span></h1>
      <p className="mt-1 text-xs text-muted-foreground">Rides, food, courier and groceries — pay in IDR, USDT or BIX.</p>
    </section>

    <div className="mt-4 grid grid-cols-5 gap-2">{list.map(s => { const I = ICON[s.key]; return <button key={s.key} onClick={() => { setSvc(s.key); setStep('form'); }} className={`rounded-2xl border px-1 py-3 text-center transition ${svc === s.key ? 'border-primary bg-primary/15 shadow-[0_0_18px_-6px_var(--primary)]' : 'border-border bg-card/70'}`}>
      <I className="mx-auto h-5 w-5 text-primary"/><b className="mt-1 block text-[10px]">{s.name}</b></button>; })}</div>

    <section className="mt-4 rounded-3xl border border-border bg-card/80 p-4">
      <div className="relative h-40 overflow-hidden rounded-2xl border border-border bg-background">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:22px_22px]"/>
        <svg viewBox="0 0 300 160" className="absolute inset-0 h-full w-full"><path d="M40 125 C 110 120, 120 40, 255 35" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="8 6"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="1s" repeatCount="indefinite"/></path></svg>
        <MapPin className="absolute left-[9%] top-[70%] h-5 w-5 text-primary"/><Navigation className="absolute right-[12%] top-[14%] h-5 w-5 text-accent"/>
        <span className="absolute bottom-2 right-2 rounded-full bg-card/90 px-2 py-0.5 text-[10px]">{km} km · ~{fare.etaMin} min</span>
      </div>
      <label className="mt-3 block text-xs">{isDelivery ? 'Pickup / store' : 'Pickup'}<input className="form-input mt-1" value={from} onChange={e => setFrom(e.target.value)} placeholder="Enter pickup address"/></label>
      <label className="mt-2 block text-xs">Destination<input className="form-input mt-1" value={to} onChange={e => setTo(e.target.value)} placeholder="Enter destination"/></label>
      <label className="mt-2 block text-xs">Estimated distance: <b>{km} km</b><input type="range" min={1} max={40} value={km} onChange={e => setKm(Number(e.target.value))} className="mt-1 w-full accent-[var(--primary)]"/></label>
      <div className="mt-3 flex gap-2">{[false, true].map(b => <button key={String(b)} onClick={() => setPayBix(b)} className={`flex-1 rounded-xl border py-2 text-xs ${payBix === b ? 'border-primary bg-primary/15' : 'border-border'}`}>{b ? `BIX · −${cfg.bixDiscountPct}%` : 'IDR / USDT'}</button>)}</div>
      <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
        <div className="flex justify-between"><span>{meta.name} fare</span><b>{idr(fare.payIdr)}</b></div>
        {payBix && <div className="flex justify-between text-xs text-muted-foreground"><span>Before BIX discount</span><s>{idr(fare.idr)}</s></div>}
        <div className="flex justify-between text-xs text-muted-foreground"><span>≈ USDT</span><span>{fare.usdt} USDT</span></div>
      </div>
      {step === 'form' && <Button className="mt-3 w-full" disabled={!from.trim() || !to.trim()} onClick={() => setStep('search')}>Find {meta.name} partner</Button>}
      {step === 'search' && <div className="mt-3 animate-pulse rounded-2xl border border-border p-3 text-center text-sm">Searching nearby partners…</div>}
      {step === 'found' && <div className="mt-3 rounded-2xl border border-primary/40 p-3 text-sm"><p className="font-semibold">Demo partner found · ETA {Math.max(2, Math.round(fare.etaMin / 3))} min</p><p className="text-xs text-muted-foreground">Partner network is in preview — no real driver is dispatched yet.</p><Button className="mt-2 w-full" onClick={() => setStep('done')}>Show demo receipt</Button></div>}
      {step === 'done' && <div className="mt-3 rounded-2xl border border-primary/40 p-3 text-xs"><p className="flex items-center gap-1 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary"/>Demo receipt</p>
        <p className="mt-1">{meta.name} · {from} → {to}</p><p>{km} km · {idr(fare.payIdr)} ({payBix ? 'BIX' : 'IDR/USDT'})</p><p className="mt-1 text-muted-foreground">Preview only — nothing was charged.</p>
        <Button variant="outline" className="mt-2 w-full" onClick={() => { setStep('form'); setFrom(''); setTo(''); }}>New order</Button></div>}
    </section>
    <p className="mt-4 text-center text-[10px] text-muted-foreground">BIXGO is in preview. Fares are estimates; no booking, payment or dispatch is performed.</p>
  </main></BixShell>;
}
