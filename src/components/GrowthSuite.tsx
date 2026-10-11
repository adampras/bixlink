import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Globe2, Timer, X } from 'lucide-react';

const COUNTRIES = [
  ['🇨🇳', 'Shanghai'], ['🇲🇾', 'Kuala Lumpur'], ['🇮🇩', 'Jakarta'], ['🇻🇳', 'Ho Chi Minh'], ['🇦🇪', 'Dubai'], ['🇰🇷', 'Seoul'],
  ['🇯🇵', 'Tokyo'], ['🇸🇬', 'Singapore'], ['🇿🇦', 'Johannesburg'], ['🇧🇷', 'São Paulo'], ['🇹🇭', 'Bangkok'],
] as const;
const ACTIONS = [
  'explored the presale calculator', 'opened the BIXLINK whitepaper', 'viewed the Sovereign $100K tier',
  'joined the Fox community', 'compared staking packages', 'opened the registration page', 'read the Trust Center',
];

/** Community-interest notices. Clearly labelled as simulated activity; never claims purchases or deposits. */
export function LiveActivityToast() {
  const [item, setItem] = useState<{ flag: string; city: string; action: string } | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (closed) return;
    let t: ReturnType<typeof setTimeout>;
    const next = (delay: number) => { t = setTimeout(() => {
      const [flag, city] = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      setItem({ flag, city, action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)] });
      setTimeout(() => setItem(null), 6500);
      next(20000 + Math.random() * 20000);
    }, delay); };
    next(8000);
    return () => clearTimeout(t);
  }, [closed]);
  if (!item || closed) return null;
  return <div role="status" className="live-toast fixed bottom-20 left-3 z-40 flex max-w-[300px] items-start gap-3 rounded-2xl border border-primary/40 bg-card/90 p-3 text-xs shadow-lg backdrop-blur-xl md:bottom-6">
    <span className="text-2xl leading-none">{item.flag}</span>
    <div className="min-w-0"><b className="block text-foreground">Visitor from {item.city}</b><span className="text-muted-foreground">{item.action}</span>
      <span className="mt-1 block text-[9px] uppercase tracking-widest text-muted-foreground/80">Community simulation · not a transaction</span></div>
    <button aria-label="Close activity notices" onClick={() => setClosed(true)} className="text-muted-foreground"><X size={14}/></button>
  </div>;
}

/** Canvas "neural payment grid": gold/violet nodes linked like transaction routes. Decorative only. */
export function HeroFlux() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const css = getComputedStyle(document.documentElement);
    const gold = css.getPropertyValue('--primary').trim() || '#FFD700';
    const violet = css.getPropertyValue('--accent').trim() || '#A855F7';
    let w = 0, h = 0, raf = 0; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const n = w < 640 ? 34 : 70;
    const pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
    const pulses: { a: number; b: number; t: number }[] = [];
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.hypot(dx, dy);
        if (d < 130) { ctx.globalAlpha = (1 - d / 130) * .35; ctx.strokeStyle = (i + j) % 3 ? gold : violet; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          if (Math.random() < .0008 && pulses.length < 14) pulses.push({ a: i, b: j, t: 0 }); }
      }
      ctx.globalAlpha = .8; for (const p of pts) { ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.3); ctx.fill(); }
      for (let k = pulses.length - 1; k >= 0; k--) { const q = pulses[k]; q.t += .02; if (q.t >= 1) { pulses.splice(k, 1); continue; }
        const a = pts[q.a], b = pts[q.b]; ctx.globalAlpha = 1; ctx.fillStyle = violet; ctx.shadowColor = violet; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * q.t, a.y + (b.y - a.y) * q.t, 2.4, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[100vh] w-full opacity-60"/>;
}

const ROUND_END = Date.UTC(2026, 9, 31, 15, 59, 59); // 31 Oct 2026 23:59 WITA
const STAGES = [['Round 1', '$0.10', 'Current'], ['Round 2', '$0.13', 'Planned'], ['Round 3', '$0.16', 'Planned'], ['Listing target', '$0.20+', 'Not guaranteed']] as const;

export function PresaleStageBar() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const left = now === null ? 0 : Math.max(0, ROUND_END - now);
  const parts = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
  return <section className="relative z-10 mx-auto max-w-7xl px-5 py-6 md:px-8"><div className="rounded-3xl border border-primary/40 bg-card/80 p-5 backdrop-blur-xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="eyebrow"><Globe2 size={13}/> PRE-TGE PRESALE</div><h2 className="font-display text-xl font-black">Round 1 closes in</h2></div>
      <div className="flex gap-2 numeric">{parts.map((v, i) => <div key={i} className="min-w-14 rounded-xl border border-border bg-background/60 px-2 py-2 text-center"><b className="block text-2xl text-primary">{now === null ? '--' : String(v).padStart(2, '0')}</b><span className="text-[9px] uppercase text-muted-foreground">{['Days', 'Hrs', 'Min', 'Sec'][i]}</span></div>)}</div></div>
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{STAGES.map(([n, p, s], i) => <div key={n} className={`rounded-xl border p-3 ${i === 0 ? 'border-primary bg-primary/10' : 'border-border'}`}><span className="text-[10px] uppercase text-muted-foreground">{n}</span><b className="numeric block text-lg">{p}</b><small className={i === 0 ? 'text-primary' : 'text-muted-foreground'}>{s}</small></div>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Timer size={12}/> Planned round prices are internal ledger references. Listing price and returns are not guaranteed.</p><Link to="/register" className="rounded-full bg-primary px-5 py-2 text-xs font-black text-primary-foreground">Secure Round 1 allocation</Link></div>
  </div></section>;
}
