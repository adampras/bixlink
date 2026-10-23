import { useState } from 'react';
import { ShieldCheck, Layers, Globe2, Orbit, Atom, X } from 'lucide-react';

type Phase = { year: string; title: string; status: 'IN PROGRESS' | 'DEVELOPMENT' | 'SCHEDULED' | 'VISION'; Icon: typeof ShieldCheck; tech: string[]; metric: string; brief: string };

const phases: Phase[] = [
  { year: '2026', title: 'Genesis & Vault Security', status: 'IN PROGRESS', Icon: ShieldCheck, metric: '21M fixed supply · 1M BIX reserve lock',
    tech: ['Fixed-supply BEP-20 (no mint, no backdoor)', 'Independent tier-1 security audit', 'Transparent 1,000,000 BIX reserve vault', 'DEX seed liquidity & oracle price feeds'],
    brief: 'Deploy the fixed-supply contract from the owner wallet, publish the address only after deployment, commission an independent audit and lock the protocol reserve with public verification.' },
  { year: '2027', title: 'L3 zk-Rollup & DePIN Compute', status: 'DEVELOPMENT', Icon: Layers, metric: 'Low-fee micro-transactions',
    tech: ['Layer-3 zero-knowledge rollup research', 'DePIN compute nodes for Fox AI & BIX Studio', 'Decentralized media storage', 'Non-custodial Auric card partnership'],
    brief: 'Explore a zk-rollup execution layer for in-app micro-transactions and a DePIN network that lets community nodes contribute compute and storage to AI and creative tools.' },
  { year: '2028', title: 'RWA Vaults & Omni-Chain', status: 'SCHEDULED', Icon: Globe2, metric: 'Multi-chain interoperability',
    tech: ['Real-world asset vaults with licensed partners', 'Cross-chain messaging (LayerZero / CCIP class)', 'ERC-4337 account abstraction', 'MPC multi-signature treasury'],
    brief: 'Pursue tokenized real-world asset vaults only through regulated partners, connect BIX across major chains without centralized bridges and simplify wallets with smart accounts.' },
  { year: '2029', title: 'Spatial Metaverse & DAO', status: 'VISION', Icon: Orbit, metric: 'Community on-chain governance',
    tech: ['WebGL / VR BIX Spatial District', 'Virtual trading floor & member lounges', 'Fox AI agent assistants', 'Progressive DAO governance transition'],
    brief: 'Build an immersive 3D district for events, education and community, and progressively move protocol decisions to on-chain voting by token holders.' },
  { year: '2030', title: 'Post-Quantum Global Settlement', status: 'VISION', Icon: Atom, metric: 'Resilient settlement protocol',
    tech: ['NIST post-quantum cryptography migration', 'Fee-burn deflation mechanism', 'Multi-asset settlement network', 'No single point of failure'],
    brief: 'Prepare the ledger for post-quantum signature standards and evolve BIXLINK into an independent multi-asset settlement protocol, subject to research and regulation.' },
];

const tone: Record<Phase['status'], string> = {
  'IN PROGRESS': 'text-chart-3 border-chart-3/50 bg-chart-3/10',
  DEVELOPMENT: 'text-primary border-primary/50 bg-primary/10',
  SCHEDULED: 'text-chart-2 border-chart-2/50 bg-chart-2/10',
  VISION: 'text-muted-foreground border-border bg-card',
};

export function PreTgeRoadmap() {
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const p = phases[sel] ?? phases[0]!;
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="eyebrow">PROTOCOL ROADMAP · 2026 – 2030</div>
      <h2 className="section-title">GLOBAL <span>ROADMAP</span></h2>
      <p className="mt-2 text-xs text-muted-foreground">From Genesis security to a global settlement protocol. The smart contract is not yet deployed; in-app balances are internal ledger records.</p>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {phases.map((x, i) => (
          <button key={x.year} role="tab" aria-selected={i === sel} onClick={() => setSel(i)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-black tracking-wider backdrop-blur transition ${i === sel ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'border-border bg-card/60 text-muted-foreground'}`}>{x.year}</button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 block w-full rounded-2xl border border-primary/40 bg-card/70 p-5 text-left backdrop-blur transition active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/50 bg-primary/10 text-primary"><p.Icon size={22}/></span>
            <div><div className="text-[10px] font-bold tracking-[0.2em] text-primary">PHASE {sel + 1} · {p.year}</div><b className="text-base">{p.title}</b></div>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone[p.status]}`}>{p.status}</span>
        </div>
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {p.tech.map(t => <li key={t} className="flex gap-2 text-xs text-muted-foreground"><span className="text-primary">◆</span>{t}</li>)}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
          <span className="font-bold text-foreground">{p.metric}</span><span className="font-black text-primary">TECHNICAL BRIEFING →</span>
        </div>
      </button>
      <p className="mt-4 text-[11px] text-muted-foreground">Roadmap phases are plans, not guarantees. Technologies and timelines may change with research, audits and regulation.</p>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-primary/50 bg-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div className="text-[10px] font-bold tracking-[0.2em] text-primary">TECHNICAL BRIEFING · {p.year}</div><button aria-label="Close" onClick={() => setOpen(false)}><X size={18}/></button></div>
            <h3 className="mt-1 text-lg font-black">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.brief}</p>
            <ul className="mt-3 space-y-1.5">{p.tech.map(t => <li key={t} className="flex gap-2 text-xs"><span className="text-primary">◆</span>{t}</li>)}</ul>
            <p className="mt-4 text-[10px] text-muted-foreground">Status: {p.status}. Forward-looking statement, not an offer or profit promise.</p>
          </div>
        </div>
      )}
    </section>
  );
}
