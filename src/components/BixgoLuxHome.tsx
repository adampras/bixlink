import { Bell, Search } from 'lucide-react';
import type { BixgoService, BixgoSettings } from '@/lib/bixgo';
import { bixgoFare } from '@/lib/bixgo';
import vehCar from '@/assets/bixgo/veh-car.png';
import vehRide from '@/assets/bixgo/veh-ride.png';
import icSend from '@/assets/bixgo/ic-send.png';
import icFood from '@/assets/bixgo/ic-food.png';

/** Next-gen BIXGO home (design-gated): night map, "Where to?" capsule, live estimate HUD and 4 service cards. Estimates only. */
export function BixgoLuxHome({ cfg, name, enabled, onPick }: { cfg: BixgoSettings; name: string; enabled: Set<BixgoService>; onPick: (s: BixgoService) => void }) {
  const est = bixgoFare(cfg, 'ride', 1.2);
  const usdt = (est.idr / cfg.usdtIdr).toFixed(2);
  const cards: [BixgoService, string, string][] = [['ride', 'Ride', vehRide], ['car', 'Car', vehCar], ['send', 'Delivery', icSend], ['food', 'Food', icFood]];
  return <section className="bgl-home relative mx-3 mt-3 overflow-hidden rounded-[28px]">
    <svg viewBox="0 0 360 420" className="bgl-map absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs><filter id="bglGlow"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {Array.from({ length: 14 }, (_, i) => <path key={'h' + i} d={`M-20 ${i * 32 + 8} L380 ${i * 32 - 30}`} className="bgl-street"/>)}
      {Array.from({ length: 12 }, (_, i) => <path key={'v' + i} d={`M${i * 34 - 10} -20 L${i * 34 + 40} 440`} className="bgl-street"/>)}
      {Array.from({ length: 40 }, (_, i) => <circle key={'l' + i} cx={(i * 73) % 360} cy={(i * 131) % 420} r={1.2} className="bgl-light"/>)}
      <path d="M230 -10 C 200 60, 300 110, 280 180 S 170 230, 150 250 S 210 330, 230 430" className="bgl-route" filter="url(#bglGlow)"/>
    </svg>
    <div className="relative flex items-center justify-between p-4">
      <span className="bgl-avatar grid h-11 w-11 place-items-center rounded-full text-sm font-black">{(name || 'B').slice(0, 1).toUpperCase()}</span>
      <span className="relative"><Bell className="h-6 w-6"/><span className="bgl-dot absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"/></span>
    </div>
    <button onClick={() => onPick('ride')} className="bgl-glass relative mx-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-full px-5 py-3.5 text-left text-lg">Where to?<Search className="h-5 w-5"/></button>
    <div className="relative h-56">
      <div className="bgl-glass absolute left-[38%] top-6 rounded-xl px-3 py-1.5 text-[11px] leading-tight">Pickup location<br/><b>Lokasi Anda</b></div>
      <span className="bgl-pin absolute left-[30%] top-[52%] grid h-8 w-8 place-items-center rounded-full"><span className="h-3 w-3 rounded-full"/></span>
      <img src={vehCar} alt="" className="bgl-car absolute right-[22%] top-[70%] h-10 w-auto"/>
    </div>
    <div className="bgl-glass relative mx-6 grid grid-cols-3 rounded-2xl px-4 py-3 text-xs">
      <div><p className="text-muted-foreground">ETA</p><b className="bgl-purple text-lg">{est.etaMin} min</b></div>
      <div><p className="text-muted-foreground">Distance</p><b className="text-lg">1.2 km</b></div>
      <div><p className="text-muted-foreground">Price est.</p><b className="text-lg">{usdt} <small>USDT</small></b></div>
    </div>
    <div className="relative grid grid-cols-4 gap-2 p-3">
      {cards.map(([k, l, img], i) => <button key={k} disabled={!enabled.has(k)} onClick={() => onPick(k)} className={`bgl-card rounded-2xl px-1 pb-2 pt-2 text-center text-xs font-semibold disabled:opacity-40 ${i === 0 ? 'is-on' : ''}`}>{l}<img src={img} alt="" className="mx-auto mt-1 h-12 w-auto object-contain"/></button>)}
    </div>
    <p className="relative pb-3 text-center text-[9px] text-muted-foreground">Estimasi tarif contoh 1.2 km · tarif final dihitung saat memesan</p>
  </section>;
}
