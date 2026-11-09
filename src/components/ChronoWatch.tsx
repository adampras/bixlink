/** RM-style large inspection watch. Display-only: real local time (device zone) + Jakarta dual time + working split-seconds chrono. */
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function partsIn(zone: string, d: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const g = (t: string) => Number(p.find(x => x.type === t)?.value ?? 0);
  return { h: g('hour') % 24, m: g('minute'), s: g('second') };
}
const zoneLabel = (zone: string) => zone.split('/').pop()?.replace(/_/g, ' ') ?? zone;
const fmt = (ms: number) => { const t = Math.max(0, ms); const m = Math.floor(t / 60000), s = Math.floor(t / 1000) % 60, c = Math.floor(t / 10) % 100; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`; };

export type ChronoAction = 'deposit' | 'withdraw' | 'pay';
export function ChronoWatchModal({ onClose, onAction }: { onClose: () => void; onAction?: ((a: ChronoAction) => void) | undefined }) {
  const [now, setNow] = useState(() => new Date());
  const [zone, setZone] = useState('Asia/Jakarta');
  const [run, setRun] = useState(false);
  const [base, setBase] = useState(0);
  const [split, setSplit] = useState<number | null>(null);
  const start = useRef(0);
  const [bezel, setBezel] = useState(0);
  const drag = useRef<{ a: number; b: number } | null>(null);
  const angleAt = (e: React.PointerEvent<SVGGElement>) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height * 170 / 340), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  const onDown = (e: React.PointerEvent<SVGGElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { a: angleAt(e), b: bezel }; };
  const onMove = (e: React.PointerEvent<SVGGElement>) => { if (!drag.current) return; const d = angleAt(e) - drag.current.a; setBezel(Math.round((drag.current.b + d) / 6) * 6); };
  const onUp = () => { drag.current = null; try { navigator.vibrate?.(8); } catch { /* no haptics */ } };
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
          <pattern id="rmwQuartz" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)"><rect width="22" height="22" fill="#f4f3ee"/><path d="M0 5 Q6 1 11 5 T22 5 M0 12 Q6 8 11 13 T22 11 M0 18 Q5 15 11 19 T22 17" stroke="#c9c7bf" strokeWidth="1.3" fill="none"/><path d="M0 8 Q8 6 22 9" stroke="#ffffff" strokeWidth=".8" fill="none" opacity=".9"/></pattern>
          <linearGradient id="rmwCaseShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".35"/></linearGradient>
          <radialGradient id="rmwDial" cx="50%" cy="38%"><stop offset="0" stopColor="#2a2d33"/><stop offset=".7" stopColor="#0d0e11"/><stop offset="1" stopColor="#030304"/></radialGradient>
          <pattern id="rmwCarbon" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#121317"/><path d="M0 0H3V3H0Z M3 3H6V6H3Z" fill="#1d1f25"/></pattern>
          <linearGradient id="rmwTi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e5e7eb"/><stop offset=".5" stopColor="#8b9099"/><stop offset="1" stopColor="#4b5058"/></linearGradient>
          <radialGradient id="rmwRuby" cx="35%" cy="30%"><stop offset="0" stopColor="#ffd1dc"/><stop offset=".35" stopColor="#e11d48"/><stop offset="1" stopColor="#4c0519"/></radialGradient>
          <linearGradient id="rmwDia" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset=".5" stopColor="#cfe8ff"/><stop offset="1" stopColor="#8fb7d9"/></linearGradient>
          <linearGradient id="rmwGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1a8"/><stop offset=".5" stopColor="#d4a017"/><stop offset="1" stopColor="#7a5a00"/></linearGradient>
          <linearGradient id="rmwGlare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".28"/><stop offset=".35" stopColor="#fff" stopOpacity=".04"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset=".85" stopColor="#bfe3ff" stopOpacity=".08"/></linearGradient>
          <filter id="rmwSoft"><feGaussianBlur stdDeviation="1.2"/></filter>
        </defs>
        {/* rubber strap stubs */}
        <path d="M95 0 H205 L198 22 H102Z M95 340 H205 L198 318 H102Z" fill="#1a1a1d"/><path d="M110 0 V20 M150 0 V20 M190 0 V20 M110 340 V320 M150 340 V320 M190 340 V320" stroke="#c8102e" strokeWidth="1.5" opacity=".7"/>
        {/* crown + pushers */}
        <rect x="266" y="150" width="22" height="40" rx="6" fill="#c8102e"/>{Array.from({length:7},(_,i)=><line key={i} x1={268+i*3} y1="152" x2={268+i*3} y2="188" stroke="#7f0a1d" strokeWidth="1"/>)}
        <rect x="262" y="88" width="16" height="22" rx="4" fill="url(#rmwGold)" onClick={doSplit} className="rmw-btn"/>
        <rect x="22" y="88" width="16" height="22" rx="4" fill="#ef4444" onClick={toggle} className="rmw-btn"/>
        <rect x="22" y="230" width="16" height="22" rx="4" fill="#10b981" onClick={reset} className="rmw-btn"/>
        {/* tonneau case: White Quartz TPT with volume shading */}
        <path d="M150 10 C250 10 270 40 272 170 C270 300 250 330 150 330 C50 330 30 300 28 170 C30 40 50 10 150 10Z" fill="url(#rmwQuartz)" stroke="#0b0b0d" strokeWidth="3"/>
        <path d="M150 10 C250 10 270 40 272 170 C270 300 250 330 150 330 C50 330 30 300 28 170 C30 40 50 10 150 10Z" fill="url(#rmwCaseShade)"/>
        {/* diamond-set bezel ring */}
        <path d="M150 30 C235 30 250 55 252 170 C250 285 235 310 150 310 C65 310 50 285 48 170 C50 55 65 30 150 30Z" fill="#0b0b0d" stroke="url(#rmwGold)" strokeWidth="2.4"/>
        {/* rotatable gem-set bezel: drag to turn (clicks every 6°) */}
        <g className="rmw-bezel" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ transform: `rotate(${bezel}deg)`, transformOrigin: '150px 170px' }}>
          <ellipse cx="150" cy="170" rx="99" ry="136" fill="none" stroke="transparent" strokeWidth="16"/>
          {Array.from({ length: 48 }, (_, i) => { const t = i / 48 * Math.PI * 2; const x = 150 + Math.sin(t) * 98, y = 170 - Math.cos(t) * 135; const big = i % 4 === 0; return <g key={i} transform={`translate(${x} ${y}) rotate(${i*7.5})`}><circle r={big ? 4 : 3} fill="url(#rmwGold)"/><path d={big ? 'M0-3.2 L2.8 0 L0 3.2 L-2.8 0Z' : 'M0-2.2 L2 0 L0 2.2 L-2 0Z'} fill="url(#rmwDia)" className="rmw-gem" style={{ animationDelay: `${(i % 8) * .35}s` }}/><path d="M0-2 L0 2 M-2 0 L2 0" stroke="#fff" strokeWidth=".3" opacity=".9"/></g>; })}
          <path d="M150 33 l-4 -6 h8z" fill="#c8102e"/>
        </g>
        {screws.map(([x,y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle r="6.5" fill="url(#rmwTi)" stroke="#1f2937"/><path d="M-3.5 0H3.5M0-3.5V3.5M-2.5-2.5L2.5 2.5M2.5-2.5L-2.5 2.5" stroke="#1f2937" strokeWidth="1.3"/><circle cx="-2" cy="-2" r="1.5" fill="#fff" opacity=".6"/></g>)}
        <path d="M150 42 C228 42 240 62 241 170 C240 278 228 298 150 298 C72 298 60 278 59 170 C60 62 72 42 150 42Z" fill="url(#rmwDial)"/>
        {/* carbon base plate + gear train */}
        <g opacity=".55"><path d="M150 60 C220 60 230 80 230 170 C230 260 220 282 150 282 C80 282 70 260 70 170 C70 80 80 60 150 60Z" fill="url(#rmwCarbon)"/></g>
        {[[105,128,18,`${sec*-12}`],[198,132,13,`${sec*18}`],[110,222,11,`${sec*24}`],[192,240,9,`${sec*-30}`]].map(([x,y,r,rot],i)=><g key={i} transform={`translate(${x} ${y})`}><g style={{transform:`rotate(${rot}deg)`}}>{Array.from({length:16},(_,k)=><rect key={k} x="-1.4" y={-(Number(r)+3)} width="2.8" height="4" fill="url(#rmwGold)" transform={`rotate(${k*22.5})`}/>)}<circle r={Number(r)} fill="#1c1e22" stroke="url(#rmwGold)" strokeWidth="1.5"/><path d={`M${-Number(r)+3} 0H${Number(r)-3}M0 ${-Number(r)+3}V${Number(r)-3}`} stroke="#b8941a" strokeWidth="2"/></g><circle r="3.2" fill="url(#rmwRuby)" stroke="#d4a017" strokeWidth=".8"/></g>)}
        {/* titanium skeleton bridges */}
        <g fill="none" strokeLinecap="round"><g stroke="#2b2e34" strokeWidth="7"><path d="M80 90 L150 170 L220 90"/><path d="M90 260 L150 170 L210 260"/></g><g stroke="url(#rmwTi)" strokeWidth="2.2" opacity=".85"><path d="M80 90 L150 170 L220 90"/><path d="M90 260 L150 170 L210 260"/></g><circle cx="150" cy="170" r="58" stroke="#2b2e34" strokeWidth="5"/><circle cx="150" cy="170" r="58" stroke="url(#rmwTi)" strokeWidth="1.2"/></g>
        {/* ruby jewel bearings on bridges */}
        {[[80,90],[220,90],[90,260],[210,260],[150,112],[92,170],[208,170],[130,200]].map(([x,y])=><g key={`j${x}${y}`} transform={`translate(${x} ${y})`}><circle r="3.6" fill="#c0c4cc"/><circle r="2.6" fill="url(#rmwRuby)"/><circle cx="-.8" cy="-.9" r=".7" fill="#fff"/></g>)}
        {/* indices: diamond baguettes at 12/3/6/9 */}
        {Array.from({ length: 60 }, (_, i) => { const a = (i * 6 - 90) * Math.PI / 180, r1 = i % 5 ? 84 : 76; if (i % 15 === 0) { const x = 150 + Math.cos(a) * 82, y = 170 + Math.sin(a) * 82; return <g key={i} transform={`translate(${x} ${y}) rotate(${i*6})`}><rect x="-2.6" y="-7" width="5.2" height="14" rx="1" fill="url(#rmwDia)" stroke="#d4a017" strokeWidth=".6"/><path d="M-2.6-7 L2.6 7 M2.6-7 L-2.6 7" stroke="#fff" strokeWidth=".3"/></g>; } return <line key={i} x1={150 + Math.cos(a) * r1} y1={170 + Math.sin(a) * r1} x2={150 + Math.cos(a) * 88} y2={170 + Math.sin(a) * 88} stroke={i % 5 ? '#6b7280' : '#e5e7eb'} strokeWidth={i % 5 ? .8 : 2.2}/>; })}
        {/* 18K gold engraved chapter ring + pavé diamonds on the inner flange */}
        <ellipse cx="150" cy="170" rx="90" ry="124" fill="none" stroke="url(#rmwGold)" strokeWidth="1.2" opacity=".85"/>
        {Array.from({ length: 24 }, (_, i) => { const t = (i + .5) / 24 * Math.PI * 2; return <circle key={`p${i}`} cx={150 + Math.sin(t) * 93} cy={170 - Math.cos(t) * 127} r="1.3" fill="url(#rmwDia)" className="rmw-gem" style={{ animationDelay: `${(i % 6) * .5}s` }}/>; })}
        <text x="150" y="72" textAnchor="middle" className="rmw-brand">RM 50-04</text>
        <text x="150" y="84" textAnchor="middle" className="rmw-sub">BIXLINK · SPLIT-SECONDS</text>
        {/* torque + power reserve arcs */}
        <path d="M78 140 A30 30 0 0 1 108 108" stroke="#222" strokeWidth="5" fill="none"/>
        <path d="M78 140 A30 30 0 0 1 108 108" stroke="#22c55e" strokeWidth="5" fill="none" pathLength={1} strokeDasharray={`${sec / 60} 1`}/>
        <path d="M192 108 A30 30 0 0 1 222 140" stroke="#222" strokeWidth="5" fill="none"/>
        <path d="M192 108 A30 30 0 0 1 222 140" stroke="#facc15" strokeWidth="5" fill="none" pathLength={1} strokeDasharray={`${min / 60} 1`}/>
        {/* Jakarta dual-time subdial */}
        <g transform="translate(205 182)"><circle r="20" fill="#0d0e10" stroke="url(#rmwGold)" strokeWidth="1.4"/>{Array.from({length:12},(_,k)=><circle key={k} r=".9" fill="#e5e7eb" transform={`rotate(${k*30}) translate(0 -16)`}/>)}<text y="-6" textAnchor="middle" className="rmw-tiny">JKT</text><line y2="-14" stroke="#facc15" strokeWidth="2" strokeLinecap="round" style={{ transform: `rotate(${jh * 30}deg)` }}/><circle r="2" fill="url(#rmwRuby)"/></g>
        {/* flying tourbillon at 6 with sapphire cage */}
        <g transform="translate(150 248)"><circle r="28" fill="#050506" stroke="url(#rmwGold)" strokeWidth="1.2"/><circle r="26" fill="none" stroke="#c8102e" strokeWidth="2"/>
          <g style={{ transform: `rotate(${sec * 6}deg)` }}><path d="M0-22V22M-19-11L19 11M19-11L-19 11" stroke="url(#rmwTi)" strokeWidth="2.4"/><circle r="11" fill="none" stroke="url(#rmwGold)" strokeWidth="1.6" style={{ transform: `scaleX(${Math.cos(ms / 125 * Math.PI)})` }}/>{[0,120,240].map(d=><circle key={d} r="2" fill="url(#rmwRuby)" transform={`rotate(${d}) translate(0 -19)`}/>)}</g>
          <circle r="3" fill="url(#rmwRuby)"/></g>
        {/* W-N-H selector */}
        <g transform="translate(232 222)" className="rmw-tiny"><text y="0">W</text><text y="10" fill="#facc15">N</text><text y="20">H</text></g>
        {/* skeletonized hands with lume */}
        <g style={hand(hr * 30)}><line x1="150" y1="180" x2="150" y2="116" stroke="url(#rmwTi)" strokeWidth="7" strokeLinecap="round"/><line x1="150" y1="160" x2="150" y2="120" stroke="#ecfccb" strokeWidth="2.4" strokeLinecap="round"/></g>
        <g style={hand(min * 6)}><line x1="150" y1="182" x2="150" y2="94" stroke="url(#rmwTi)" strokeWidth="5" strokeLinecap="round"/><line x1="150" y1="160" x2="150" y2="98" stroke="#ecfccb" strokeWidth="1.8" strokeLinecap="round"/></g>
        <line x1="150" y1="186" x2="150" y2="86" stroke="#9ca3af" strokeWidth="1.2" style={hand(sec * 6)}/>
        <line x1="150" y1="190" x2="150" y2="84" stroke="#facc15" strokeWidth="1.8" style={hand(splitDeg)}/>
        <line x1="150" y1="190" x2="150" y2="84" stroke="#ef4444" strokeWidth="2" style={hand(chronoDeg)}/>
        <circle cx="150" cy="170" r="7" fill="url(#rmwGold)"/><circle cx="150" cy="170" r="4" fill="url(#rmwRuby)"/>
        {/* domed sapphire crystal glare */}
        <path d="M150 42 C228 42 240 62 241 170 C240 278 228 298 150 298 C72 298 60 278 59 170 C60 62 72 42 150 42Z" fill="url(#rmwGlare)" pointerEvents="none"/>
        <path d="M80 70 C110 50 170 48 210 62" stroke="#fff" strokeWidth="3" fill="none" opacity=".25" filter="url(#rmwSoft)" pointerEvents="none"/>
        <text x="150" y="324" textAnchor="middle" className="rmw-sub" fill="#0b0b0d">QUARTZ TPT® · GRADE 5 TI · RUBY JEWELS</text>
      </svg>
      <div className="rmw-readout">
        <div><small>WAKTU LOKAL · {zoneLabel(zone)}</small><b className="numeric">{local}</b></div>
        <div><small>JAKARTA · WIB</small><b className="numeric">{jakarta}</b></div>
        <div><small>ZONA</small><b className="numeric">{zoneLabel(zone)}</b></div>
      </div>
      <div className="rmw-actions">
        <button type="button" onClick={() => { onClose(); onAction?.('deposit'); }} className="is-green">DEPOSIT</button>
        <button type="button" onClick={() => { onClose(); onAction?.('withdraw'); }} className="is-red">WITHDRAWAL</button>
        <button type="button" onClick={() => { onClose(); onAction?.('pay'); }} className="is-yellow">BIXPAY</button>
      </div>
    </div>
  </div>, document.body);
}

/** Telemetry header badge: tiny live dial (device local time) that opens the large watch. Only visible with chrono on. */
export function ChronoBadge({ tone = '#ef4444', label }: { tone?: string; label: string }) {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => { const u = () => { if (!document.hidden) setT(new Date()); }; u(); const id = window.setInterval(u, 1000); return () => window.clearInterval(id); }, []);
  const s = t ? t.getSeconds() : 0, m = t ? t.getMinutes() + s / 60 : 0, h = t ? (t.getHours() % 12) + m / 60 : 0;
  return <span className="chrono-tap chrono-only rm-badge">
    <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#08080a" stroke={tone} strokeWidth="2"/>
      <line x1="20" y1="20" x2="20" y2="10" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${h * 30} 20 20)`}/>
      <line x1="20" y1="20" x2="20" y2="6" stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${m * 6} 20 20)`}/>
      <line x1="20" y1="22" x2="20" y2="5" stroke={tone} strokeWidth="1" transform={`rotate(${s * 6} 20 20)`}/>
      <circle cx="20" cy="20" r="2" fill={tone}/>
    </svg>
    <span><b>{label}</b><small className="numeric">{t ? t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '--:--'}</small></span>
  </span>;
}

/** Wrap any mini chrono ornament to make it open the large watch on tap. */
export function ChronoTap({ children, className = '', onAction }: { children: ReactNode; className?: string; onAction?: ((a: ChronoAction) => void) | undefined }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={`chrono-tap ${className}`} onClick={() => setOpen(true)} aria-label="Buka jam RM 50-04">{children}</button>
    {open && <ChronoWatchModal onClose={() => setOpen(false)} onAction={onAction}/>}
  </>;
}
