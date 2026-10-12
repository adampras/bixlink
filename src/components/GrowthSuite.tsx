import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Globe2, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const next = (delay: number) => { t = setTimeout(() => {
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      if (!country || !action) return;
      const [flag, city] = country;
      setItem({ flag, city, action });
      dismiss = setTimeout(() => setItem(null), 6500);
      next(20000 + Math.random() * 20000);
    }, delay); };
    next(8000);
    return () => { clearTimeout(t); if (dismiss) clearTimeout(dismiss); };
  }, [closed]);
  if (!item || closed) return null;
  return <div role="status" className="live-toast fixed bottom-20 left-3 z-40 flex max-w-[300px] items-start gap-3 rounded-2xl border border-primary/40 bg-card/90 p-3 text-xs shadow-lg backdrop-blur-xl md:bottom-6">
    <span className="text-2xl leading-none">{item.flag}</span>
    <div className="min-w-0"><b className="block text-foreground">Visitor from {item.city}</b><span className="text-muted-foreground">{item.action}</span>
      <span className="mt-1 block text-[9px] uppercase tracking-widest text-muted-foreground/80">Community simulation · not a transaction</span></div>
    <Button variant="ghost" size="icon" aria-label="Close activity notices" onClick={() => setClosed(true)} className="size-6 shrink-0 text-muted-foreground"><X size={14}/></Button>
  </div>;
}

/** Decorative global payment routes; never represents live transfers. */
export function HeroFlux() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let w = 0, h = 0, frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      const css = getComputedStyle(canvas.closest('.site-shell') ?? canvas);
      const gold = css.getPropertyValue('--chart-3').trim();
      const green = css.getPropertyValue('--chart-2').trim();
      const violet = css.getPropertyValue('--primary').trim();
      const nodes = [[.08,.19],[.82,.12],[.93,.42],[.75,.84],[.18,.82],[.04,.48],[.48,.06],[.52,.95]];
      const center = {x:w*.5, y:h*.48};
      for (const [i, node] of nodes.entries()) {
        const [nx, ny] = node;
        if (nx === undefined || ny === undefined) continue;
        const end = {x:w*nx, y:h*ny};
        const cp = {x:(center.x+end.x)/2 + (i%2 ? 65 : -65), y:(center.y+end.y)/2 - 60};
        ctx.strokeStyle = i%3 === 0 ? green : gold;
        ctx.globalAlpha = .32; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(center.x,center.y); ctx.quadraticCurveTo(cp.x,cp.y,end.x,end.y); ctx.stroke();
        ctx.globalAlpha = .8;
        ctx.beginPath(); ctx.arc(end.x,end.y,4,0,Math.PI*2); ctx.stroke();
        for (let packet=0;packet<3;packet++) {
          const t = reduced ? .5 : (time / 7000 + i*.12 + packet/3)%1;
          const x = (1-t)**2*center.x + 2*(1-t)*t*cp.x + t*t*end.x;
          const y = (1-t)**2*center.y + 2*(1-t)*t*cp.y + t*t*end.y;
          ctx.fillStyle = packet%2 ? violet : gold; ctx.globalAlpha = .9;
          ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.globalAlpha = .35; ctx.strokeStyle = gold;
      ctx.beginPath(); ctx.ellipse(center.x,center.y,w*.4,h*.36,0,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(center.x,center.y,w*.29,h*.44,-.4,0,Math.PI*2); ctx.stroke();
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="hero-payment-canvas"/>;
}

const ROUND_END = Date.UTC(2026, 9, 31, 15, 59, 59); // 31 Oct 2026 23:59 WITA
const STAGES = [['Round 1', '$0.10', 'Current'], ['Round 2', '$0.13', 'Planned'], ['Round 3', '$0.16', 'Planned'], ['Listing target', '$0.20+', 'Not guaranteed']] as const;

export function HeroPresaleRibbon() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const left = now === null ? 0 : Math.max(0, ROUND_END - now);
  const parts = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
  const fmt = (v: number) => now === null ? '--' : String(v).padStart(2, '0');
  return <div className="hero-ribbon z-10 mt-6 w-full">
    <div className="hero-ribbon-live"><i/><span>ROUND 1 LIVE</span><b className="numeric">{parts.map((v, i) => `${fmt(v)}${['D', 'H', 'M', 'S'][i]}`).join(' : ')}</b></div>
    <div className="hero-ribbon-path numeric">{STAGES.slice(0, 3).map(([n, p], i) => <span key={n} className={i === 0 ? 'is-on' : ''}>{i > 0 && <em>→</em>}{p}</span>)}</div>
    <Link to="/register" className="hero-ribbon-cta">Amankan alokasi</Link>
    <small className="hero-ribbon-note">Harga ronde adalah referensi ledger internal, bukan jaminan listing.</small>
  </div>;
}

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
