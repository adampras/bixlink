import { CheckCircle2, Loader2, Clock, CalendarClock, Map } from 'lucide-react';

const phases = [
  { n: 1, title: 'Genesis Staking & Closed Seed', desc: 'Internal ledger validation, genesis staking nodes and early community allocation.', status: 'ACTIVE', Icon: CheckCircle2, tone: 'text-chart-3 border-chart-3/50 bg-chart-3/10' },
  { n: 2, title: 'Security Audit & Reserve Lock', desc: 'Architecture security review and locking of the 1,000,000 BIX protocol reserve.', status: 'IN PROGRESS', Icon: Loader2, tone: 'text-primary border-primary/50 bg-primary/10' },
  { n: 3, title: 'TGE & Smart Contract Deployment', desc: 'Official fixed-supply BEP-20 deployment from the owner wallet. Contract address published only after deployment.', status: 'UPCOMING', Icon: Clock, tone: 'text-chart-2 border-chart-2/50 bg-chart-2/10' },
  { n: 4, title: 'DEX Liquidity & Public Listing', desc: 'Decentralized liquidity pool opening and public price tracking.', status: 'SCHEDULED', Icon: CalendarClock, tone: 'text-muted-foreground border-border bg-card' },
  { n: 5, title: 'Auric Card & Global Merchant', desc: 'Exclusive debit card partnership and RWA merchandise ecosystem.', status: 'ROADMAP', Icon: Map, tone: 'text-muted-foreground border-border bg-card' },
];

export function PreTgeRoadmap() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="eyebrow">PROTOCOL STATUS · PRE-TGE</div>
      <h2 className="section-title">GENESIS <span>ROADMAP</span></h2>
      <p className="mt-2 text-xs text-muted-foreground">BIX is in its Genesis stage. The smart contract is not yet deployed; balances shown in-app are internal ledger records.</p>
      <ol className="relative mt-6 space-y-3 border-l border-border pl-5">
        {phases.map(({ n, title, desc, status, Icon, tone }) => (
          <li key={n} className="relative rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
            <span className={`absolute -left-[30px] top-4 grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold ${tone}`}>{n}</span>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-sm">{title}</b>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}><Icon size={11} className={status === 'IN PROGRESS' ? 'animate-spin' : ''}/>{status}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] text-muted-foreground">Roadmap phases are plans, not guarantees. Timelines may change.</p>
    </section>
  );
}
