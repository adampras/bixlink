/** RM-style large inspection watch. Display-only: real local time (device zone) + Jakarta dual time + working split-seconds chrono. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function partsIn(zone: string, d: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const g = (t: string) => Number(p.find(x => x.type === t)?.value ?? 0);
  return { h: g('hour') % 24, m: g('minute'), s: g('second') };
}
const zoneLabel = (zone: string) => zone.split('/').pop()?.replace(/_/g, ' ') ?? zone;
const fmt = (ms: number) => { const t = Math.max(0, ms); const m = Math.floor(t / 60000), s = Math.floor(t / 1000) % 60, c = Math.floor(t / 10) % 100; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`; };

export function ChronoWatchModal({ onClose }: { onClose: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const [zone, setZone] = useState('Asia/Jakarta');
  const [run, setRun] = useState(false);
  const [base, setBase] = useState(0);
  const [split, setSplit] = useState<number | null>(null);
  const start = useRef(0);
  useEffect(() => { try { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'); } catch { /* keep Jakarta */ } }, []);
  useEffect(() => {
    let raf = 0; const tick = () => { if (!document.hidden) setNow(new Date()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const ms = now.getMilliseconds();
  const loc = partsIn(zone, now), jkt = partsIn('Asia/Jakarta', now);
  const sec = loc.s + ms / 1000, min = loc.m + sec / 60, hr = (loc.h % 12) + min / 60;
  const jh = (jkt.h % 12) + jkt.m / 60;
  const elapsed = base + (run ? now.getTime() - start.current : 0);
  const chronoDeg = (elapsed / 1000) * 6;
  const splitDeg = split === null ? chronoDeg : (split / 1000) * 6;
  const toggle = () => { if (run) { setBase(elapsed); setRun(false); } else { start.current = Date.now(); setRun(true); } };
  const doSplit = () => { if (!run && !elapsed) return; setSplit(s => s === null ? elapsed : null); };
  const reset = () => { if (run) return; setBase(0); setSplit(null); };
  const hand = (deg: number) => ({ transform: `rotate(${deg}deg)`, transformOrigin: '150px 170px' });
  const screws = [[60,48],[240,48],[42,170],[258,170],[60,292],[240,292]];
  const local = new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  const jakarta = new Intl.DateTimeFormat(undefined, { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(now);

  return createPortal(<div className="rmw-backdrop" role="dialog" aria-modal="true" aria-label="RM 50-04 chronograph" onClick={onClose}>
    <div className="rmw-stage" onClick={e => e.stopPropagation()}>
      <button type="button" className="rmw-close" onClick={onClose} aria-label="Tutup">✕</button>
      <svg viewBox="0 0 300 340" className="rmw-svg">
        <defs>
          <pattern id="rmwQuartz" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><rect width="14" height="14" fill="#f3f3f0"/><path d="M0 4 Q7 1 14 4 M0 10 Q7 7 14 10" stroke="#cfcfca" strokeWidth="1.6" fill="none"/></pattern>
          <radialGradient id="rmwDial" cx="50%" cy="40%"><stop offset="0" stopColor="#24262b"/><stop offset="1" stopColor="#060607"/></radialGradient>
          <linearGradient id="rmwGlare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".22"/><stop offset=".4" stopColor="#fff" stopOpacity="0"/></linearGradient>
        </defs>
        {/* crown + pushers */}
        <rect x="266" y="150" width="22" height="40" rx="6" fill="#c8102e"/><rect x="270" y="154" width="14" height="32" rx="4" fill="#111" opacity=".5"/>
        <rect x="262" y="88" width="16" height="22" rx="4" fill="#facc15" onClick={doSplit} className="rmw-btn"/>
        <rect x="22" y="88" width="16" height="22" rx="4" fill="#ef4444" onClick={toggle} className="rmw-btn"/>
        <rect x="22" y="230" width="16" height="22" rx="4" fill="#10b981" onClick={reset} className="rmw-btn"/>
        {/* tonneau case */}
        <path d="M150 10 C250 10 270 40 272 170 C270 300 250 330 150 330 C50 330 30 300 28 170 C30 40 50 10 150 10Z" fill="url(#rmwQuartz)" stroke="#0b0b0d" strokeWidth="3"/>
        <path d="M150 30 C235 30 250 55 252 170 C250 285 235 310 150 310 C65 310 50 285 48 170 C50 55 65 30 150 30Z" fill="#0b0b0d" stroke="#c8102e" strokeWidth="2"/>
        {screws.map(([x,y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle r="6" fill="#9ca3af" stroke="#1f2937"/><path d="M-3.5 0H3.5M0-3.5V3.5M-2.5-2.5L2.5 2.5M2.5-2.5L-2.5 2.5" stroke="#1f2937" strokeWidth="1.2"/></g>)}
        <path d="M150 42 C228 42 240 62 241 170 C240 278 228 298 150 298 C72 298 60 278 59 170 C60 62 72 42 150 42Z" fill="url(#rmwDial)"/>
        {/* skeleton bridges */}
        <g stroke="#3a3d44" strokeWidth="5" fill="none" opacity=".9"><path d="M80 90 L150 170 L220 90"/><path d="M90 260 L150 170 L210 260"/><circle cx="150" cy="170" r="58"/></g>
        <g fill="#1c1e22" stroke="#4b5563"><circle cx="105" cy="128" r="16"/><circle cx="198" cy="132" r="12"/><circle cx="110" cy="220" r="10"/></g>
        {/* indices */}
        {Array.from({ length: 60 }, (_, i) => { const a = (i * 6 - 90) * Math.PI / 180, r1 = i % 5 ? 84 : 76; return <line key={i} x1={150 + Math.cos(a) * r1} y1={170 + Math.sin(a) * r1} x2={150 + Math.cos(a) * 88} y2={170 + Math.sin(a) * 88} stroke={i % 15 ? '#9ca3af' : '#facc15'} strokeWidth={i % 5 ? 1 : 2.5}/>; })}
        <text x="150" y="72" textAnchor="middle" className="rmw-brand">RM 50-04</text>
        <text x="150" y="84" textAnchor="middle" className="rmw-sub">BIXLINK · SPLIT-SECONDS</text>
        {/* torque arc 10 o'clock (minute progress) + power reserve 2 o'clock (hour progress) */}
        <path d="M78 140 A30 30 0 0 1 108 108" stroke="#222" strokeWidth="5" fill="none"/>
        <path d="M78 140 A30 30 0 0 1 108 108" stroke="#22c55e" strokeWidth="5" fill="none" pathLength={1} strokeDasharray={`${sec / 60} 1`}/>
        <path d="M192 108 A30 30 0 0 1 222 140" stroke="#222" strokeWidth="5" fill="none"/>
        <path d="M192 108 A30 30 0 0 1 222 140" stroke="#facc15" strokeWidth="5" fill="none" pathLength={1} strokeDasharray={`${min / 60} 1`}/>
        {/* Jakarta dual-time subdial at 3 */}
        <g transform="translate(205 182)"><circle r="20" fill="#0d0e10" stroke="#facc15" strokeWidth="1"/><text y="-8" textAnchor="middle" className="rmw-tiny">JKT</text><line y2="-14" stroke="#facc15" strokeWidth="2" strokeLinecap="round" style={{ transform: `rotate(${jh * 30}deg)` }}/><circle r="2" fill="#facc15"/></g>
        {/* tourbillon at 6 */}
        <g transform="translate(150 248)"><circle r="26" fill="#08080a" stroke="#c8102e" strokeWidth="2"/>
          <g style={{ transform: `rotate(${sec * 6}deg)` }}><path d="M0-22V22M-19-11L19 11M19-11L-19 11" stroke="#d4d4d8" strokeWidth="2.2"/><circle r="9" fill="none" stroke="#facc15" strokeWidth="1.5" style={{ transform: `scaleX(${Math.cos(ms / 125 * Math.PI)})` }}/></g>
          <circle r="2.5" fill="#c8102e"/></g>
        {/* W-N-H selector */}
        <g transform="translate(232 222)" className="rmw-tiny"><text y="0">W</text><text y="10" fill="#facc15">N</text><text y="20">H</text></g>
        {/* hands */}
        <line x1="150" y1="178" x2="150" y2="118" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" style={hand(hr * 30)}/>
        <line x1="150" y1="180" x2="150" y2="96" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" style={hand(min * 6)}/>
        <line x1="150" y1="186" x2="150" y2="86" stroke="#9ca3af" strokeWidth="1.2" style={hand(sec * 6)}/>
        <line x1="150" y1="190" x2="150" y2="84" stroke="#facc15" strokeWidth="1.8" style={hand(splitDeg)}/>
        <line x1="150" y1="190" x2="150" y2="84" stroke="#ef4444" strokeWidth="2" style={hand(chronoDeg)}/>
        <circle cx="150" cy="170" r="6" fill="#c8102e" stroke="#f8fafc" strokeWidth="1.5"/>
        <path d="M150 42 C228 42 240 62 241 170 C240 278 228 298 150 298 C72 298 60 278 59 170 C60 62 72 42 150 42Z" fill="url(#rmwGlare)" pointerEvents="none"/>
        <text x="150" y="318" textAnchor="middle" className="rmw-sub" fill="#0b0b0d">KIMI RÄIKKÖNEN EDITION</text>
      </svg>
      <div className="rmw-readout">
        <div><small>WAKTU LOKAL · {zoneLabel(zone)}</small><b className="numeric">{local}</b></div>
        <div><small>JAKARTA · WIB</small><b className="numeric">{jakarta}</b></div>
        <div><small>CHRONO{split !== null ? ' · SPLIT' : ''}</small><b className="numeric">{fmt(split ?? elapsed)}</b></div>
      </div>
      <div className="rmw-actions">
        <button type="button" onClick={toggle} className="is-red">{run ? 'STOP' : 'START'}</button>
        <button type="button" onClick={doSplit} className="is-yellow">SPLIT</button>
        <button type="button" onClick={reset} disabled={run} className="is-green">RESET</button>
      </div>
    </div>
  </div>, document.body);
}

/** Telemetry header badge: tiny live dial (device local time) that opens the large watch. Only visible with chrono on. */
export function ChronoBadge({ tone = '#ef4444', label }: { tone?: string; label: string }) {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => { const u = () => { if (!document.hidden) setT(new Date()); }; u(); const id = window.setInterval(u, 1000); return () => window.clearInterval(id); }, []);
  const s = t ? t.getSeconds() : 0, m = t ? t.getMinutes() + s / 60 : 0, h = t ? (t.getHours() % 12) + m / 60 : 0;
  return <ChronoTap className="chrono-only rm-badge">
    <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#08080a" stroke={tone} strokeWidth="2"/>
      <line x1="20" y1="20" x2="20" y2="10" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${h * 30} 20 20)`}/>
      <line x1="20" y1="20" x2="20" y2="6" stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${m * 6} 20 20)`}/>
      <line x1="20" y1="22" x2="20" y2="5" stroke={tone} strokeWidth="1" transform={`rotate(${s * 6} 20 20)`}/>
      <circle cx="20" cy="20" r="2" fill={tone}/>
    </svg>
    <span><b>{label}</b><small className="numeric">{t ? t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '--:--'}</small></span>
  </ChronoTap>;
}

/** Wrap any mini chrono ornament to make it open the large watch on tap. */
export function ChronoTap({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={`chrono-tap ${className}`} onClick={() => setOpen(true)} aria-label="Buka jam RM 50-04">{children}</button>
    {open && <ChronoWatchModal onClose={() => setOpen(false)}/>}
  </>;
}
