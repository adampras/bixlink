import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { Zap, Users, Gift } from 'lucide-react';

export const Route = createFileRoute('/boost')({ head: () => ({ meta: [{ title: 'Boost APY — BIXLINK' }, { name: 'description', content: 'BIXLINK APY booster, direct bonus, 5-level matching profit and RewardPlus.' }, { property: 'og:title', content: 'Boost APY — BIXLINK' }, { property: 'og:description', content: 'How to boost your BIXLINK staking APY.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: BoostPage });

function BoostPage() {
  const { data: cfg } = usePublicConfig();
  const { user, data } = useMember();
  const r = cfg?.referrals; const b = cfg?.booster;
  const direct = data?.tree.filter(n => n.depth === 1).length ?? 0;
  const min = r?.minimumDirect ?? 3;
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <div className="eyebrow">GROW TOGETHER</div><h1 className="section-title">BOOST <span>APY</span></h1>
    <div className="mt-8 rounded-[20px] border border-chart-2 bg-card p-6"><div className="flex items-center gap-2 text-chart-2"><Zap size={18}/> {b?.enabled ? 'APY BOOSTER ACTIVE' : 'APY BOOSTER PAUSED'}</div><strong className="mt-2 block text-4xl text-chart-2">Up to {b?.rate ?? 25}%</strong></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="stat-card accent-0"><Gift size={18}/><b className="mt-2 block">Direct bonus {r?.direct ?? 10}%</b><p className="text-xs text-muted-foreground">Paid {r?.splitUsdt ?? 70}% USDT / {r?.splitBix ?? 30}% BIX</p></div>
      <div className="stat-card accent-2"><Gift size={18}/><b className="mt-2 block">RewardPlus {r?.rewardPlus ?? 5}%</b><p className="text-xs text-muted-foreground">From weekly qualified turnover · min {min} direct members</p></div>
    </div>
    <h2 className="mt-10 font-display text-xl font-black">Matching profit (from member profit)</h2>
    <div className="mt-4 grid grid-cols-5 gap-2">{(r?.levels ?? [12, 6, 3, 2, 1]).map((p, i) => <div key={i} className="rounded-2xl border border-border bg-card p-3 text-center"><div className="text-xs text-muted-foreground">LV{i + 1}</div><b className="text-chart-3">{p}%</b></div>)}</div>
    <h2 className="mt-10 font-display text-xl font-black">My qualification</h2>
    {user ? <><div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-gradient-to-r from-primary via-chart-2 to-chart-3" style={{ width: `${Math.min(100, direct / min * 100)}%` }}/></div>
      <p className="mt-2 flex items-center gap-2 text-sm"><Users size={14}/> {direct} / {min} direct members {direct >= min ? '— qualified' : ''}</p>
      <p className="mt-1 text-xs text-muted-foreground">Bonus payouts are not active during prelaunch.</p>
      <Button asChild className="mt-6 rounded-full"><Link to="/profile">Share my referral code</Link></Button></>
      : <Button asChild className="mt-4 rounded-full bg-chart-3 text-background"><Link to="/auth">Sign in to track progress</Link></Button>}
  </main></BixShell>;
}
