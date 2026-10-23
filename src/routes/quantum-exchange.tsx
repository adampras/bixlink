import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { BixShell } from '@/components/BixShell';

export const Route = createFileRoute('/quantum-exchange')({
  head: () => ({ meta: [
    { title: 'Quantum Exchange — Coming Soon · BIXLINK' },
    { name: 'description', content: 'Preview of the BIXLINK Quantum Hybrid Terminal: holographic liquidity radar, depth particles and a simulated execution cockpit.' },
    { property: 'og:title', content: 'BIXLINK Quantum Exchange — Coming Soon' },
    { property: 'og:description', content: 'A futuristic exchange concept preview. Simulation only.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Quantum,
});

const REF = 0.84291;

function Radar() {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT((v) => v + 1), 60); return () => clearInterval(i); }, []);
  const hex = (r: number, rot: number) => Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + rot; return `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
  }).join(' ');
  return <svg viewBox="0 0 200 200" className="q-radar mx-auto aspect-square w-full max-w-xs">
    {[80, 60, 40, 20].map((r, i) => <polygon key={r} points={hex(r, (t / 100) * (i % 2 ? -1 : 1))} className={i % 2 ? 'q-line-violet' : 'q-line-gold'} fill="none" />)}
    <line x1="100" y1="100" x2={100 + 85 * Math.cos(t / 20)} y2={100 + 85 * Math.sin(t / 20)} className="q-line-gold" />
    {Array.from({ length: 8 }, (_, k) => <circle key={k} r="2.5" className="q-dot" cx={100 + (30 + k * 7) * Math.cos(k + t / (30 + k))} cy={100 + (30 + k * 7) * Math.sin(k + t / (30 + k))} />)}
    <text x="100" y="104" textAnchor="middle" className="q-label">BIX/USDT</text>
  </svg>;
}

function Particles() {
  return <div className="q-stream relative h-48 overflow-hidden rounded-xl">
    {Array.from({ length: 28 }, (_, i) => <span key={i} className={i % 2 ? 'q-p q-p-buy' : 'q-p q-p-sell'} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.4}s`, animationDuration: `${2.5 + (i % 5) * 0.6}s` }} />)}
    <div className="absolute inset-x-0 bottom-2 flex justify-between px-3 text-[10px] font-black tracking-widest"><span className="text-primary">▲ BUY FLOW</span><span className="text-muted-foreground">SELL FLOW ▼</span></div>
  </div>;
}

function Cockpit() {
  const [bix, setBix] = useState(1000); const [ms, setMs] = useState<number | null>(null);
  const [seat, setSeat] = useState<string | null>(null);
  return <div className="grid gap-3 text-sm">
    <label className="grid gap-1">Jumlah BIX: <b className="numeric text-2xl text-primary">{bix.toLocaleString()}</b>
      <input type="range" min={10} max={100000} step={10} value={bix} onChange={(e) => { setBix(+e.target.value); setMs(Math.round(Math.random() * 300 + 120) / 1000); }} /></label>
    <p>≈ <b className="numeric text-chart-2">{(bix * REF).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</b> · ref. internal ${REF}{ms !== null && <> · simulasi eksekusi <b className="numeric">{ms} ms</b></>}</p>
    <button type="button" onClick={() => setSeat(`#PIONEER-${String(Math.floor(1000 + Math.random() * 9000))}`)} className="q-seat rounded-full px-5 py-3 text-xs font-black tracking-widest">
      {seat ? `PIONEER SEAT ${seat} · DEMO` : 'CLAIM PIONEER SEAT (DEMO)'}
    </button>
    <p className="text-[11px] text-muted-foreground">Simulasi visual saja. Tidak ada order, dana, atau kursi nyata yang dibuat.</p>
  </div>;
}

function Quantum() {
  return <BixShell>
    <div className="q-stage mx-auto max-w-5xl space-y-5 px-4 py-6">
      <header className="q-head rounded-2xl p-4 text-center">
        <p className="text-[10px] font-black tracking-[0.35em] text-muted-foreground">QUANTUM HYBRID PROTOCOL · STATUS: CORE SYNCING</p>
        <h1 className="q-title mt-2 font-display text-3xl font-black md:text-5xl">BIXLINK QUANTUM EXCHANGE</h1>
        <p className="mt-2 text-sm text-muted-foreground">Konsep exchanger masa depan — <b className="text-primary">COMING SOON</b>. Halaman ini demo visual, belum ada perdagangan nyata.</p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="q-panel rounded-2xl p-4"><h2 className="mb-2 text-xs font-black tracking-widest text-primary">HOLOGRAPHIC LIQUIDITY RADAR</h2><Radar /></section>
        <section className="q-panel rounded-2xl p-4"><h2 className="mb-2 text-xs font-black tracking-widest text-primary">QUANTUM DEPTH STREAM</h2><Particles /></section>
      </div>
      <div className="q-orbit rounded-full py-2 text-center text-[11px] font-black tracking-[0.3em]">HUD ORBIT · ATOMIC LEDGER ENGINE · SIMULATION</div>
      <section className="q-panel rounded-2xl p-5"><h2 className="mb-3 text-xs font-black tracking-widest text-primary">FUTURE EXECUTION COCKPIT</h2><Cockpit /></section>
    </div>
  </BixShell>;
}
