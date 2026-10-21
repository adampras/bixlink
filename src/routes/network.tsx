import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BadgeCheck, ChevronRight, Coins, GitBranch, Lock, Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { VipRewardPlus } from '@/components/VipRewardPlus';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { money, number } from '@/lib/bixlink';

export const Route = createFileRoute('/network')({ head: () => ({ meta: [{ title: 'Network Explorer — BIXLINK' }, { name: 'description', content: 'Explore every referral generation, USDT and BIX stakes, and owner-reviewed BIX direct bonuses.' }, { property: 'og:title', content: 'Network Explorer — BIXLINK' }, { property: 'og:description', content: 'Your BIXLINK referral hierarchy, staking activity and BIX direct bonus records.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: NetworkPage });

type Node = { user_id: string; parent_id: string | null; depth: number; member_code?: string | null; username?: string | null; full_name?: string | null; top_package?: string | null; stake_value_usd?: number | null; weekly_stake_usd?: number | null; total_turnover_usd?: number | null; weekly_turnover_usd?: number | null; weekly_direct_count?: number | null };
type BixMetric = { user_id: string; stake_bix: number; weekly_bix: number; turnover_bix: number; direct_bonus_bix: number; pending_bonus_bix: number };
const bix = (v: number) => `${number(v, { maximumFractionDigits: 2 })} BIX`;
function identity(n: Node) { return n.username || n.full_name || n.member_code || n.user_id.slice(0,8); }

function NetworkPage() {
 const { user, ready, data, error } = useMember(); const { data: cfg } = usePublicConfig();
 const [selected, setSelected] = useState<string | null>(null); const [showHistory, setShowHistory] = useState(false); const [expanded, setExpanded] = useState<string | null>(null); const [showAllRows, setShowAllRows] = useState(false); const [search, setSearch] = useState(''); const [generation, setGeneration] = useState<number | null>(null);
 const tree = (data?.tree ?? []) as Node[];
 const metrics = useMemo(() => new Map((Array.isArray(data?.bixMetrics) ? data.bixMetrics as unknown as BixMetric[] : []).map(m => [m.user_id,m])),[data?.bixMetrics]);
 const children = useMemo(() => {const map = new Map<string, Node[]>();for(const node of tree){const parent=node.parent_id ?? user?.id;if(parent)map.set(parent,[...(map.get(parent) ?? []),node]);}return map;},[tree,user?.id]);
 const directNodes = tree.filter(n => n.parent_id === user?.id);
 const totalUsdt = tree.reduce((sum,n) => sum+Number(n.stake_value_usd ?? 0),0);
 const totalBix = tree.reduce((sum,n) => sum+Number(metrics.get(n.user_id)?.stake_bix ?? 0),0);
 const weeklyDirect = directNodes.filter(n => Number(n.weekly_stake_usd ?? 0)>0).length;
 const minimum = cfg?.referrals.minimumDirect ?? 3;
 const weeklyUsdt = directNodes.reduce((sum,n) => sum+Number(n.weekly_stake_usd ?? 0),0);
 const weeklyReward = weeklyDirect >= minimum ? weeklyUsdt*(cfg?.referrals.rewardPlus ?? 5)/100 : 0;
 const levels = cfg?.referrals.levels ?? [12,6,3,2,1]; const unlocked = Math.min(levels.length,directNodes.length);
 const deepest = tree.reduce((max,n) => Math.max(max,n.depth),0);
 const focus = tree.find(n => n.user_id === selected);
 const ancestors: Node[] = []; const seen = new Set<string>(); let current = focus;
 while(current && !seen.has(current.user_id)){seen.add(current.user_id);ancestors.unshift(current);current=tree.find(n => n.user_id === current?.parent_id);}
 const term=search.trim().toLowerCase();
 const visible = term ? tree.filter(n => `${n.member_code ?? ''} ${identity(n)}`.toLowerCase().includes(term)) : generation ? tree.filter(n => n.depth === generation) : children.get(focus?.user_id ?? user?.id ?? '') ?? [];
 const bonuses = data?.bonuses ?? [];
 const netBonuses = data?.usdtBonuses ?? [];
 const usdtDirectBonus = netBonuses.filter(b => b.kind==='direct').reduce((sum, b) => sum + Number(b.total_usd), 0);
 const matchingTotal = netBonuses.filter(b => b.kind==='matching').reduce((sum, b) => sum + Number(b.total_usd), 0);
 const nameOf = (id: string) => { const n = tree.find(x => x.user_id === id); return n ? `${n.member_code ?? ''} ${identity(n)}`.trim() : id.slice(0,8); };
 const history = [
   ...netBonuses.map(b => ({ id: b.id, at: b.created_at, label: b.kind==='direct' ? 'Direct sponsor · USDT stake' : `Matching L${b.level} · daily`, from: nameOf(b.member_id), detail: `${b.rate_pct}% of ${money(Number(b.base_usd))}`, usdt: Number(b.usdt_amount), bix: Number(b.bix_amount), status: 'credited' })),
   ...bonuses.map(b => ({ id: b.id, at: b.created_at, label: 'Direct sponsor · BIX Booster', from: nameOf(b.member_id), detail: `${b.rate_pct}% · 100% BIX`, usdt: 0, bix: Number(b.amount_bix), status: b.status })),
 ].sort((a,b) => b.at.localeCompare(a.at));
 const approved = bonuses.filter(b => b.status==='approved').reduce((s,b) => s+Number(b.amount_bix),0);
 const pending = bonuses.filter(b => b.status==='pending').reduce((s,b) => s+Number(b.amount_bix),0);
 return <BixShell><main className="network-explorer mx-auto max-w-6xl px-4 py-8 md:px-8">
 <MemberGate ready={ready} signedIn={!!user} title="NETWORK">
 <header className="nx-header"><div><div className="eyebrow">MY NETWORK</div><h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Network <span className="text-chart-3">Explorer</span></h1><p className="mt-1 text-xs text-muted-foreground">L1 = people you invited directly. Tap a member to open their team. Totals are recorded entries, not projections.</p></div><label className="nx-search"><Search size={18}/><input aria-label="Search network members" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member ID or name"/>{search && <Button variant="ghost" size="sm" onClick={() => setSearch('')}>Clear</Button>}</label></header>
 {error && <p role="alert" className="mt-4 text-destructive">Network records could not load. Please refresh.</p>}
 <section className="nx-root"><div className="nx-root-avatar"><UserRound size={40}/><span>YOU</span></div><h2>{data?.referral?.code ?? user?.id.slice(0,8).toUpperCase()}</h2><div className="nx-root-status"><Users size={14}/>{directNodes.length} direct referrals <span>·</span><GitBranch size={14}/>{deepest} generations</div>
 <dl className="nx-totals"><div><dt>Network USDT stakes</dt><dd>{money(totalUsdt)}</dd></div><div><dt>USDT sponsor bonus</dt><dd className="text-chart-2">{money(usdtDirectBonus)}</dd></div><div><dt>Credited BIX bonus</dt><dd className="text-chart-3">{bix(approved)}</dd></div><div><dt>Pending BIX review</dt><dd>{bix(pending)}</dd></div></dl>
 <div className="nx-milestone-heading"><h3>Matching access</h3><span>{unlocked}/{levels.length} unlocked</span></div>
 <div className="nx-levels">{levels.map((pct,i) => <div key={i} className={i<unlocked ? 'nx-level nx-level-active' : 'nx-level'}><span>LEVEL {i+1}</span><strong>{pct}%</strong><small>{i+1} direct</small>{i<unlocked ? <BadgeCheck size={16}/> : <Lock size={14}/>}</div>)}</div>
 </section>
 <section aria-label="Leader bonus hub" className="mt-6 rounded-2xl border border-chart-3/50 bg-card p-4 md:p-5">
  <div className="eyebrow">LEADER BONUS HUB</div><h2 className="mt-1 font-display text-lg font-bold">My network bonuses</h2>
  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{[
   ['Direct sponsor', money(usdtDirectBonus), 'text-chart-2'],
   ['Matching profit', money(matchingTotal), 'text-chart-3'],
   ['Matching · last 24h', money(netBonuses.filter(b => b.kind==='matching' && Date.now()-new Date(b.created_at).getTime() < 864e5).reduce((s,b) => s+Number(b.total_usd),0)), 'text-chart-3'],
   ['RewardPlus this week', money(weeklyReward), 'text-chart-2'],
  ].map(([l,v,c]) => <div key={l} className="rounded-xl border border-border p-3"><span className="text-[11px] text-muted-foreground">{l}</span><b className={`numeric mt-1 block text-xl ${c}`}>{v}</b></div>)}</div>
  <h3 className="mt-5 text-sm font-bold">Matching matrix L1–L{levels.length}</h3>
  <div className="mt-2 grid grid-cols-5 gap-2">{levels.map((pct,i) => { const earned = netBonuses.filter(b => b.kind==='matching' && b.level===i+1).reduce((s,b) => s+Number(b.total_usd),0); const members = tree.filter(n => n.depth===i+1).length; return <div key={i} className={`rounded-xl border p-2 text-center ${i<unlocked ? 'border-chart-3' : 'border-border opacity-70'}`}><b className="text-xs text-chart-3">L{i+1} · {pct}%</b><p className="text-[10px] text-muted-foreground">{members} members</p><p className="numeric text-xs font-bold">{money(earned)}</p>{i<unlocked ? <BadgeCheck size={13} className="mx-auto mt-1 text-chart-2"/> : <Lock size={12} className="mx-auto mt-1"/>}</div>; })}</div>
  <div className="mt-5"><div className="flex justify-between text-xs"><span>RewardPlus qualification</span><b>{Math.min(weeklyDirect,minimum)}/{minimum} direct this week</b></div><progress className="allocation-progress mt-2" max={minimum} value={Math.min(weeklyDirect,minimum)}/></div>
  <p className="mt-3 text-[10px] text-muted-foreground">Totals come from recorded bonus entries. RewardPlus this week is a projection until settled.</p>
 </section>
 <section className="nx-matrix"><div className="nx-matrix-heading"><h2>{term ? 'Search results' : generation ? `Generation L${generation}` : focus ? `${identity(focus)} · Direct members` : 'Your direct members · L1'}</h2><span>{visible.length} members</span></div>
 <nav className="nx-breadcrumb" aria-label="Network ancestry"><Button size="sm" variant="ghost" onClick={() => {setSelected(null);setGeneration(null);setSearch('');}}>YOU</Button>{ancestors.map(n => <span key={n.user_id}><ChevronRight size={12}/><Button size="sm" variant="ghost" onClick={() => {setSelected(n.user_id);setGeneration(null);setSearch('');}}>{identity(n)}</Button></span>)}</nav>
 {focus && !term && !generation && <div className="nx-focus"><UserRound size={20}/><div><b>{identity(focus)}</b><p>{focus.member_code} · L{focus.depth}</p></div><div className="ml-auto text-right text-xs"><p>{money(Number(focus.stake_value_usd ?? 0))} USDT stake</p><p className="text-chart-3">{bix(Number(metrics.get(focus.user_id)?.stake_bix ?? 0))} stake</p></div></div>}
 <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{Array.from({length:deepest},(_,i) => { const c = tree.filter(n => n.depth===i+1).length; return <button key={i} type="button" onClick={() => {setGeneration(generation===i+1 ? null : i+1);setSelected(null);setSearch('');}} className={`numeric shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${generation===i+1 ? 'border-chart-3 bg-chart-3/10 text-chart-3' : 'border-border text-muted-foreground'}`}>L{i+1} · {c}</button>; })}</div>
 <div className="mt-3 divide-y divide-border/60 overflow-hidden rounded-xl border border-chart-3/30">{visible.slice(0, showAllRows ? undefined : 8).map(n => {
 const m=metrics.get(n.user_id);const count=children.get(n.user_id)?.length ?? 0;const active=Number(n.stake_value_usd ?? 0)>0 || Number(m?.stake_bix ?? 0)>0;const pkg=n.top_package && n.top_package!=='NONE' ? n.top_package : Number(m?.stake_bix ?? 0)>0 ? 'BIX BOOSTER' : 'NO STAKE';const isOpen=expanded===n.user_id;
 return <div key={n.user_id} className="bg-card/40">
  <button type="button" onClick={() => setExpanded(isOpen ? null : n.user_id)} aria-expanded={isOpen} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left">
   <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${active ? 'border-chart-3 text-chart-3' : 'border-border text-muted-foreground'}`}>{pkg==='BIX BOOSTER' ? <Coins size={15}/> : pkg==='NO STAKE' ? <UserRound size={15}/> : pkg.slice(0,2)}</span>
   <span className="min-w-0"><b className="block truncate text-sm">{identity(n)}</b><span className="block truncate text-[10px] text-muted-foreground">L{n.depth} · {n.member_code ?? n.user_id.slice(0,8)} · {count} direct</span></span>
   <span className="text-right numeric"><b className="block text-xs text-chart-2">{money(Number(n.stake_value_usd ?? 0))}</b><ChevronRight size={14} className={`ml-auto transition ${isOpen ? 'rotate-90' : ''}`}/></span>
  </button>
  {isOpen && <div className="border-t border-border/60 px-3 py-3 text-xs"><div className="grid grid-cols-2 gap-2"><p>Package <b className="block text-chart-3">{pkg}</b></p><p>BIX stake <b className="block">{bix(Number(m?.stake_bix ?? 0))}</b></p><p>Team USDT <b className="block">{money(Number(n.total_turnover_usd ?? 0))}</b></p><p>Team BIX <b className="block">{bix(Number(m?.turnover_bix ?? 0))}</b></p></div>{n.parent_id===user?.id && <p className="mt-2 text-chart-3">Your direct bonus: <b>{bix(Number(m?.direct_bonus_bix ?? 0))}</b>{Number(m?.pending_bonus_bix ?? 0)>0 && ` · ${bix(Number(m?.pending_bonus_bix))} pending`}</p>}{count>0 && <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => {setSelected(n.user_id);setGeneration(null);setSearch('');setExpanded(null);}}>Open {count} downline <ChevronRight size={14}/></Button>}</div>}
 </div>;
 })}</div>
 {visible.length > 8 && <Button size="sm" variant="ghost" className="mt-2 w-full text-chart-3" onClick={() => setShowAllRows(v => !v)}>{showAllRows ? 'Show less' : `Show all ${visible.length} members`}</Button>}
 {!visible.length && <div className="py-10 text-center text-sm text-muted-foreground">{term ? 'No matching members.' : focus ? 'No direct members in this branch yet.' : 'Your network starts here.'}{!tree.length && <Button asChild className="mt-4"><Link to="/profile">Referral link <ArrowUpRight/></Link></Button>}</div>}
 <div className="nx-controls"><div className="flex items-center gap-2"><Button size="icon" variant="outline" aria-label="Back one generation" disabled={!focus && !generation} onClick={() => {setSelected(focus?.parent_id===user?.id ? null : focus?.parent_id ?? null);setGeneration(null);}}><ArrowLeft size={16}/></Button><span className="text-xs text-muted-foreground">{focus ? `L${focus.depth+1}` : generation ? `L${generation}` : 'L1'} · Unlimited depth</span></div><label className="flex items-center gap-2 text-xs text-muted-foreground">Generation<select aria-label="Select generation" className="form-input" value={generation ?? ''} onChange={e => {setGeneration(e.target.value ? Number(e.target.value) : null);setSelected(null);setSearch('');}}><option value="">Branch view</option>{Array.from({length:deepest},(_,i) => <option key={i} value={i+1}>L{i+1}</option>)}</select></label></div>
 </section>
 <VipRewardPlus/>
 <details className="nx-plan-details"><summary className="cursor-pointer text-sm font-bold text-chart-3">How each bonus works · tap to expand</summary><section className="nx-plan"><div><h2 className="font-display text-lg font-bold">Direct sponsor · USDT</h2><p className="mt-2 text-2xl font-bold text-chart-2">{cfg?.referrals.direct ?? 10}% <span className="text-sm text-muted-foreground">· {cfg?.referrals.splitUsdt ?? 70}% USDT / {cfg?.referrals.splitBix ?? 30}% BIX</span></p><p className="mt-2 text-xs text-muted-foreground">Credited once per active direct-member USDT stake. Total: {money(usdtDirectBonus)}.</p></div><div><h2 className="font-display text-lg font-bold">Matching profit · daily</h2><p className="mt-2 text-2xl font-bold text-chart-3">{levels.join(' / ')}%</p><p className="mt-2 text-xs text-muted-foreground">Paid every day 00:05 Makassar from each downline's daily staking yield, level N unlocked with N active direct members. Same {cfg?.referrals.splitUsdt ?? 70}/{cfg?.referrals.splitBix ?? 30} split. Total: {money(matchingTotal)}.</p></div><div><h2 className="font-display text-lg font-bold">Weekly RewardPlus · USDT</h2><p className="mt-2 flex items-center gap-2 text-chart-2"><BadgeCheck size={18}/>{weeklyDirect>=minimum ? 'Qualified' : `${weeklyDirect}/${minimum} direct`} <b>{money(weeklyReward)}</b></p><p className="mt-2 text-xs text-muted-foreground">RewardPlus {cfg?.referrals.rewardPlus ?? 5}% · USDT package weekly turnover. Resets Monday 12 AM Makassar. Projection only.</p></div></section>
 <section className="nx-plan"><div><h2 className="font-display text-lg font-bold">BIX direct referral</h2><p className="mt-2 text-2xl font-bold text-chart-3">{cfg?.referrals.bixDirectEnabled===false ? 'Closed' : `${cfg?.referrals.bixDirectPct ?? cfg?.referrals.direct ?? 10}%`} <span className="text-sm text-muted-foreground">· 100% BIX</span></p><p className="mt-2 text-xs text-muted-foreground">New BIX Booster stakes create one bonus record per stake. Owner-approved credits use the existing reserve; pending bonuses are not spendable.</p></div></section></details>
 <section className="mt-6 rounded-2xl border border-chart-3/40 bg-card p-4 md:p-5"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">BONUS HISTORY</div><h2 className="mt-1 font-display text-lg font-bold">Network bonus records</h2></div><Button size="sm" variant="outline" onClick={() => setShowHistory(v => !v)}>{showHistory ? 'Hide' : `Show (${history.length})`}</Button></div>
 {showHistory && (history.length ? <div className="mt-4 divide-y divide-border/60">{history.slice(0,100).map(h => <div key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-xs"><div className="min-w-0"><b className="block truncate text-sm">{h.label}</b><p className="truncate text-muted-foreground">From {h.from} · {h.detail}</p><p className="text-[10px] text-muted-foreground">{new Date(h.at).toLocaleString()}</p></div><div className="text-right numeric">{h.usdt>0 && <p className="font-bold text-chart-2">+{money(h.usdt)}</p>}{h.bix>0 && <p className="font-bold text-chart-3">+{bix(h.bix)}</p>}<span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${h.status==='pending' ? 'border-border text-muted-foreground' : h.status==='rejected' ? 'border-destructive text-destructive' : 'border-chart-2 text-chart-2'}`}>{h.status}</span></div></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No bonus records yet. Bonuses appear here when your network stakes.</p>)}</section>
 <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} className="shrink-0"/>BIX is an internal ledger asset. USDT package rules remain separate; no automatic payout or guaranteed profit.</p>
 </MemberGate></main></BixShell>;
}
