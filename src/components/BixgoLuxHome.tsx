import { lazy, Suspense, useEffect, useState } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { getDevicePosition, reverseGeocode } from '@/lib/geo';
const BixgoLiveMap = lazy(() => import('@/components/BixgoLiveMap'));
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Bell, ChevronRight, Hexagon, Home, Search, Settings, Activity , LayoutGrid } from 'lucide-react';
import type { BixgoService, BixgoSettings } from '@/lib/bixgo';
import type { BixgoView } from '@/components/BixgoHome';
import { bixgoFare } from '@/lib/bixgo';
import vehCar from '@/assets/bixgo/veh-car.png';
import vehRide from '@/assets/bixgo/veh-ride.png';
import icSend from '@/assets/bixgo/ic-send.png';
import icFood from '@/assets/bixgo/ic-food.png';
import { BixgoDemoTrip } from '@/components/BixgoDemoTrip';
import { BixgoLanguage } from '@/components/BixgoLanguage';
import { Button } from '@/components/ui/button';
import { BixgoActiveTrip } from '@/components/BixgoActiveTrip';

const KM = 1.2;

/** Full-screen next-gen BIXGO home (design-gated): night map, "Where to?", live estimate HUD, 4 fleet cards and its own 4-tab dock. Estimates only — booking uses the existing flows. */
export function BixgoLuxHome({ cfg, name, enabled, onPick, onNav, onMode }: { cfg: BixgoSettings; name: string; enabled: Set<BixgoService>; onPick: (s: BixgoService) => void; onNav: (v: BixgoView) => void; onMode: (m: 'rider' | 'driver' | 'merchant') => void }) {
  const cards: [BixgoService, string, string][] = [['ride', 'Ride', vehRide], ['car', 'Car', vehCar], ['send', 'Delivery', icSend], ['food', 'Food', icFood]];
  const [sel, setSel] = useState<BixgoService>('ride');
  const [demo, setDemo] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState('Mendeteksi GPS…');
  useEffect(() => { getDevicePosition().then(p => setPos({ lat: p.lat, lng: p.lng })).catch(() => setPlace('GPS tidak aktif · ketuk peta')); }, []);
  useEffect(() => { if (pos) void reverseGeocode(pos.lat, pos.lng).then(r => setPlace(r.name)).catch(() => {}); }, [pos?.lat, pos?.lng]);
  const est = bixgoFare(cfg, sel, KM);
  const usdt = (est.idr / cfg.usdtIdr).toFixed(2);
  const tap = (k: BixgoService) => { setSel(k); onPick(k); };
  return <section className="bgx-full fixed inset-0 z-[61] flex flex-col overflow-hidden">
    <div className="absolute inset-0"><ClientOnly fallback={null}><Suspense fallback={null}><BixgoLiveMap from={pos} to={null} active="from" onPick={p => setPos(p)}/></Suspense></ClientOnly></div>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background/90"/>
    <header className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.9rem)]">
      <Link to="/" aria-label="Kembali ke BIXLINK" className="bgx-icon grid h-10 w-10 place-items-center rounded-full"><ArrowLeft className="h-5 w-5"/></Link>
      <button onClick={() => onNav('account')} aria-label="Akun" className="bgl-avatar grid h-11 w-11 place-items-center rounded-full text-sm font-black">{(name || 'B').slice(0, 1).toUpperCase()}</button>
      <BixgoLanguage/>
      <button onClick={() => onNav('inbox')} aria-label="Notifikasi" className="relative"><Bell className="h-6 w-6"/><span className="bgl-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"/></button>
    </header>
    <div className="relative mx-4 mt-2 grid grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1 text-[11px] font-bold"><Button size="sm" aria-pressed className="h-8 text-[11px]">Rider</Button><Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => onMode('driver')}>Driver</Button><Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => onMode('merchant')}>Merchant</Button></div>
    <Button variant="ghost" onClick={() => onPick(sel === 'car' ? 'car' : 'ride')} className="bgl-glass relative mx-4 mt-3 flex h-12 items-center justify-between rounded-lg px-5 text-left text-lg">Where to today?<Search className="h-5 w-5"/></Button>
    <div className="relative flex gap-2 px-4 pt-2 text-[10px] font-bold">
      <Button size="sm" variant="ghost" onClick={() => onNav('services')} className="bgx-chip h-8 rounded-lg px-3 text-[10px]">Service catalog</Button>
      <Button size="sm" variant="ghost" onClick={() => setDemo(true)} className="bgx-chip h-8 rounded-lg px-3 text-[10px]">Demo trip</Button>
    </div>
    <div className="pointer-events-none relative min-h-0 flex-1 [&>button]:pointer-events-auto">
      <div className="pointer-events-auto absolute inset-x-0 bottom-2"><BixgoActiveTrip lux onOpen={() => onNav('activity')}/></div>
      <button onClick={() => onPick(sel === 'car' ? 'car' : 'ride')} className="bgl-glass absolute right-4 top-[14%] flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] leading-tight"><span>Pickup Location<br/><b data-no-translate className="block max-w-[9rem] truncate">{place}</b></span><ChevronRight className="h-4 w-4"/></button>
                </div>
    <div className="bgl-glass relative mx-3 grid grid-cols-[1fr_1fr_1.5fr] gap-2 rounded-lg px-3 py-2.5 text-xs">
      <div><p className="text-muted-foreground">Travel time</p><b className="bgl-purple text-sm">{est.etaMin} min</b></div>
      <div><p className="text-muted-foreground">Distance</p><b className="text-lg">{KM} km</b></div>
      <div><p className="text-muted-foreground">Fare Estimate</p><b className="text-sm">Rp {Math.round(est.idr).toLocaleString('id-ID')}</b><small className="block text-[10px] text-muted-foreground">≈ {usdt} USDT</small></div>
    </div>
    <div className="relative grid grid-cols-4 gap-2 px-3 pt-3">
      {cards.map(([k, l, img]) => <button key={k} disabled={!enabled.has(k)} onClick={() => tap(k)} aria-pressed={sel === k} className={`bgl-card rounded-2xl px-1 pb-2 pt-2 text-center text-xs font-semibold disabled:opacity-40 ${sel === k ? 'is-on' : ''}`}>{l}<img src={img} alt="" className="mx-auto mt-1 h-12 w-auto object-contain"/></button>)}
    </div>
    <p className="relative px-3 py-1 text-center text-[9px] text-muted-foreground">Example fare · 1.2 km. Final estimate after choosing your route.</p>
    <nav className="bgx-dock relative grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="BIXGO">
      <button className="is-on" aria-current="page"><Home className="h-5 w-5"/>Home</button>
      <button onClick={() => onNav('services')}><LayoutGrid className="h-5 w-5"/>Layanan</button>
      <button onClick={() => onNav('activity')}><Activity className="h-5 w-5"/>Activity</button>
      <Link to="/wallet"><Hexagon className="h-5 w-5"/>Wallet</Link>
      <button onClick={() => onNav('account')}><Settings className="h-5 w-5"/>Account</button>
    </nav>
    {demo && <BixgoDemoTrip cfg={cfg} onClose={() => setDemo(false)}/>}
  </section>;
}
