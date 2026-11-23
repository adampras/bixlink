import { lazy, Suspense, useEffect, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { getDevicePosition, reverseGeocode } from '@/lib/geo';
const BixgoLiveMap = lazy(() => import('@/components/BixgoLiveMap'));
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Bell, ChevronRight, Hexagon, Home, Search, Settings, Activity } from 'lucide-react';
import type { BixgoService, BixgoSettings } from '@/lib/bixgo';
import type { BixgoView } from '@/components/BixgoHome';
import { bixgoFare } from '@/lib/bixgo';
import vehCar from '@/assets/bixgo/veh-car.png';
import vehRide from '@/assets/bixgo/veh-ride.png';
import icSend from '@/assets/bixgo/ic-send.png';
import icFood from '@/assets/bixgo/ic-food.png';

const KM = 1.2;

/** Full-screen next-gen BIXGO home (design-gated): night map, "Where to?", live estimate HUD, 4 fleet cards and its own 4-tab dock. Estimates only — booking uses the existing flows. */
export function BixgoLuxHome({ cfg, name, enabled, onPick, onNav, onMode }: { cfg: BixgoSettings; name: string; enabled: Set<BixgoService>; onPick: (s: BixgoService) => void; onNav: (v: BixgoView) => void; onMode: (m: 'rider' | 'driver' | 'merchant') => void }) {
  const cards: [BixgoService, string, string][] = [['ride', 'Ride', vehRide], ['car', 'Car', vehCar], ['send', 'Delivery', icSend], ['food', 'Food', icFood]];
  const [sel, setSel] = useState<BixgoService>('ride');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState('Mendeteksi GPS…');
  useEffect(() => { getDevicePosition().then(p => setPos({ lat: p.lat, lng: p.lng })).catch(() => setPlace('GPS tidak aktif · ketuk peta')); }, []);
  useEffect(() => { if (pos) void reverseGeocode(pos.lat, pos.lng).then(r => setPlace(r.name)).catch(() => {}); }, [pos?.lat, pos?.lng]);
  const est = bixgoFare(cfg, sel, KM);
  const usdt = (est.idr / cfg.usdtIdr).toFixed(2);
  const tap = (k: BixgoService) => { if (sel === k) onPick(k); else setSel(k); };
  return <section className="bgx-full fixed inset-0 z-[61] flex flex-col overflow-hidden">
    <div className="absolute inset-0"><ClientOnly fallback={null}><Suspense fallback={null}><BixgoLiveMap from={pos} to={null} active="from" onPick={p => setPos(p)}/></Suspense></ClientOnly></div>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/90"/>
    <header className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
      <Link to="/" aria-label="Kembali ke BIXLINK" className="bgx-icon grid h-10 w-10 place-items-center rounded-full"><ArrowLeft className="h-5 w-5"/></Link>
      <button onClick={() => onNav('account')} aria-label="Akun" className="bgl-avatar grid h-11 w-11 place-items-center rounded-full text-sm font-black">{(name || 'B').slice(0, 1).toUpperCase()}</button>
      <button onClick={() => onNav('inbox')} aria-label="Notifikasi" className="relative"><Bell className="h-6 w-6"/><span className="bgl-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"/></button>
    </header>
    <button onClick={() => onPick(sel === 'car' ? 'car' : 'ride')} className="bgl-glass relative mx-4 mt-3 flex items-center justify-between rounded-full px-5 py-3.5 text-left text-lg">Where to?<Search className="h-5 w-5"/></button>
    <div className="relative flex gap-2 px-4 pt-2 text-[10px] font-bold">
      <button onClick={() => onMode('driver')} className="bgx-chip rounded-full px-3 py-1">Mode Driver</button>
      <button onClick={() => onMode('merchant')} className="bgx-chip rounded-full px-3 py-1">Mode Merchant</button>
    </div>
    <div className="pointer-events-none relative min-h-0 flex-1 [&>button]:pointer-events-auto">
      <button onClick={() => onPick(sel === 'car' ? 'car' : 'ride')} className="bgl-glass absolute left-[42%] top-[14%] flex items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[11px] leading-tight">Pickup location<br/><b className="block max-w-[9rem] truncate">{place}</b><ChevronRight className="h-4 w-4"/></button>
                </div>
    <div className="bgl-glass relative mx-8 grid grid-cols-3 rounded-2xl px-4 py-2.5 text-xs">
      <div><p className="text-muted-foreground">ETA</p><b className="bgl-purple text-lg">{est.etaMin} min</b></div>
      <div><p className="text-muted-foreground">Distance</p><b className="text-lg">{KM} km</b></div>
      <div><p className="text-muted-foreground">Price est.</p><b className="text-lg">{usdt} <small>USDT</small></b></div>
    </div>
    <div className="relative grid grid-cols-4 gap-2 px-3 pt-3">
      {cards.map(([k, l, img]) => <button key={k} disabled={!enabled.has(k)} onClick={() => tap(k)} aria-pressed={sel === k} className={`bgl-card rounded-2xl px-1 pb-2 pt-2 text-center text-xs font-semibold disabled:opacity-40 ${sel === k ? 'is-on' : ''}`}>{l}<img src={img} alt="" className="mx-auto mt-1 h-12 w-auto object-contain"/></button>)}
    </div>
    <p className="relative py-1 text-center text-[9px] text-muted-foreground">Peta & lokasi jemput riil · harga contoh 1.2 km · ketuk armada terpilih lagi untuk memesan · tarif final saat memesan</p>
    <nav className="bgx-dock relative grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label="BIXGO">
      <button className="is-on" aria-current="page"><Home className="h-5 w-5"/>Home</button>
      <button onClick={() => onNav('activity')}><Activity className="h-5 w-5"/>Activity</button>
      <Link to="/wallet"><Hexagon className="h-5 w-5"/>Wallet</Link>
      <button onClick={() => onNav('account')}><Settings className="h-5 w-5"/>Settings</button>
    </nav>
  </section>;
}
