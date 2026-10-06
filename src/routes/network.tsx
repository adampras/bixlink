import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { ArrowUpRight, BadgeCheck, ChevronDown, ChevronRight, GitBranch, Lock, Medal, Share2, Sparkles, Unlock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { money, number } from '@/lib/bixlink';

export const Route = createFileRoute('/network')({ head: () => ({ meta: [{ title: 'Network Tree — BIXLINK' }, { name: 'description', content: 'Explore your BIXLINK referral tree across every recorded generation.' }, { property: 'og:title', content: 'Network Tree — BIXLINK' }, { property: 'og:description', content: 'Navigate your complete BIXLINK referral hierarchy and matching access.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: NetworkPage });

type Node = {
  user_id: string;
  parent_id: string | null;
  depth: number;
  member_code?: string | null;
  username?: string | null;
  full_name?: string | null;
  top_package?: string | null;
  stake_value_usd?: number | null;
  weekly_stake_usd?: number | null;
  total_turnover_usd?: number | null;
  weekly_turnover_usd?: number | null;
  weekly_direct_count?: number | null;
  weekly_reward_usd?: number | null;
  weekly_qualified?: boolean | null;
};

const packageAvatar = (pkg?: string | null) => {
  const id = (pkg ?? 'NONE').toUpperCase();
  const label = id === 'NONE' ? 'N' : id.slice(0, 2);
  const tier = ['SEED', 'SPARK', 'EXPLORER', 'PIONEER', 'BUILDER', 'GUARDIAN', 'TITAN', 'LEGEND'].indexOf(id);
  return { label, tier: tier >= 0 ? tier : 0 };
};

function TreeBranch({ node, childrenByParent }: { node: Node; childrenByParent: Map<string, Node[]> }) {
  const children = childrenByParent.get(node.user_id) ?? [];
  const [open, setOpen] = useState(node.depth < 2);
  const avatar = packageAvatar(node.top_package);
  const identity = node.username || node.full_name || node.member_code || node.user_id.slice(0, 8).toUpperCase();
  return <li className="ref-tree-branch"><div className="ref-tree-node"><span className={`ref-tree-avatar ref-tree-avatar-${avatar.tier}`}>{avatar.label}</span><div className="ref-tree-copy"><span>LV{node.depth} · {node.member_code ?? 'Member'}</span><strong>{identity}</strong><div className="ref-tree-metrics"><b>{money(Number(node.stake_value_usd ?? 0))}<small>Stake</small></b><b>{money(Number(node.total_turnover_usd ?? 0))}<small>Total omset</small></b><b>{money(Number(node.weekly_turnover_usd ?? 0))}<small>Mingguan</small></b></div>{node.weekly_qualified ? <span className="ref-tree-qualified"><BadgeCheck size={12}/> Qualified · {money(Number(node.weekly_reward_usd ?? 0))}</span> : <span className="ref-tree-pending"><Sparkles size={12}/> {Number(node.weekly_direct_count ?? 0)}/3 member minggu ini</span>}</div>{children.length > 0 && <Button type="button" size="icon" variant="ghost" className="ref-tree-toggle" aria-label={`${open ? 'Collapse' : 'Expand'} member branch`} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <ChevronDown/> : <ChevronRight/>}</Button>}<span className="ref-tree-count">+{children.length}<small>direct</small></span></div>{open && children.length > 0 && <ul className="ref-tree-children">{children.map(child => <TreeBranch node={child} childrenByParent={childrenByParent} key={child.user_id}/>)}</ul>}</li>;
}

function ReferralTree({ tree, me, root }: { tree: Node[]; me: string; root: { weeklyDirect: number; weeklyReward: number; weeklyTurnover: number; totalTurnover: number } }) {
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, Node[]>();
    tree.forEach(node => { const parent = node.parent_id ?? me; grouped.set(parent, [...(grouped.get(parent) ?? []), node]); });
    return grouped;
  }, [tree, me]);
  const roots = childrenByParent.get(me) ?? [];
  return <div className="ref-tree" role="tree" aria-label="Referral network tree"><div className="ref-tree-root"><span>YOU</span><div><small>ROOT ACCOUNT</small><strong>{me.slice(0, 8).toUpperCase()}</strong><em>Total omset {money(root.totalTurnover)}</em></div>{root.weeklyDirect >= 3 ? <Button type="button" variant="ghost" className="ref-tree-root-qual"><BadgeCheck size={13}/> Qualified {money(root.weeklyReward)}</Button> : <Button type="button" variant="ghost" className="ref-tree-root-wait"><Medal size={13}/> {root.weeklyDirect}/3 weekly</Button>}</div><ul className="ref-tree-children ref-tree-children--root">{roots.map(node => <TreeBranch node={node} childrenByParent={childrenByParent} key={node.user_id}/>)}</ul></div>;
}

function NetworkPage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const r = cfg?.referrals; const levels = r?.levels ?? [12, 6, 3, 2, 1];
  const tree = (data?.tree ?? []) as Node[];
  const direct = tree.filter(n => n.depth === 1).length;
  const weeklyDirectNodes = tree.filter(n => n.parent_id === user?.id && Number(n.weekly_stake_usd ?? 0) > 0);
  const weeklyDirect = weeklyDirectNodes.length;
  const weeklyDirectTurnover = weeklyDirectNodes.reduce((sum, node) => sum + Number(node.weekly_stake_usd ?? 0), 0);
  const weeklyReward = weeklyDirect >= 3 ? weeklyDirectTurnover * Number(r?.rewardPlus ?? 5) / 100 : 0;
  const totalTurnover = tree.filter(n => n.depth >= 1).reduce((sum, node) => sum + Number(node.stake_value_usd ?? 0), 0);
  const weeklyTurnover = tree.filter(n => n.depth >= 1).reduce((sum, node) => sum + Number(node.weekly_stake_usd ?? 0), 0);
  const unlocked = Math.min(5, direct);
  const deepest = tree.reduce((maximum, node) => Math.max(maximum, node.depth), 0);
  const memberId = user?.id;
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="NETWORK">
      <h1 className="section-title">MY <span>NETWORK</span></h1>
      <div className="network-stats mt-8 grid gap-3 sm:grid-cols-3">
        <div className="network-stat accent-0"><span className="network-stat-icon"><Share2/></span><div><span>Direct referrals</span><strong>{direct}</strong></div></div>
        <div className="network-stat accent-1"><span className="network-stat-icon"><Users/></span><div><span>Total omset</span><strong>{money(totalTurnover)}</strong></div></div>
        <div className="network-stat accent-2"><span className="network-stat-icon"><GitBranch/></span><div><span>Deepest generation</span><strong>{deepest || '—'}</strong></div></div>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <section><div className="flex items-end justify-between gap-3"><div><div className="eyebrow">LIVE STRUCTURE</div><h2 className="mt-2 font-display text-2xl font-black">Network tree</h2></div><span className="package-label package-label-gold"><GitBranch size={11}/> Unlimited depth</span></div>
        <div className="network-tree-panel mt-4">{tree.length && memberId ? <ReferralTree tree={tree} me={memberId} root={{ weeklyDirect, weeklyReward, weeklyTurnover, totalTurnover }}/> : <div className="py-14 text-center text-sm text-muted-foreground"><span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary"><Users/></span><b className="mt-4 block text-foreground">Your network starts here</b><p className="mx-auto mt-1 max-w-xs text-xs">Share your referral link to place your first direct member on LV1.</p><Button asChild size="sm" className="mt-5 rounded-full"><Link to="/profile">Open referral link <ArrowUpRight/></Link></Button></div>}
          {tree.length > 0 && <div className="ref-tree-footer"><span><i className="bg-primary"/>Direct <b>{direct}</b></span><span><i className="bg-chart-2"/>Weekly <b>{money(weeklyTurnover)}</b></span><span><i className="bg-chart-3"/>Depth <b>{deepest}</b></span></div>}
        </div></section>

        <aside className="network-plan"><div className="eyebrow">WEEKLY RESET 12 AM</div><h2 className="mt-2 font-display text-2xl font-black">Qualification</h2><p className="mt-2 text-xs text-muted-foreground">When three direct members stake inside the current week, this marker turns qualified and shows the RewardPlus value from weekly direct turnover.</p>
          <Button type="button" variant="ghost" className={weeklyDirect >= 3 ? 'weekly-qual weekly-qual-on' : 'weekly-qual'}><BadgeCheck size={18}/><span>{weeklyDirect >= 3 ? 'Qualified' : `${weeklyDirect}/3 direct`}</span><b>{money(weeklyReward)}</b></Button>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="weekly-mini"><span>Weekly turnover</span><b>{money(weeklyTurnover)}</b></div><div className="weekly-mini"><span>RewardPlus</span><b>{number(Number(r?.rewardPlus ?? 5), { maximumFractionDigits: 2 })}%</b></div></div>
          <div className="mt-6 border-t border-border pt-5"><div className="eyebrow">ACTIVE PLAN</div><h3 className="mt-2 font-display text-xl font-black">Matching access</h3><p className="mt-2 text-xs text-muted-foreground">Each direct referral unlocks one matching-profit level, up to five levels.</p></div>
          <div className="mt-5 space-y-2">{levels.map((percent, i) => { const on = i < unlocked; return <div key={i} className={`network-level ${on ? 'network-level-on' : ''}`}><span className="grid size-8 place-items-center rounded-full bg-secondary">{on ? <Unlock size={14}/> : <Lock size={14}/>}</span><div className="min-w-0 flex-1"><b>Level {i + 1}</b><p>{i + 1} direct referral{i ? 's' : ''} required</p></div><strong>{percent}%</strong></div>; })}</div>
          <div className="stake-progress mt-5"><i style={{ width: `${unlocked / 5 * 100}%` }}/></div><div className="numeric mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{unlocked} unlocked</span><span>5 maximum</span></div>
        </aside>
      </div>

      <h2 className="mt-10 font-display text-xl font-black">Plan benefits</h2><div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="network-benefit"><b>Direct bonus <span>{r?.direct ?? 10}%</span></b><p>{r?.splitUsdt ?? 70}% USDT · {r?.splitBix ?? 30}% BIX</p></div>
        <div className="network-benefit"><b>Matching profit <span>5 levels</span></b><p>Based on recorded network staking profit</p></div>
        <div className="network-benefit"><b>RewardPlus <span>{r?.rewardPlus ?? 5}%</span></b><p>Weekly turnover · minimum {r?.minimumDirect ?? 3} direct</p></div>
      </div><div className="mt-4 rounded-[14px] border border-border bg-secondary/50 px-4 py-3 text-xs text-muted-foreground"><b className="text-foreground">Admin-reviewed records.</b> Commission credits appear as staking rewards in WALLET; no automatic payout is executed.</div>
    </MemberGate>
  </main></BixShell>;
}
