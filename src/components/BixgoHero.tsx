import { Link } from '@tanstack/react-router';
import { QrCode, Wallet, ShieldCheck } from 'lucide-react';
import logo from '@/assets/bixlink-logo-gold.webp';
import { FEATURED_CITY_IDS } from '@/lib/bixgo-regions';
import { GLOBAL_CITIES, GLOBAL_CURRENCIES, formatMoney, type GlobalCurrency } from '@/lib/bixgo-global';
import { cityFare, bixgoFare, type BixgoSettings } from '@/lib/bixgo';

/** BIXGO hero in the BIXLINK obsidian / gold / teal identity: city switcher, currency and a live sample fare. */
export function BixgoHero({ cfg, city, cur, onCity, onCur, isAdmin }: { cfg: BixgoSettings; city: string; cur: GlobalCurrency; onCity: (id: string) => void; onCur: (c: GlobalCurrency) => void; isAdmin: boolean }) {
  const c = GLOBAL_CITIES.find(x => x.id === city) ?? GLOBAL_CITIES[0];
  const sample = cityFare(cfg, city, bixgoFare(cfg, 'car', 10).idr * 1.8);
  return <section className="bixgo-hero relative mx-3 mt-3 overflow-hidden rounded-3xl p-4">
    <div className="bixgo-hero-grid pointer-events-none absolute inset-0"/>
    <div className="relative flex items-center gap-3">
      <img src={logo} alt="BIXLINK" width={44} height={44} className="bixgo-hero-logo h-11 w-11 object-contain"/>
      <div className="min-w-0 flex-1">
        <p className="bixgo-hero-gold text-[10px] font-bold tracking-[0.3em]">BIXLINK · BIXGO</p>
        <p className="flex items-center gap-1.5 text-[10px] tracking-widest text-muted-foreground"><span className="bixgo-hero-dot h-1.5 w-1.5 rounded-full"/>GLOBAL MOBILITY · LIVE DISPATCH</p>
      </div>
      {isAdmin && <Link to="/admin" className="bixgo-hero-chip rounded-full px-2.5 py-1 text-[10px] font-bold">Operator</Link>}
    </div>
    <h1 className="relative mt-4 font-display text-2xl font-black leading-tight">Move anywhere.<br/><span className="bixgo-hero-gold">Pay in BIX.</span></h1>
    <p className="relative mt-1 text-xs text-muted-foreground">Executive rides, airport transfers and travel eSIM for BIXLINK members in {c.city}, {c.province} · {c.country}.</p>
    <div className="no-scrollbar relative mt-3 flex gap-1.5 overflow-x-auto">{[c, ...FEATURED_CITY_IDS.filter(id => id !== c.id).map(id => GLOBAL_CITIES.find(g => g.id === id)!)].filter(Boolean).map(x => <button key={x.id} onClick={() => onCity(x.id)} className={`bixgo-hero-chip shrink-0 rounded-full px-3 py-1.5 text-[11px] ${x.id === city ? 'is-on font-bold' : ''}`}>{x.city}</button>)}</div>
    <div className="relative mt-3 grid grid-cols-[1fr_auto] items-end gap-2 rounded-2xl bixgo-hero-panel p-3">
      <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">BIX Black · 10 km · {c.city}</p><p className="bixgo-hero-gold font-display text-xl font-black tabular-nums">{formatMoney(sample, cur, cfg.usdtIdr)}</p></div>
      <div className="flex gap-1">{GLOBAL_CURRENCIES.map(x => <button key={x.code} onClick={() => onCur(x.code)} className={`bixgo-hero-chip rounded-md px-1.5 py-1 text-[10px] ${cur === x.code ? 'is-on font-bold' : ''}`}>{x.code}</button>)}</div>
    </div>
    <div className="relative mt-3 grid grid-cols-3 gap-2 text-[11px] font-bold">
      <Link to="/wallet" className="bixgo-hero-chip flex items-center justify-center gap-1 rounded-xl py-2"><Wallet className="h-4 w-4"/>Top up</Link>
      <Link to="/wallet" className="bixgo-hero-chip flex items-center justify-center gap-1 rounded-xl py-2"><QrCode className="h-4 w-4"/>BIX PAY</Link>
      <span className="bixgo-hero-chip flex items-center justify-center gap-1 rounded-xl py-2"><ShieldCheck className="h-4 w-4"/>Verified</span>
    </div>
  </section>;
}
