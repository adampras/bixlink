import { Link } from '@tanstack/react-router';
import { Cpu, Radar, ShieldCheck, Zap } from 'lucide-react';
import { BixtradeBot3D, BOT_PERSONA } from '@/components/BixtradeBot3D';
import { BIXTRADE_STRATEGIES } from '@/lib/bixtrade';

/** Owner-switchable BIXTRADE-style landing hero; presentation only, no figures are invented. */
export function LandingTradeStyle({ bixPrice }: { bixPrice?: number }) {
  return <section className="ltx">
    <header className="ltx-bar"><b className="font-display">BIX<span>LINK</span></b><span className="arb-live"><i/> NEURAL ONLINE</span></header>
    <div className="ltx-hero">
      <div>
        <p className="shop-eyebrow">AI QUANT ECOSYSTEM</p>
        <h1 className="font-display">Teknologi <span>AI</span> untuk ekosistem digital Anda</h1>
        <p className="ltx-sub">Staking, BIXTRADE, P2P dan BIX CALL dalam satu terminal premium.</p>
        <div className="ltx-cta"><Link to="/auth" className="ltx-go">LAUNCH APP</Link><Link to="/bixtrade" className="ltx-ghost">Lihat BIXTRADE</Link></div>
      </div>
      <BixtradeBot3D mood="scan" routes={3} strategy="active"/>
    </div>
    <div className="ltx-grid">
      {([[Cpu, 'Mesin AI', '3 bot strategi'], [Radar, 'Radar', '6 bursa referensi'], [Zap, 'Harga BIX', bixPrice ? `$${bixPrice.toFixed(4)}` : '—'], [ShieldCheck, 'Kontrol', 'Owner-reviewed']] as const).map(([I, l, v]) => <div key={l} className="arb-hud"><small><I size={12}/> {l}</small><b>{v}</b></div>)}
    </div>
    <div className="ltx-fleet">{BIXTRADE_STRATEGIES.map(s => <div key={s.key} data-variant={BOT_PERSONA[s.key].variant} className="arb-botcard"><BixtradeBot3D mini mood="scan" strategy={s.key}/><b>{BOT_PERSONA[s.key].name}</b><span>{s.name}</span></div>)}</div>
    <p className="ltx-note">Proyeksi tidak dijamin. Saldo internal bukan aset yang diperdagangkan di bursa eksternal.</p>
  </section>;
}
