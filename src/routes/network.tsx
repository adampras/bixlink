import { createFileRoute } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { ArrowUpRight, Lock, Share2, Sparkles, Unlock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/network')({ head: () => ({ meta: [{ title: 'Network — BIXLINK' }, { name: 'description', content: 'BIXLINK marketing plan, matching profit levels and your sun network tree.' }, { property: 'og:title', content: 'Network — BIXLINK' }, { property: 'og:description', content: 'Your BIXLINK referral network and marketing plan.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: NetworkPage });

type Node = { user_id: string; parent_id: string | null; depth: number };
const RING = ['var(--primary)', 'var(--chart-2)', 'var(--chart-3)'];

function SunTree({ tree, me }: { tree: Node[]; me: string }) {
  const size = 440, c = size / 2;
  const maxDepth = 5;
  const pos = new Map<string, { x: number; y: number }>([[me, { x: c, y: c }]]);
  const lines: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  const dots: { x: number; y: number; d: number; id: string }[] = [];
  for (let d = 1; d <= maxDepth; d++) {
    const ring = tree.filter(n => n.depth === d);
    const r = 38 + (d / maxDepth) * (c - 64);
    ring.forEach((n, i) => {
      const ang = (i / Math.max(1, ring.length)) * Math.PI * 2 - Math.PI / 2 + d * 0.3;
      const p = { x: c + r * Math.cos(ang), y: c + r * Math.sin(ang) };
      pos.set(n.user_id, p);
      const parent = pos.get(n.parent_id ?? me) ?? pos.get(me)!;
      lines.push({ a: parent, b: p }); dots.push({ ...p, d, id: n.user_id });
    });
  }
  return <svg viewBox={`0 0 ${size} ${size}`} className="network-tree mx-auto w-full" role="img" aria-label="Sun network tree">
    <defs><radialGradient id="networkCore"><stop offset="0" stopColor="var(--chart-3)"/><stop offset="1" stopColor="var(--primary)"/></radialGradient></defs>
    {Array.from({ length: maxDepth }, (_, i) => { const radius = 38 + ((i + 1) / maxDepth) * (c - 64); return <g key={i}><circle cx={c} cy={c} r={radius} fill="none" stroke="var(--border)" strokeDasharray="3 6"/><text x={c} y={c - radius + 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted-foreground)">LV{i + 1}</text></g>; })}
    {lines.map((line, i) => <line key={i} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} stroke="var(--primary)" strokeOpacity=".45"/>)}
    {dots.map(point => <g key={point.id}><circle cx={point.x} cy={point.y} r={10} fill="var(--card)" stroke={RING[(point.d - 1) % 3]} strokeWidth="2"/><circle cx={point.x} cy={point.y} r={3} fill={RING[(point.d - 1) % 3]}/><title>LV{point.d} · Member {point.id.slice(0, 8)}</title></g>)}
    <circle cx={c} cy={c} r={32} fill="url(#networkCore)"/><circle cx={c} cy={c} r={39} fill="none" stroke="var(--chart-3)" strokeOpacity=".45"/><text x={c} y={c + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--background)">YOU</text>
  </svg>;
}

function NetworkPage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const r = cfg?.referrals; const levels = r?.levels ?? [12, 6, 3, 2, 1];
  const tree = (data?.tree ?? []) as Node[];
  const direct = tree.filter(n => n.depth === 1).length;
  const unlocked = Math.min(5, direct);
  const memberId = user?.id;
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="NETWORK">
      <div className="eyebrow">MARKETING PLAN</div><h1 className="section-title">MY <span>NETWORK</span></h1>
      <div className="network-stats mt-8 grid gap-3 sm:grid-cols-3">
        <div className="network-stat accent-0"><span className="network-stat-icon"><Share2/></span><div><span>Direct referrals</span><strong>{direct}</strong></div></div>
        <div className="network-stat accent-1"><span className="network-stat-icon"><Users/></span><div><span>Total network</span><strong>{tree.length}</strong></div></div>
        <div className="network-stat accent-2"><span className="network-stat-icon"><Unlock/></span><div><span>Levels unlocked</span><strong>{unlocked}<small> / 5</small></strong></div></div>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
        <section><div className="flex items-end justify-between gap-3"><div><div className="eyebrow">LIVE STRUCTURE</div><h2 className="mt-2 font-display text-2xl font-black">Sun network tree</h2></div><span className="package-label package-label-gold"><Sparkles size={11}/> 5 rings</span></div>
        <div className="network-tree-panel mt-4">{tree.length && memberId ? <SunTree tree={tree} me={memberId}/> : <div className="py-14 text-center text-sm text-muted-foreground"><span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary"><Users/></span><b className="mt-4 block text-foreground">Your network starts here</b><p className="mx-auto mt-1 max-w-xs text-xs">Share your referral link to place your first direct member on LV1.</p><Button asChild size="sm" className="mt-5 rounded-full"><Link to="/profile">Open referral link <ArrowUpRight/></Link></Button></div>}
          <div className="network-ring-counts">{[1, 2, 3, 4, 5].map(depth => <span key={depth}><i style={{ background: RING[(depth - 1) % 3] }}/>LV{depth}<b>{tree.filter(node => node.depth === depth).length}</b></span>)}</div>
        </div></section>

        <aside className="network-plan"><div className="eyebrow">ACTIVE PLAN</div><h2 className="mt-2 font-display text-2xl font-black">Matching access</h2><p className="mt-2 text-xs text-muted-foreground">Each direct referral unlocks one matching-profit level, up to five levels.</p>
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
