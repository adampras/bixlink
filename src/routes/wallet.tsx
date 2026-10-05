import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { money } from '@/lib/bixlink';
import { Wallet, Clock, CheckCircle2, XCircle } from 'lucide-react';

export const Route = createFileRoute('/wallet')({ head: () => ({ meta: [{ title: 'Wallet — BIXLINK' }, { name: 'description', content: 'Your BIXLINK prelaunch wallet: balances and staking request history.' }, { property: 'og:title', content: 'Wallet — BIXLINK' }, { property: 'og:description', content: 'BIXLINK prelaunch wallet overview.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: WalletPage });

function WalletPage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const stakes = data?.stakes ?? [];
  const sum = (st: string) => stakes.filter(s => s.status === st).reduce((a, s) => a + Number(s.amount_usd), 0);
  const split = cfg?.referrals;
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="WALLET">
      <div className="eyebrow">PRELAUNCH WALLET</div><h1 className="section-title">MY <span>WALLET</span></h1>
      <div className="mt-8 rounded-[20px] border border-chart-3 bg-card p-6"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet size={16}/> BIX Balance</div><strong className="mt-2 block text-4xl text-chart-3">0 BIX</strong><p className="mt-2 text-xs text-muted-foreground">Token distribution starts after launch. No deposits or withdrawals are processed in prelaunch.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[['Active stake', money(sum('active')), 'accent-1'], ['Pending review', money(sum('pending')), 'accent-0'], ['Rejected', money(sum('rejected')), 'accent-2']].map(([l, v, a]) => <div key={l} className={`stat-card ${a}`}><span className="text-sm text-muted-foreground">{l}</span><strong className="mt-2 block text-2xl">{v}</strong></div>)}
      </div>
      {split && <p className="mt-5 text-xs text-muted-foreground">Payout split when live: {split.splitUsdt}% USDT · {split.splitBix}% BIX (set by admin).</p>}
      <h2 className="mt-12 font-display text-xl font-black">Transaction history</h2>
      <div className="mt-4 space-y-2">{stakes.length ? stakes.map(s => <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <div className="flex items-center gap-3">{s.status === 'active' ? <CheckCircle2 className="text-chart-2" size={18}/> : s.status === 'rejected' ? <XCircle className="text-destructive" size={18}/> : <Clock className="text-primary" size={18}/>}<div><b>{s.package_id}</b><div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div></div></div>
        <div className="text-right"><div className="text-chart-3">{money(Number(s.amount_usd))}</div><div className="text-xs capitalize text-muted-foreground">{s.status}</div></div></div>) : <p className="text-sm text-muted-foreground">No transactions yet.</p>}</div>
      <Button asChild className="mt-8 rounded-full bg-chart-3 text-background"><Link to="/stake">Stake now</Link></Button>
    </MemberGate>
  </main></BixShell>;
}
