import { ModuleGate } from '@/components/ModuleGate';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Brain, Check, Crown, Flame, Lock, Star, Swords, Target, Trophy, Zap } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { claimQuest, getArenaStatus } from '@/lib/arena.functions';
import { QUEST_KEYS, QUEST_LABELS, denTier, type QuestKey } from '@/lib/arena';
import headerLogo from '@/assets/bixlink-logo-gold.webp';
import { ArenaArtwork } from '@/components/ArenaArtwork';
import arenaHero from '@/assets/arena-hero.jpg';

export const Route = createFileRoute('/arena')({
  head: () => ({ meta: [{ title: 'Fox Arena — BIXLINK' }, { name: 'description', content: 'Daily BIXLINK missions, Fox Den tiers and monthly leaderboard seasons with free promotional BIXP.' }, { property: 'og:title', content: 'Fox Arena — BIXLINK' }, { property: 'og:description', content: 'Complete daily missions and climb the monthly Fox Arena leaderboard.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: () => <ModuleGate module="arena"><ArenaPage/></ModuleGate>,
});

const DISCLOSURE = 'BIXP are free promotional points earned by completing missions. Not on-chain BIX, not withdrawable until owner conversion opens. Rankings and rewards are not guaranteed.';

function ArenaPage() {
  const { user, ready } = useMember();
  const load = useServerFn(getArenaStatus); const claim = useServerFn(claimQuest);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['arena', user?.id], queryFn: () => load(), enabled: Boolean(user), staleTime: 0, refetchInterval: 15_000, refetchOnWindowFocus: 'always' });
  const [category, setCategory] = useState<'all' | 'daily' | 'social' | 'special'>('all');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState<QuestKey | null>(null); const [answer, setAnswer] = useState<number | null>(null);
  const s = q.data?.status;
  const run = async (key: QuestKey) => {
    setBusy(key); setMsg('');
    try { const r = await claim({ data: { key, ...(key === 'quiz' && answer !== null ? { answer } : {}) } }); setMsg(r.amount > 0 ? `+${r.amount} BIXP added${r.capped ? ' (limited by the account BIXP limit)' : ''}.` : 'Mission recorded. Your BIXP mission limit is reached, so no BIXP was added.'); await qc.invalidateQueries({ queryKey: ['arena', user?.id] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not claim.'); }
    setBusy(null);
  };
  const tier = s ? denTier(s) : null;
  const ICON: Record<string, typeof Swords> = { checkin: Flame, quiz: Brain, streak: Zap, referral: Star, stake7: Trophy, welcome: Star, follow_x: Target, join_telegram: Zap, sub_youtube: Flame };
  const link = (k: QuestKey) => (s?.links as Record<string, string> | undefined)?.[k] ?? '';
  const isSocial = (k: QuestKey) => k === 'follow_x' || k === 'join_telegram' || k === 'sub_youtube';
  return <BixShell><MemberGate ready={ready} signedIn={!!user} title="FOX ARENA"><main className="arena-page mx-auto max-w-5xl px-5 py-8 md:px-8">
    <header className="arena-hero-3d"><img src={arenaHero} alt="Silver cyber fox in the Fox Arena" width={1536} height={768} fetchPriority="high"/><div className="arena-hero-copy"><span className="arena-hero-kicker"><Swords size={12}/> BIXLINK GAME ECOSYSTEM</span><h1 className="arena-title font-display font-black">FOX<br/>ARENA</h1><p><Crown size={11}/> ALL MEMBERS<br/>EVERY NETWORK</p></div><span className="arena-hero-season">QUESTS · FOX DEN · SEASONS</span></header>
    {q.isError ? <div role="alert" className="mt-8"><p className="text-sm text-destructive">Could not load Fox Arena.</p><Button variant="outline" className="mt-3" onClick={() => q.refetch()}>Try again</Button></div> : q.isLoading || !s ? <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted"/> : !s.enabled ? <div className="mt-10 flex items-center gap-3 text-muted-foreground"><Lock size={20}/><p>Fox Arena is not open yet.</p></div> : <>
      <section className="arena-hud mt-6">
        <div className="arena-hud-avatar"><img src={headerLogo} alt="" width={88} height={88} className={`arena-fox tier-${tier?.level ?? 1}`}/><span className="arena-lvl">LV {tier?.level ?? 1}</span></div>
        <div className="min-w-0 flex-1"><span className="text-[10px] font-bold text-muted-foreground">FOX DEN RANK</span><h2 className="font-display text-2xl font-black text-chart-3">{tier?.name ?? 'Bronze'} Fox</h2>
          <div className="arena-cap mt-2"><i style={{ width: `${s.cap > 0 ? Math.min(100, Number(s.questVbix) / s.cap * 100) : 100}%` }}/></div>
          <p className="mt-1 text-[10px] text-muted-foreground">{s.cap > 0 ? `Mission XP ${Number(s.questVbix).toFixed(0)} / ${s.cap}` : 'No mission limit'}</p>
        </div>
      </section>
      <div className="arena-stats mt-3"><div><Flame size={16}/><b className="numeric">{s.streak}</b><small>Day streak</small></div><div><Star size={16}/><b className="numeric">{Number(s.questVbix).toFixed(0)}</b><small>Quest BIXP</small></div><div><Trophy size={16}/><b className="numeric">{Number(s.totalVbix).toFixed(0)}</b><small>Total BIXP</small></div></div>
      {(() => { const active = QUEST_KEYS.filter(k => s.missions[k]); const done = active.filter(k => s.claimed.includes(k)).length; const left = active.filter(k => !s.claimed.includes(k)).reduce((t, k) => t + Number(s.rewards[k] ?? 0), 0); return <div className="mt-8 flex items-end justify-between gap-3"><div><h2 className="flex items-center gap-2 font-display text-lg font-black"><Target size={18} className="text-chart-3"/>MISSION CONTROL</h2><p className="text-xs text-muted-foreground">{done}/{active.length} cleared · {left.toFixed(1)} BIXP up for grabs</p></div>{s.cap > 0 && Number(s.questVbix) >= s.cap && <span className="rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold text-chart-3">CAP REACHED</span>}</div>; })()}
      <nav className="arena-category-nav" aria-label="Mission categories">{([{ key: 'all', title: 'All', art: 'welcome' }, { key: 'daily', title: 'Daily', art: 'checkin' }, { key: 'social', title: 'Social', art: 'join_telegram' }, { key: 'special', title: 'Special', art: 'stake7' }] as const).map(c => <Button key={c.key} variant="ghost" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}><ArenaArtwork mission={c.art}/><span>{c.title}</span></Button>)}</nav>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{QUEST_KEYS.filter(k => s.missions[k] && (!isSocial(k) || link(k)) && (category === 'all' || (category === 'social' ? isSocial(k) : category === 'daily' ? ['checkin', 'quiz', 'streak'].includes(k) : ['welcome', 'referral', 'stake7'].includes(k)))).map(k => { const done = s.claimed.includes(k); const L = QUEST_LABELS[k]; const I = ICON[k] ?? Swords; return <article key={k} className={`arena-quest arena-tone-${isSocial(k) ? 'social' : ['checkin', 'quiz', 'streak'].includes(k) ? 'daily' : 'special'} ${done ? 'is-done' : ''}`}>
        <div className="arena-mission-visual"><ArenaArtwork mission={k}/><span className="arena-reward">+{s.rewards[k] ?? 0}<small>BIXP</small></span><span className="arena-visual-icon"><I size={16}/></span></div>
        <div className="mt-4 min-w-0"><b className="text-base">{L.title}</b><p className="mt-1 text-xs leading-5 text-muted-foreground">{L.hint}</p></div>
        {isSocial(k) && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Self-declared participation; following or joining is not automatically verified.</p>}
        {k === 'quiz' && !done && s.quiz && <div className="mt-3"><p className="text-sm font-semibold">⚔ {s.quiz.q}</p><div className="mt-2 grid gap-2">{s.quiz.options.map((o, i) => <Button variant="outline" type="button" key={i} aria-pressed={answer === i} onClick={() => setAnswer(i)} className={`arena-option ${answer === i ? 'is-picked' : ''}`}><span>{String.fromCharCode(65 + i)}</span>{o}</Button>)}</div></div>}
        <div className="mt-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{L.period}</span>{done ? <span className="flex items-center gap-1 text-xs font-black text-chart-2"><Check size={14}/> CLEARED</span> : <span className="flex items-center gap-2">{isSocial(k) && <Button size="sm" variant="outline" asChild><a href={link(k)} target="_blank" rel="noopener noreferrer">OPEN ↗</a></Button>}<Button size="sm" className="arena-claim" disabled={busy !== null || (k === 'quiz' && answer === null)} onClick={() => run(k)}>{busy === k ? 'Checking…' : 'CLAIM'}</Button></span>}</div>
      </article>; })}</div>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      {s.leaderboard && <section className="mt-10"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-black"><Trophy size={17} className="text-chart-3"/> SEASON {s.day.slice(0, 7)}</h2><span className="text-xs text-muted-foreground">You: <b className="numeric">{Number(s.monthPoints).toFixed(2)}</b></span></div>
        <div className="arena-season-art mt-4"><ArenaArtwork mission="streak"/><div><span className="text-xs text-chart-3">MONTHLY SEASON</span><h3 className="font-display text-xl font-bold">Hall of Champions</h3><p className="mt-1 text-xs text-muted-foreground">Ranked by recorded quest points</p></div></div>
        {(() => { const L = q.data?.leaders ?? []; if (!L.length) return <p className="py-6 text-sm text-muted-foreground">No points recorded this season yet.</p>; const top = [L[1], L[0], L[2]]; return <>
          <div className="arena-podium mt-4">{top.map((r, i) => r ? <div key={r.rank} className={`arena-step rank-${r.rank} ${r.is_me ? 'is-me' : ''}`}><Crown size={r.rank === 1 ? 22 : 16}/><b className="truncate text-xs">{r.member}</b><span className="numeric text-[11px]">{Number(r.points).toFixed(0)}</span><i>#{r.rank}</i></div> : <div key={`e${i}`}/>)}</div>
          <div className="mt-3">{L.slice(3).map(r => <div key={r.rank} className={`flex items-center justify-between border-b border-border py-3 text-sm ${r.is_me ? 'text-chart-3 font-bold' : ''}`}><span className="numeric w-8">#{r.rank}</span><span className="flex-1">{r.member}{r.is_me ? ' (you)' : ''}</span><b className="numeric">{Number(r.points).toFixed(2)}</b></div>)}</div></>; })()}
        <p className="mt-3 text-xs text-muted-foreground">Top 10 at season end are reviewed by the owner for BIX prizes from the Marketing allocation. Nothing pays out automatically.</p></section>}
    </>}
    <p className="mt-10 rounded-xl border border-border p-4 text-xs leading-5 text-muted-foreground">{DISCLOSURE}</p>
  </main></MemberGate></BixShell>;
}
