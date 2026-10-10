import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Activity, BookOpen, Database, Eye, FileCheck, Lock, ShieldCheck, Users } from 'lucide-react';
import { getMarketSentiment } from '@/lib/sentiment.functions';

const pillars = [
  { Icon: Database, title: 'Internal Ledger Engine', desc: 'All balances are transparent internal ledger records, reconciled by the protocol before any on-chain deployment.' },
  { Icon: Eye, title: 'Owner-Reviewed Withdrawals', desc: 'Every withdrawal passes manual review and network verification — no automated payout can drain the system.' },
  { Icon: Lock, title: 'Row-Level Security', desc: 'Member data is isolated by enforced database access policies; public reads never expose private records.' },
  { Icon: FileCheck, title: 'Fixed 21M Supply Design', desc: 'The BIXCOIN supply design is fixed at 21,000,000 BIX with no additional minting planned.' },
  { Icon: Users, title: 'Clone-Excluded Statistics', desc: 'Network and member statistics exclude internal clone accounts, keeping public metrics honest.' },
  { Icon: ShieldCheck, title: 'No-SC Disclosure', desc: 'The BIX smart contract is not yet deployed. We state this openly instead of showing a fake contract address.' },
];

export function TrustCenter({ bixPrice, serverNow }: { bixPrice: number; serverNow?: string | undefined }) {
  const { data: sentiment } = useQuery({ queryKey: ['trust-sentiment'], queryFn: () => getMarketSentiment(), staleTime: 3_600_000 });
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="eyebrow"><ShieldCheck size={13}/> TRANSPARENCY &amp; SECURITY</div>
        <h2 className="section-title">PROTOCOL <span>TRUST CENTER</span></h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">BIXLINK is in its pre-TGE stage. Instead of claiming unaudited on-chain status, we publish exactly how the protocol protects members today.</p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card/70 p-3 backdrop-blur">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">BIX pre-launch reference</span>
            <strong className="numeric mt-1 block text-lg text-chart-3">${bixPrice.toFixed(6)}</strong>
            <small className="text-[10px] text-muted-foreground">Owner-managed internal index · not an exchange price</small>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-3 backdrop-blur">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Global market sentiment</span>
            <strong className="numeric mt-1 block text-lg text-foreground">{sentiment ? `${sentiment.value} · ${sentiment.label}` : '—'}</strong>
            <small className="text-[10px] text-muted-foreground">Live Fear &amp; Greed Index · alternative.me</small>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-3 backdrop-blur">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Ledger engine status</span>
            <strong className="mt-1 flex items-center gap-1.5 text-lg text-chart-2"><Activity size={16}/> ONLINE</strong>
            <small className="numeric text-[10px] text-muted-foreground">{serverNow ? `Synced ${new Date(serverNow).toUTCString().slice(17, 25)} UTC` : 'Real-time server sync'}</small>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ Icon, title, desc }) => (
            <article key={title} className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
              <span className="inline-grid h-9 w-9 place-items-center rounded-lg border border-chart-3/30 bg-chart-3/10 text-chart-3"><Icon size={17}/></span>
              <h3 className="mt-3 text-sm font-bold">{title}</h3>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen size={15} className="text-primary"/><span>Read the full protocol architecture, tokenomics and risk disclosures.</span></div>
          <Link to="/whitepaper" className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20">Open Whitepaper</Link>
        </div>
      </div>
    </section>
  );
}
