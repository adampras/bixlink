import { createFileRoute } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { Lock, Unlock, Users } from 'lucide-react';

export const Route = createFileRoute('/network')({ head: () => ({ meta: [{ title: 'Network — BIXLINK' }, { name: 'description', content: 'BIXLINK marketing plan, matching profit levels and your sun network tree.' }, { property: 'og:title', content: 'Network — BIXLINK' }, { property: 'og:description', content: 'Your BIXLINK referral network and marketing plan.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: NetworkPage });

type Node = { user_id: string; parent_id: string | null; depth: number };
const RING = ['var(--primary)', 'var(--chart-2)', 'var(--chart-3)'];

function SunTree({ tree, me }: { tree: Node[]; me: string }) {
  const size = 360, c = size / 2;
  const maxDepth = Math.min(5, Math.max(1, ...tree.map(n => n.depth)));
  const pos = new Map<string, { x: number; y: number }>([[me, { x: c, y: c }]]);
  const lines: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  const dots: { x: number; y: number; d: number; id: string }[] = [];
  for (let d = 1; d <= maxDepth; d++) {
    const ring = tree.filter(n => n.depth === d);
    const r = (d / maxDepth) * (c - 18);
    ring.forEach((n, i) => {
      const ang = (i / Math.max(1, ring.length)) * Math.PI * 2 - Math.PI / 2 + d * 0.3;
      const p = { x: c + r * Math.cos(ang), y: c + r * Math.sin(ang) };
      pos.set(n.user_id, p);
      const parent = pos.get(n.parent_id ?? me) ?? pos.get(me)!;
      lines.push({ a: parent, b: p }); dots.push({ ...p, d, id: n.user_id });
    });
  }
  return <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-md" role="img" aria-label="Sun network tree">
    {Array.from({ length: maxDepth }, (_, i) => <circle key={i} cx={c} cy={c} r={((i + 1) / maxDepth) * (c - 18)} fill="none" stroke="var(--border)" strokeDasharray="3 5"/>)}
    {lines.map((l, i) => <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="var(--border)"/>)}
    {dots.map(p => <circle key={p.id} cx={p.x} cy={p.y} r={6} fill={RING[(p.d - 1) % 3]}><title>LV{p.d} · {p.id.slice(0, 8)}</title></circle>)}
    <circle cx={c} cy={c} r={22} fill="var(--chart-3)"/><text x={c} y={c + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--background)">YOU</text>
  </svg>;
}

function NetworkPage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const r = cfg?.referrals; const levels = r?.levels ?? [12, 6, 3, 2, 1];
  const tree = (data?.tree ?? []) as Node[];
  const direct = tree.filter(n => n.depth === 1).length;
  const unlocked = Math.min(5, direct);
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="NETWORK">
      <div className="eyebrow">MARKETING PLAN</div><h1 className="section-title">MY <span>NETWORK</span></h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="stat-card accent-0"><span className="text-sm text-muted-foreground">Direct referrals</span><strong className="mt-2 block text-3xl">{direct}</strong></div>
        <div className="stat-card accent-1"><span className="text-sm text-muted-foreground">Total network</span><strong className="mt-2 block text-3xl">{tree.length}</strong></div>
        <div className="stat-card accent-2"><span className="text-sm text-muted-foreground">Matching levels unlocked</span><strong className="mt-2 block text-3xl">{unlocked} / 5</strong></div>
      </div>

      <h2 className="mt-10 font-display text-xl font-black">Active plan</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-2xl border border-border bg-card p-4"><b className="text-chart-3">Direct bonus {r?.direct ?? 10}%</b><p className="text-xs text-muted-foreground">{r?.splitUsdt ?? 70}% USDT · {r?.splitBix ?? 30}% BIX</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><b className="text-chart-3">Matching profit 5 levels</b><p className="text-xs text-muted-foreground">From your network's staking profit</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><b className="text-chart-3">RewardPlus {r?.rewardPlus ?? 5}%</b><p className="text-xs text-muted-foreground">Weekly turnover · min {r?.minimumDirect ?? 3} direct</p></div>
      </div>

      <h2 className="mt-10 font-display text-xl font-black">Matching profit rule</h2>
      <p className="mt-1 text-xs text-muted-foreground">1 direct referral unlocks 1 level, 2 unlock 2 levels … 5 direct referrals unlock all 5 levels.</p>
      <div className="mt-4 grid grid-cols-5 gap-2">{levels.map((p, i) => { const on = i < unlocked; return <div key={i} className={`rounded-2xl border p-3 text-center ${on ? 'border-chart-2 bg-card' : 'border-border opacity-60'}`}>{on ? <Unlock size={14} className="mx-auto text-chart-2"/> : <Lock size={14} className="mx-auto"/>}<div className="mt-1 text-xs text-muted-foreground">LV{i + 1}</div><b className="text-chart-3">{p}%</b><div className="text-[10px] text-muted-foreground">{i + 1} reff</div></div>; })}</div>

      <h2 className="mt-10 font-display text-xl font-black">Sun network tree</h2>
      <div className="mt-4 rounded-[20px] border border-border bg-card p-4">{tree.length ? <SunTree tree={tree} me={user!.id}/> : <p className="py-10 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2"/>No members yet. Share your referral code from PROFILE.</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">{[1, 2, 3, 4, 5].map(d => <span key={d}>LV{d}: {tree.filter(n => n.depth === d).length}</span>)}{tree.some(n => n.depth > 5) && <span>LV6+: {tree.filter(n => n.depth > 5).length}</span>}</div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Commission payouts are credited by admin as staking rewards in WALLET.</p>
    </MemberGate>
  </main></BixShell>;
}
