import { useState } from 'react';
import { ArrowLeft, Bike, CalendarClock, Camera, CarFront, CheckCircle2, Crosshair, Info, MapPin, MoreHorizontal, Users, X } from 'lucide-react';
import { bixgoFare, type BixgoSettings } from '@/lib/bixgo';

const idr = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');
type Opt = { name: string; svc: 'ride' | 'car'; mult: number; eta: number; seats: number; promo?: number; tag?: string };
const OPTS: Opt[] = [
  { name: 'Car Standard', svc: 'car', mult: 1, eta: 4, seats: 4, promo: 6.4 },
  { name: 'Car Hemat', svc: 'car', mult: 0.95, eta: 7, seats: 4, tag: 'Hemat' },
  { name: 'Car Plus', svc: 'car', mult: 1.22, eta: 7, seats: 6, promo: 5.2 },
  { name: 'Bike Standard', svc: 'ride', mult: 1, eta: 2, seats: 1 },
  { name: 'Bike Hemat', svc: 'ride', mult: 0.9, eta: 5, seats: 1, tag: 'Hemat' },
];
const PAYS = ['QRIS', 'BIX PAY', 'Tunai'];

/** Demo pickup + vehicle selection modeled on the reference flow. No booking or payment happens. */
export function BixgoRideBooking({ cfg, start, onBack, onBooked }: { cfg: BixgoSettings; start: 'ride' | 'car'; onBack: () => void; onBooked: (o: { svc: 'ride' | 'car'; from: string; to: string; total: number; pay: string; name: string }) => void }) {
  const [stage, setStage] = useState<'pickup' | 'choose' | 'booked'>('pickup');
  const [from, setFrom] = useState('Titik saya saat ini');
  const [to, setTo] = useState('');
  const [sel, setSel] = useState(OPTS.findIndex(o => o.svc === start));
  const [pay, setPay] = useState(0);
  const [toastOn, setToastOn] = useState(true);
  const km = 16.5;
  const price = (o: Opt) => { const base = bixgoFare(cfg, o.svc, km).idr * o.mult; const disc = pay === 1 ? base * cfg.bixDiscountPct / 100 : 0; return { base, final: base - disc - (o.promo ? base * o.promo / 100 : 0) }; };
  const cur = OPTS[sel]!;

  return <div className="relative min-h-[100dvh] pb-40">
    {/* Map */}
    <div className={`relative overflow-hidden bg-card ${stage === 'pickup' ? 'h-[62dvh]' : 'h-[34dvh]'} transition-all`}>
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:38px_38px]"/>
      <div className="absolute left-[28%] top-0 h-full w-3 bg-muted"><div className="mx-auto h-full w-0.5 border-l-2 border-dashed border-primary/50"/></div>
      {stage !== 'pickup' && <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full"><path d="M60 170 C 120 150, 150 60, 250 40" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round"/></svg>}
      {stage === 'pickup' ? <div className="absolute left-1/2 top-[42%] flex -translate-x-1/2 items-center gap-2">
        <span className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-lg">Titik penjemputan</span>
        <span className="h-0.5 w-10 border-t-4 border-dotted border-primary"/>
        <MapPin className="h-8 w-8 fill-primary/30 text-primary"/>
      </div> : <>
        <MapPin className="absolute bottom-[12%] left-[18%] h-7 w-7 text-primary"/>
        <MapPin className="absolute right-[14%] top-[12%] h-8 w-8 fill-destructive/40 text-destructive"/>
        <span className="absolute right-[28%] top-[30%] rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-bold">26 mnt · {km} km</span>
      </>}
      <header className="absolute inset-x-3 top-3 flex items-center gap-2">
        <button aria-label="Kembali" onClick={stage === 'pickup' ? onBack : () => setStage('pickup')} className="grid h-11 w-11 place-items-center rounded-full bg-background shadow-lg"><ArrowLeft className="h-5 w-5"/></button>
        <label className="flex flex-1 items-center gap-2 rounded-full bg-background px-4 py-2.5 shadow-lg">
          <span className="h-3 w-3 rounded-full border-[3px] border-primary"/>
          <input value={stage === 'pickup' ? from : to} onChange={e => stage === 'pickup' ? setFrom(e.target.value) : setTo(e.target.value)} placeholder={stage === 'pickup' ? 'Jemput di mana?' : 'Mau ke mana?'} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
          <Camera className="h-4 w-4 text-muted-foreground"/>
        </label>
      </header>
      <button aria-label="Lokasi saya" className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-background shadow"><Crosshair className="h-5 w-5"/></button>
      <span className="absolute bottom-3 left-3 text-[10px] text-muted-foreground">© BIXGO Maps · ilustrasi</span>
    </div>

    {stage === 'pickup' && <section className="-mt-4 relative rounded-t-3xl bg-background px-4 pt-3">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted"/>
      {[[from || 'Titik saya saat ini', '0.01km • Lokasi GPS perkiraan'], ['Jl. Utama No. 12', '0.2km • Titik alternatif']].map(([a, b], i) => <button key={a} onClick={() => setFrom(a!)} className={`flex w-full items-start gap-3 border-b border-border py-3 text-left ${i === 0 ? 'bg-primary/5' : ''}`}>
        <MapPin className="mt-0.5 h-5 w-5 fill-primary/30 text-primary"/><span><b className="block text-sm">{a}</b><span className="text-xs text-muted-foreground">{b}</span></span></button>)}
      <label className="mt-3 block text-xs font-semibold">Tujuan<input value={to} onChange={e => setTo(e.target.value)} placeholder="Masukkan alamat tujuan" className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"/></label>
      <button disabled={!from.trim() || !to.trim()} onClick={() => setStage('choose')} className="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground disabled:opacity-40">Pilih Penjemputan Ini</button>
    </section>}

    {stage === 'choose' && <section className="-mt-4 relative rounded-t-3xl bg-background px-3 pt-3">
      {toastOn && <div className="absolute -top-28 inset-x-3 flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"><CheckCircle2 className="h-5 w-5"/><span className="flex-1">Pindai QR pengemudi untuk membayar</span><button aria-label="Tutup" onClick={() => setToastOn(false)}><X className="h-5 w-5"/></button></div>}
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted"/>
      <div className="mb-2 flex items-center justify-between rounded-2xl bg-primary/10 px-3 py-2.5 text-xs"><b>Undang teman untuk berbagi tarif</b><span className="font-bold text-primary">Perjalanan Grup</span></div>
      {OPTS.map((o, i) => { const p = price(o); const I = o.svc === 'car' ? CarFront : Bike; const on = i === sel; return <button key={o.name} onClick={() => setSel(i)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
        <span className={`grid place-items-center rounded-2xl bg-card ${on ? 'h-16 w-20' : 'h-12 w-14'}`}><I className={`${on ? 'h-10 w-10' : 'h-7 w-7'} text-primary`}/></span>
        <span className="flex-1"><b className="block text-sm">{o.name}</b><span className="flex items-center gap-1 text-xs text-muted-foreground">{o.eta} mnt lagi • <Users className="h-3 w-3"/>{o.seats}</span>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${on ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border'}`}>{o.svc === 'car' ? `${o.seats} kursi` : 'Bike'}{on && <Info className="h-3 w-3"/>}</span></span>
        <span className="text-right"><b className={`block text-sm ${p.final < p.base ? 'text-primary' : ''}`}>{idr(p.final)}</b>{p.final < p.base && <s className="text-[11px] text-muted-foreground">{idr(p.base)}</s>}{o.tag && <span className="block text-[10px] text-primary">{o.tag}</span>}</span>
      </button>; })}
    </section>}

    {stage === 'booked' && <section className="-mt-4 relative rounded-t-3xl bg-background px-4 pt-5 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-primary"/><h2 className="mt-2 text-lg font-black">Pesanan demo dibuat</h2>
      <p className="text-sm text-muted-foreground">{cur.name} · {from} → {to}</p><p className="mt-1 text-xl font-black">{idr(price(cur).final)}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">Pratinjau saja — tidak ada mitra yang dikirim dan tidak ada pembayaran.</p>
      <button onClick={onBack} className="mt-4 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">Kembali ke Beranda</button>
    </section>}

    {stage === 'choose' && <footer className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-xl border-t border-border bg-background px-3 pb-4 pt-2">
      <div className="flex items-center gap-2 border-b border-border pb-2 text-sm">
        <button onClick={() => setPay(p => (p + 1) % PAYS.length)} className="flex flex-1 items-center gap-2 font-bold"><span className="rounded-md bg-foreground px-1.5 text-[10px] text-background">{PAYS[pay]}</span>{PAYS[pay]}{pay === 1 && <span className="text-[10px] text-primary">−{cfg.bixDiscountPct}%</span>}</button>
        <span className="flex items-center gap-1 border-l border-border pl-3 text-xs"><CheckCircle2 className="h-4 w-4 text-primary"/>1 diterapkan</span>
        <MoreHorizontal className="ml-2 h-5 w-5"/>
      </div>
      <div className="mt-2 flex gap-2">
        <button aria-label="Jadwalkan" className="grid h-12 w-14 place-items-center rounded-full bg-card"><CalendarClock className="h-5 w-5"/></button>
        <button onClick={() => { onBooked({ svc: cur.svc, from, to, total: Math.round(price(cur).final), pay: PAYS[pay]!, name: cur.name }); setStage('booked'); }} className="flex-1 rounded-full bg-primary py-3 text-base font-bold text-primary-foreground">Pesan {cur.name}</button>
      </div>
    </footer>}
  </div>;
}
