import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Cpu, Gauge, Zap } from 'lucide-react';
import { BixShell } from '@/components/BixShell';

export const Route = createFileRoute('/mining')({
  head: () => ({ meta: [
    { title: 'BIX Quantum Mining — Coming Soon · BIXLINK' },
    { name: 'description', content: 'Preview of BIX Cloud Hashrate rigs: Nano, Pro and Quantum ASIC Master tiers with halving-based BIX emission. Coming soon.' },
    { property: 'og:title', content: 'BIX Quantum Mining — Coming Soon' },
    { property: 'og:description', content: 'Cloud hashrate rig concept for the BIXCOIN ecosystem. Preview only.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Mining,
});

const RIGS = [
  { name: 'FOX RIG NANO', th: 10, price: 300, icon: Cpu, note: 'Starter cloud rig' },
  { name: 'FOX RIG PRO', th: 50, price: 1500, icon: Gauge, note: 'For active leaders' },
  { name: 'QUANTUM FOX ASIC MASTER', th: 250, price: 10000, icon: Zap, note: 'Master Node certificate' },
];
const POOL = 3_150_000; // planned mining pool reference
const EPOCHS = [{ e: 'Epoch 1', r: 1 }, { e: 'Epoch 2', r: 0.5 }, { e: 'Epoch 3', r: 0.25 }, { e: 'Epoch 4', r: 0.125 }];
const BIX_PER_TH_DAY = 0.12; // illustrative epoch-1 emission

function Mining() {
  const [th, setTh] = useState(50); const [epoch, setEpoch] = useState(0);
  const [spin, setSpin] = useState(0);
  useEffect(() => { const i = setInterval(() => setSpin((s) => s + 1), 80); return () => clearInterval(i); }, []);
  const daily = th * BIX_PER_TH_DAY * EPOCHS[epoch].r;

  return <BixShell>
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <header className="q-head rounded-2xl p-5 text-center">
        <p className="text-[10px] font-black tracking-[0.35em] text-muted-foreground">BIXCOIN ECOSYSTEM · PHASE 2</p>
        <h1 className="q-title mt-2 font-display text-3xl font-black md:text-5xl">BIX QUANTUM MINING</h1>
        <p className="mt-2 text-sm text-muted-foreground">Virtual cloud hashrate rigs — no hardware, power or maintenance. <b className="text-primary">COMING SOON</b>.</p>
        <svg viewBox="0 0 120 120" className="mx-auto mt-4 h-28 w-28">
          {[50, 38, 26].map((r, i) => <circle key={r} cx="60" cy="60" r={r} fill="none" className={i % 2 ? 'q-line-violet' : 'q-line-gold'} strokeDasharray="6 8" transform={`rotate(${spin * (i % 2 ? -3 : 3)} 60 60)`} />)}
          <text x="60" y="65" textAnchor="middle" className="q-label">TH/s</text>
        </svg>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {RIGS.map(({ name, th: t, price, icon: I, note }) =>
          <section key={name} className="q-panel rounded-2xl p-4 text-center">
            <I className="mx-auto text-primary" size={28} />
            <h2 className="mt-2 text-xs font-black tracking-widest text-primary">{name}</h2>
            <p className="numeric mt-1 text-3xl font-black">{t} <span className="text-sm">TH/s</span></p>
            <p className="text-xs text-muted-foreground">{note}</p>
            <p className="numeric mt-2 text-sm">Planned price <b className="text-chart-2">${price.toLocaleString()} USDT</b></p>
            <button type="button" disabled className="mt-3 w-full rounded-full border border-primary/50 py-2 text-[11px] font-black tracking-widest text-primary opacity-80">PRE-ORDER · COMING SOON</button>
          </section>)}
      </div>

      <section className="q-panel space-y-3 rounded-2xl p-5">
        <h2 className="text-xs font-black tracking-widest text-primary">HASHRATE PROJECTION SIMULATOR</h2>
        <label className="grid gap-1 text-sm">Hashrate: <b className="numeric text-2xl text-primary">{th} TH/s</b>
          <input type="range" min={10} max={500} step={10} value={th} onChange={(e) => setTh(+e.target.value)} /></label>
        <div className="flex flex-wrap gap-1">{EPOCHS.map((x, i) =>
          <button key={x.e} type="button" onClick={() => setEpoch(i)} className={`rounded-full border px-3 py-1 text-[11px] font-black ${epoch === i ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{x.e} · ×{x.r}</button>)}</div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg border border-border p-2">Daily<br /><b className="numeric text-primary">{daily.toFixed(2)} BIX</b></div>
          <div className="rounded-lg border border-border p-2">30 days<br /><b className="numeric text-primary">{(daily * 30).toFixed(1)} BIX</b></div>
          <div className="rounded-lg border border-border p-2">360 days<br /><b className="numeric text-primary">{(daily * 360).toFixed(0)} BIX</b></div>
        </div>
        <p className="text-[11px] text-muted-foreground">Projection only. Emission halves each epoch and is capped by a planned {POOL.toLocaleString()} BIX mining pool. Final rig terms, prices and rates are not set; no rigs are sold and no BIX is mined yet.</p>
      </section>

      <section className="q-panel grid gap-2 rounded-2xl p-5 text-sm md:grid-cols-2">
        <div><h3 className="text-xs font-black tracking-widest text-primary">FOR MEMBERS</h3>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground"><li>Ownership-style hashrate, no hardware</li><li>Early joiners mine in higher epochs</li><li>Optional compound into more hashrate</li></ul></div>
        <div><h3 className="text-xs font-black tracking-widest text-primary">FOR THE ECOSYSTEM</h3>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground"><li>Fixed pool — no uncapped inflation</li><li>Halving schedule protects scarcity</li><li>Connects to Quantum Exchange at launch</li></ul></div>
      </section>
      <div className="text-center"><Link to="/quantum-exchange" className="q-seat inline-block rounded-full px-5 py-3 text-xs font-black tracking-widest">VIEW QUANTUM EXCHANGE →</Link></div>
    </div>
  </BixShell>;
}
