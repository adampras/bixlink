import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Navigation, Phone, MessageCircle, Radar, Star, X, CarFront } from 'lucide-react';
import { SlideAccept } from '@/components/BixgoDriverJobs';
import { bixgoFare, type BixgoSettings } from '@/lib/bixgo';

const STEPS = ['Pencarian', 'Driver terima', 'Penjemputan', 'Pengantaran', 'Selesai & bayar'] as const;
const KM = 6.4;

/** Admin presentation demo of a full BIXGO trip. Pure client simulation: writes nothing, moves no balance. */
export function BixgoDemoTrip({ cfg, onClose }: { cfg: BixgoSettings; onClose: () => void }) {
  const [s, setS] = useState(0);
  const [prog, setProg] = useState(0);
  const [stars, setStars] = useState(0);
  const fare = bixgoFare(cfg, 'car', KM);
  const usdt = fare.idr / cfg.usdtIdr;
  const fee = usdt * 0.15;
  useEffect(() => { setProg(0); if (s !== 0 && s !== 2 && s !== 3) return; const t = setInterval(() => setProg(p => Math.min(100, p + 4)), 120); return () => clearInterval(t); }, [s]);
  useEffect(() => { if (s === 0 && prog >= 100) setS(1); }, [s, prog]);
  const next = () => setS(x => Math.min(4, x + 1));
  const route = <div className="rounded-2xl border border-border bg-card/80 p-3 text-xs"><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary"/>Jemput · Bandara Internasional Lombok</p><p className="mt-1.5 flex items-center gap-2"><Navigation className="h-4 w-4 text-accent"/>Tujuan · Mataram Mall</p><p className="mt-1.5 text-muted-foreground">BIX Car · {KM} km · ~{fare.etaMin} min · BIX Token</p></div>;
  const driver = <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-card/80 p-3"><span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-lg font-black text-primary">RA</span><div className="min-w-0 flex-1 text-xs"><b className="block text-sm">Rizky A. (contoh)</b><p>Toyota Avanza · DR 1234 XX</p><p className="text-primary">★ 4.9 · Driver demo</p></div><button className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="BIX CALL (demo)"><Phone className="h-4 w-4"/></button><button className="grid h-10 w-10 place-items-center rounded-full border border-primary/50 text-primary" aria-label="Chat (demo)"><MessageCircle className="h-4 w-4"/></button></div>;
  const bar = (label: string) => <div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${prog}%` }}/></div><p className="mt-1 text-center text-[11px] text-muted-foreground">{label} · {prog}%</p></div>;

  return <div role="dialog" aria-label="Demo perjalanan BIXGO" className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-background text-foreground" style={{ maxHeight: '100dvh' }}>
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.8rem)] backdrop-blur">
      <div className="min-w-0 flex-1"><b className="block text-sm">Demo perjalanan BIXGO</b><span className="text-[10px] text-muted-foreground">Simulasi · tidak ada pesanan atau saldo yang berubah</span></div>
      <button onClick={onClose} aria-label="Tutup demo" className="grid h-9 w-9 place-items-center rounded-full border border-border"><X className="h-4 w-4"/></button>
    </header>
    <ol className="grid grid-cols-5 gap-1 px-4" aria-label="Tahap demo">{STEPS.map((l, i) => <li key={l} className="text-center"><span className={`block h-1.5 rounded-full ${i <= s ? 'bg-primary' : 'bg-muted'}`}/><span className={`mt-1 block text-[9px] leading-tight ${i === s ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{l}</span></li>)}</ol>

    <main className="flex-1 space-y-3 px-4 py-4">
      {s === 0 && <><div className="grid place-items-center py-6"><span className="relative grid h-40 w-40 place-items-center rounded-full border border-primary/40"><span className="absolute inset-0 animate-ping rounded-full bg-primary/15"/><span className="absolute inset-6 rounded-full border border-primary/30"/><Radar className="h-12 w-12 text-primary"/></span><b className="mt-4 text-lg">Mencari driver terdekat…</b><p className="text-xs text-muted-foreground">Penumpang menunggu armada BIX Car</p></div>{route}{bar('Memanggil driver')}</>}

      {s === 1 && <><p className="text-center text-xs font-bold uppercase tracking-widest text-primary">Layar driver · order masuk</p>
        <div className="bgl-drv-head"><div><small>Today's trips</small><b>03</b><span>Completed (contoh)</span></div><i aria-hidden/><div><small>Earned today</small><b>{(usdt * 0.85 * 3).toFixed(2)}</b><span>USDT (contoh)</span></div></div>
        <div className="grid place-items-center py-3"><span className="grid h-36 w-36 place-items-center rounded-full border-2 border-primary/60 bg-primary/10 text-center"><span><b className="block text-3xl">{KM}</b><span className="text-xs">km perjalanan</span><b className="mt-1 block text-sm text-primary">{(usdt * 0.85).toFixed(2)} USDT</b></span></span></div>
        {route}<SlideAccept busy={false} onDone={next}/><p className="text-center text-[10px] text-muted-foreground">Geser tuas sampai ujung kanan untuk menerima</p></>}

      {s === 2 && <><div className="flex items-center gap-3"><CarFront className="h-8 w-8 text-primary"/><div><b className="block text-lg">Driver menuju titik jemput</b><p className="text-xs text-muted-foreground">Tiba sekitar {Math.max(1, Math.round((100 - prog) / 25))} menit</p></div></div>{driver}{route}{bar('Driver mendekat')}
        <button disabled={prog < 100} onClick={next} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{prog < 100 ? 'Driver dalam perjalanan…' : 'Penumpang naik · mulai perjalanan'}</button></>}

      {s === 3 && <><div className="flex items-center gap-3"><Navigation className="h-8 w-8 text-primary"/><div><b className="block text-lg">Dalam perjalanan</b><p className="text-xs text-muted-foreground">Menuju Mataram Mall</p></div></div>{driver}{route}{bar('Menuju tujuan')}
        <button disabled={prog < 100} onClick={next} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{prog < 100 ? 'Sedang mengantar…' : 'Sampai tujuan · selesaikan'}</button></>}

      {s === 4 && <><div className="bgl-done-head"><div className="bgl-done-seal"><CheckCircle2 className="h-14 w-14"/></div><h2>Ride complete</h2><p>Thank you for riding with us</p></div>
        <div className="bgl-receipt bgl-gold-card"><div className="flex items-start justify-between gap-2"><div><p className="bgl-cap">Total paid</p><p className="bgl-receipt-total">{usdt.toFixed(2)} USDT</p></div><span className="bgl-hex" aria-hidden>BIX</span></div>
          <p className="bgl-cap mt-2">Fare breakdown</p><dl><div><dt>Distance</dt><dd>{KM} km</dd></div><div><dt>Payment method</dt><dd>BIX Token</dd></div><div className="bgl-tot"><dt>Total fare</dt><dd>{usdt.toFixed(2)} USDT</dd></div></dl>
          <p className="bgl-cap mt-3">Platform commission</p><dl><div><dt>Platform commission (15%)</dt><dd>{fee.toFixed(2)} USDT</dd></div><div><dt>Paid to driver (85%)</dt><dd>{(usdt - fee).toFixed(2)} USDT</dd></div></dl>
          <p className="mt-3 text-[10px] text-muted-foreground">Contoh simulasi dari tarif kota saat ini · bukan transaksi tercatat.</p></div>
        <div className="rounded-2xl border border-primary/30 p-3 text-center"><p className="text-xs font-bold">{stars ? `Terima kasih! ${'★'.repeat(stars)}` : 'Beri nilai driver'}</p><div className="mt-1 flex justify-center gap-1">{[1, 2, 3, 4, 5].map(r => <button key={r} aria-label={`${r} bintang`} onClick={() => setStars(r)}><Star className={`bgl-star h-10 w-10 ${stars >= r ? 'fill-primary text-primary' : 'text-muted-foreground'}`}/></button>)}</div></div>
        <div className="bgl-tip"><span className="bgl-coin" aria-hidden>BIX</span><div className="min-w-0 flex-1"><b>Leave a tip (optional)</b><small>Show your appreciation</small></div><span className="bgl-tip-btn">+ Add BIX tip</span></div>
        <div className="flex gap-2"><button onClick={() => { setS(0); setStars(0); }} className="flex-1 rounded-full border border-primary py-3 font-bold text-primary">Ulangi demo</button><button onClick={onClose} className="flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground">Tutup</button></div></>}
    </main>
  </div>;
}
