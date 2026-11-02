import { useEffect, useRef, useState, type ReactNode } from 'react';
import logo from '@/assets/bixlink-logo-gold.webp';

/** Low battery (<20%, not charging) → static luxury mode. */
function useEco() {
  const [eco, setEco] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void }> };
    nav.getBattery?.().then(b => { const u = () => setEco(b.level < 0.2 && !b.charging); u(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u); }).catch(() => {});
  }, []);
  return eco;
}

/** Light wave that follows the finger/cursor across glass surfaces. */
export function GlowSurface({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); };
  return <div ref={ref} onPointerMove={move} onPointerDown={move} className={`fx-glow ${className}`}>{children}</div>;
}

export function HoloReactor({ bixPrice = 0.84291, size = 'md' }: { bixPrice?: number; size?: 'sm' | 'md' }) {
  const eco = useEco();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (eco) return;
    const el = ref.current; if (!el) return;
    const set = (x: number, y: number) => { el.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`); el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`); };
    const onMove = (e: PointerEvent) => { const r = el.getBoundingClientRect(); set(Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / r.width)), Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / r.height))); };
    const onTilt = (e: DeviceOrientationEvent) => { if (e.gamma == null || e.beta == null) return; set(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30))); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('deviceorientation', onTilt, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('deviceorientation', onTilt); };
  }, [eco]);
  return <div className={`holo-wrap holo-${size} ${eco ? 'is-eco' : ''}`} aria-label="BIXLINK holographic reactor core">
    <div className="holo-radar" aria-hidden><i/><i/><i/></div>
    <div ref={ref} className="holo-stage" aria-hidden>
      <div className="holo-sphere"><span className="holo-scan"/></div>
      <div className="holo-ring r1"/><div className="holo-ring r2"/><div className="holo-ring r3"/>
      <img src={logo} alt="" className="holo-emblem" width={96} height={96}/>
    </div>
    <div className="holo-telemetry numeric"><span><i/> PROTOCOL: QUANTUM SECURE</span><span>ORACLE REF: ${bixPrice.toFixed(4)}</span></div>
  </div>;
}

/** Mechanical rolling digits. Non-digit characters render as-is. */
export function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const [shown, setShown] = useState(() => value.replace(/\d/g, '0'));
  useEffect(() => { const t = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(t); }, [value]);
  return <span className={`odo ${className}`} aria-label={value} title={value}>{shown.split('').map((c, i) => /\d/.test(c)
    ? <span key={`${shown.length}-${i}`} className="odo-col" aria-hidden><span style={{ transform: `translateY(-${Number(c) * 10}%)` }}>{'0123456789'.split('').map(d => <b key={d}>{d}</b>)}</span></span>
    : <span key={`${shown.length}-${i}`} aria-hidden>{c}</span>)}</span>;
}
