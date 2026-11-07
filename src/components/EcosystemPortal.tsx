import { useEffect, useRef } from 'react';
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
  { to: '/gold', label: 'BIX GOLD', note: '24K Savings', img: goldImg, pos: 'tr' },
  { to: '/bixtok', label: 'BIXTOK', note: 'Live Hub', img: tokImg, pos: 'bl' },
  { to: '/pay', label: 'BIX PAY', note: 'Payments', img: payImg, pos: 'br' },
] as const;

/** Soft cinematic sound: sub-bass whoosh + crystal chime (Web Audio, no files). */
function playCrystal() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); const t = ctx.currentTime;
    const master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    const sub = ctx.createOscillator(); const sg = ctx.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(70, t); sub.frequency.exponentialRampToValueAtTime(38, t + 1.1);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.6, t + 0.15); sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    sub.connect(sg).connect(master); sub.start(t); sub.stop(t + 1.3);
    [1318.5, 1975.5, 2637].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain(); const st = t + 0.35 + i * 0.07;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.18 / (i + 1), st + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, st + 1.8);
      o.connect(g).connect(master); o.start(st); o.stop(st + 2);
    });
    window.setTimeout(() => void ctx.close(), 2600);
  } catch { /* audio unsupported */ }
}

/** Cinematic ecosystem gateway shown to signed-out visitors before the landing page. */
export function EcosystemPortal({ onLanding }: { onLanding: () => void }) {
  const played = useRef(false);
  useEffect(() => {
    const once = () => { if (played.current) return; played.current = true; playCrystal(); };
    window.addEventListener('pointerdown', once, { once: true });
    return () => window.removeEventListener('pointerdown', once);
  }, []);

  return <main className="eco-portal eco-v3" aria-label="BIXLINK ecosystem portal">
    <div className="eco-portal-stars" aria-hidden/>
    <div className="eco-portal-nebula" aria-hidden/>
    <div className="eco-warp" aria-hidden>{Array.from({ length: 7 }, (_, n) => <i key={n} style={{ animationDelay: `${n * 0.16}s` }}/>)}</div>
    <i className="eco-flare" aria-hidden/>
    <header className="eco-portal-top">
      <span className="eco-portal-brand"><img src={logo} alt="" width={28} height={28}/>BIXLINK</span>
      <Link to="/auth" className="eco-portal-login"><LogIn className="size-4"/>Sign in</Link>
    </header>
    <div className="eco-portal-head">
      <span className="eco-portal-eyebrow">E C O S Y S T E M &nbsp; G A T E W A Y</span>
      <h1 className="eco-title">{'BIXLINK'.split('').map((c, i) => <b key={i} style={{ animationDelay: `${2 + i * 0.09}s` }}>{c}</b>)}</h1>
      <p>Communication · Mobility · Community</p>
    </div>
    <div className="eco-orbit">
      <div className="eco-ring eco-ring-1" aria-hidden/><div className="eco-ring eco-ring-2" aria-hidden/><div className="eco-ring eco-ring-3" aria-hidden/>
      <Link to="/call" className="eco-core" style={{ animationDelay: '1.6s, 3.4s' }}>
        <img src={callImg} alt="" width={816} height={816} className="eco-3d eco-3d-core"/>
        <b>BIX CALL</b><small>CORE ACTIVE · TAP TO ENTER</small>
      </Link>
      {SATELLITES.map((s, i) => <Link key={s.to} to={s.to} className={`eco-node eco-${s.pos}`} style={{ animationDelay: `${2.6 + i * 0.35}s, ${4.2 + i * 0.6}s` }}>
        <img src={s.img} alt="" width={816} height={816} loading="lazy" className="eco-3d"/>
        <b>{s.label}</b><small>{s.note}</small>
      </Link>)}
    </div>
    <div className="eco-portal-actions">
      <Link to="/call" className="eco-cta">START WITH BIX CALL</Link>
      <button type="button" className="eco-landing" onClick={onLanding}>LANDING PAGE <ChevronDown className="size-4"/></button>
      <Link to="/ecosystem" className="text-sm text-muted-foreground">Explore the BIXLINK ecosystem →</Link>
    </div>
  </main>;
}
