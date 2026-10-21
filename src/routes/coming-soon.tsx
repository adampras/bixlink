import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bot, CreditCard, Rocket, Repeat, Store } from 'lucide-react';
import { BixShell } from '@/components/BixShell';

export const Route = createFileRoute('/coming-soon')({
  head: () => ({ meta: [
    { title: 'Coming Soon Demo — BIXLINK' },
    { name: 'description', content: 'Interactive previews of upcoming BIXLINK features: AI Trading Bot, Virtual Card, Launchpool, Swap & RWA and Merchant Pay.' },
    { property: 'og:title', content: 'Coming Soon Demo — BIXLINK' },
    { property: 'og:description', content: 'Simulation previews of upcoming BIXLINK ecosystem features.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ComingSoon,
});

const Sim = () => <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-black tracking-widest text-primary">SIMULATION · PREVIEW</span>;
const Card = ({ id, icon: I, title, children }: { id: string; icon: typeof Bot; title: string; children: React.ReactNode }) =>
  <section id={id} className="rounded-2xl border border-primary/25 bg-card/70 p-5 shadow-lg backdrop-blur">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-display text-lg font-black text-primary"><I size={20}/>{title}</h2><Sim/></div>{children}
  </section>;

function BotDemo() {
  const [pts, setPts] = useState<number[]>(() => Array.from({ length: 30 }, (_, i) => 50 + Math.sin(i / 3) * 12));
  useEffect(() => { const t = setInterval(() => setPts(p => [...p.slice(1), Math.max(10, Math.min(90, (p[p.length - 1] ?? 50) + (Math.random() - 0.5) * 10))]), 900); return () => clearInterval(t); }, []);
  const last = pts[pts.length - 1] ?? 0, prev = pts[pts.length - 2] ?? 0; const sig = last > prev ? 'BUY' : 'SELL';
  return <><svg viewBox="0 0 290 100" className="h-28 w-full"><polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-chart-2" points={pts.map((v, i) => `${i * 10},${100 - v}`).join(' ')}/></svg>
    <p className="text-sm">Demo signal: <b className={sig === 'BUY' ? 'text-chart-2' : 'text-destructive'}>{sig}</b> · random data, not a trading recommendation.</p></>;
}

function CardDemo() {
  const [flip, setFlip] = useState(false);
  return <button type="button" onClick={() => setFlip(f => !f)} className="mx-auto block aspect-[1.586] w-full max-w-sm rounded-2xl border border-primary/60 bg-gradient-to-br from-background via-card to-primary/30 p-5 text-left shadow-xl transition-transform duration-500" style={{ transform: flip ? 'rotateY(180deg)' : 'none' }}>
    {!flip ? <><b className="font-display text-primary">BIXLINK</b><div className="mt-8 font-mono text-lg tracking-widest">•••• •••• •••• 2026</div><div className="mt-3 text-xs text-muted-foreground">DEMO MEMBER · 10/30</div></>
      : <div style={{ transform: 'rotateY(180deg)' }} className="text-sm text-muted-foreground">Preview card design only. No real card is issued. Tap to flip.</div>}
  </button>;
}

function LaunchDemo() {
  const [bix, setBix] = useState(1000); const [days, setDays] = useState(30);
  const pts = Math.round(bix * days / 100);
  return <div className="grid gap-3 text-sm">
    <label>BIX locked: <b className="numeric">{bix.toLocaleString()}</b><input type="range" min={100} max={50000} step={100} value={bix} onChange={e => setBix(+e.target.value)} className="w-full"/></label>
    <label>Days: <b>{days}</b><input type="range" min={7} max={180} value={days} onChange={e => setDays(+e.target.value)} className="w-full"/></label>
    <p>Example allocation points: <b className="numeric text-chart-2">{pts.toLocaleString()}</b> — illustrative only, no token reward promised.</p>
  </div>;
}

function SwapDemo() {
  const [usdt, setUsdt] = useState(100); const ref = 0.84291;
  return <div className="grid gap-2 text-sm"><label>USDT<input type="number" min={0} value={usdt} onChange={e => setUsdt(+e.target.value)} className="form-input mt-1"/></label>
    <p>≈ <b className="numeric text-chart-2">{(usdt / ref).toFixed(2)} BIX</b> at internal reference ${ref}. RWA assets shown are concepts only.</p></div>;
}

function MerchantDemo() {
  const [paid, setPaid] = useState(false);
  return <div className="grid place-items-center gap-3 text-sm">
    <div className="grid h-32 w-32 grid-cols-6 gap-0.5 rounded-lg bg-foreground p-2">{Array.from({ length: 36 }, (_, i) => <span key={i} className={(i * 7 + 3) % 3 ? 'bg-background' : 'bg-foreground'}/>)}</div>
    <button type="button" onClick={() => setPaid(true)} className="rounded-full bg-primary px-5 py-2 text-xs font-black text-primary-foreground">{paid ? '✓ Demo payment shown' : 'Scan demo QR · Pay 25 BIX'}</button>
    <p className="text-xs text-muted-foreground">No funds move. Merchant partners not yet announced.</p></div>;
}

function ComingSoon() {
  return <BixShell><main className="mx-auto grid max-w-3xl gap-5 px-4 py-10">
    <Link to="/" className="w-fit text-xs font-bold text-primary">← Back to HOME</Link>
    <div><div className="eyebrow">BIXLINK ECOSYSTEM</div><h1 className="section-title">COMING SOON · DEMO</h1><p className="mt-2 text-sm text-muted-foreground">Try interactive previews of features in development. Everything here is a simulation — no balances, trades or payments are created.</p></div>
    <Card id="bot" icon={Bot} title="AI Trading Bot"><BotDemo/></Card>
    <Card id="card" icon={CreditCard} title="BIX Virtual Card"><CardDemo/></Card>
    <Card id="launchpool" icon={Rocket} title="Launchpool"><LaunchDemo/></Card>
    <Card id="swap" icon={Repeat} title="Swap & RWA"><SwapDemo/></Card>
    <Card id="merchant" icon={Store} title="BIX Merchant Pay"><MerchantDemo/></Card>
  </main></BixShell>;
}
