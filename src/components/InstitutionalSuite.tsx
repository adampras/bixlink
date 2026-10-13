import { Lock, ShieldCheck, Vault, Crown, Send, Mail } from 'lucide-react';

const RESERVES = [
  { label: 'Fixed total supply', value: '21,000,000 BIX', note: 'Hard cap · no mint planned' },
  { label: 'Genesis reserve vault', value: '1,000,000 BIX', note: 'Owner-only · locked' },
  { label: 'Staking rewards pool', value: '7,350,000 BIX', note: '35% · halving every 2 years' },
  { label: 'Presale allocation', value: '3,150,000 BIX', note: '15% · pool cap' },
];

/** Proof-of-reserve style disclosure. Planned allocations only — not on-chain attestation. */
export function ReserveTelemetry() {
  return <section className="mx-auto max-w-5xl px-5 py-10">
    <div className="eyebrow"><Vault size={14}/> PROOF OF RESERVE · PRE-TGE</div>
    <h2 className="section-title">RESERVE <span>TELEMETRY</span></h2>
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {RESERVES.map(r => <div key={r.label} className="rounded-2xl border border-chart-3/30 bg-card/60 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.label}<Lock size={13} className="text-chart-3"/></div>
        <b className="numeric mt-2 block font-display text-xl text-chart-3">{r.value}</b>
        <small className="text-[11px] text-muted-foreground">{r.note}</small>
      </div>)}
    </div>
    <p className="mt-4 flex gap-2 text-[11px] leading-5 text-muted-foreground"><ShieldCheck size={14} className="shrink-0 text-chart-2"/>Figures are the planned internal-ledger allocation. The BIX smart contract is not deployed yet, so no on-chain attestation exists. A verifiable contract address will be published at TGE.</p>
  </section>;
}

/** Concierge desk for large presale / Sovereign allocations. Contact only, no payments. */
export function WhaleDesk() {
  const msg = encodeURIComponent('Hello BIXLINK team, I am interested in an institutional / Sovereign presale allocation.');
  return <section className="mt-6 rounded-2xl border border-chart-3/50 bg-gradient-to-br from-card via-background to-card p-5 shadow-[0_0_40px_-16px_var(--chart-3)]">
    <span className="eyebrow text-chart-3"><Crown size={14}/> INSTITUTIONAL OTC DESK</span>
    <h2 className="mt-2 font-display text-xl font-black">Private concierge for allocations $10,000+</h2>
    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
      <li>• One-to-one onboarding with the development team</li>
      <li>• Strategy walkthrough: Hybrid, Dividend or Founder</li>
      <li>• Sovereign slot reservation questions (21 slots worldwide)</li>
    </ul>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <a className="lux-btn lux-btn--gold" href={`https://t.me/bixlink_official?text=${msg}`} target="_blank" rel="noopener noreferrer"><Send size={15}/> Telegram</a>
      <a className="lux-btn lux-btn--glass" href={`mailto:otc@bixlink.io?subject=Institutional%20allocation&body=${msg}`}><Mail size={15}/> Email</a>
    </div>
    <p className="mt-3 text-[10px] text-muted-foreground">The desk never asks for private keys or payments outside the app. Purchases are made only inside PRESALE. No guarantee of profit.</p>
  </section>;
}
