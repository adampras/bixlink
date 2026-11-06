import { Link } from '@tanstack/react-router';
import { LogIn, ChevronDown } from 'lucide-react';
import logo from '@/assets/bixlink-logo-gold.webp';
import callImg from '@/assets/eco/call.png';
import goImg from '@/assets/eco/go.png';
import goldImg from '@/assets/eco/gold.png';
import tokImg from '@/assets/eco/tok.png';
import payImg from '@/assets/eco/pay.png';

const SATELLITES = [
  { to: '/bixgo', label: 'BIXGO', note: 'Mobility', img: goImg, pos: 'tl' },
  { to: '/gold', label: 'BIX GOLD', note: '24K savings', img: goldImg, pos: 'tr' },
  { to: '/bixtok', label: 'BIXTOK', note: 'Live hub', img: tokImg, pos: 'bl' },
  { to: '/pay', label: 'BIX PAY', note: 'Payments', img: payImg, pos: 'br' },
] as const;

/** Cinematic ecosystem gateway shown to signed-out visitors before the landing page. */
export function EcosystemPortal({ onLanding }: { onLanding: () => void }) {
  return <main className="eco-portal" aria-label="BIXLINK ecosystem portal">
    <div className="eco-portal-stars" aria-hidden/>
    <div className="eco-portal-nebula" aria-hidden/>
    <header className="eco-portal-top">
      <span className="eco-portal-brand"><img src={logo} alt="" width={28} height={28}/>BIXLINK</span>
      <Link to="/auth" className="eco-portal-login"><LogIn className="size-4"/>Sign in</Link>
    </header>
    <div className="eco-portal-head">
      <span className="eco-portal-eyebrow">BIXLINK ECOSYSTEM</span>
      <h1>Choose your <span>gateway</span></h1>
      <p>Real utilities you can use today — start with BIX CALL.</p>
    </div>
    <div className="eco-orbit">
      <div className="eco-ring eco-ring-1" aria-hidden/><div className="eco-ring eco-ring-2" aria-hidden/>
      <Link to="/call" className="eco-core" style={{ animationDelay: '.6s, 2.4s' }}>
        <img src={callImg} alt="" width={816} height={816} className="eco-3d eco-3d-core"/>
        <b>BIX CALL</b><small>Calls · Chat · Community</small>
      </Link>
      {SATELLITES.map((s, i) => <Link key={s.to} to={s.to} className={`eco-node eco-${s.pos}`} style={{ animationDelay: `${1.5 + i * 0.45}s, ${3.2 + i * 0.6}s` }}>
        <img src={s.img} alt="" width={816} height={816} loading="lazy" className="eco-3d"/>
        <b>{s.label}</b><small>{s.note}</small>
      </Link>)}
    </div>
    <div className="eco-portal-actions">
      <Link to="/call" className="eco-cta">Start with BIX CALL</Link>
      <button type="button" className="eco-landing" onClick={onLanding}>LANDING PAGE <ChevronDown className="size-4"/></button>
    </div>
  </main>;
}
