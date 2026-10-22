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

export const Route = createFileRoute('/arena')({
  head: () => ({ meta: [{ title: 'Fox Arena — BIXLINK' }, { name: 'description', content: 'Daily BIXLINK missions, Fox Den tiers and monthly leaderboard seasons with free promotional BIXP.' }, { property: 'og:title', content: 'Fox Arena — BIXLINK' }, { property: 'og:description', content: 'Complete daily missions and climb the monthly Fox Arena leaderboard.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ArenaPage,
});

const DISCLOSURE = 'BIXP are free promotional points earned by completing missions. Not on-chain BIX, not withdrawable until owner conversion opens. Rankings and rewards are not guaranteed.';

function ArenaPage() {
  const { user, ready } = useMember();
  const load = useServerFn(getArenaStatus); const claim = useServerFn(claimQuest);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['arena', user?.id], queryFn: () => load(), enabled: Boolean(user) });
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
    <div className="eyebrow"><Swords size={14}/> BIXLINK GAME ECOSYSTEM</div>
    <h1 className="arena-title mt-3 font-display text-[28px] font-black md:text-4xl">FOX ARENA</h1>
    {q.isLoading || !s ? <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted"/> : !s.enabled ? <div className="mt-10 flex items-center gap-3 text-muted-foreground"><Lock size={20}/><p>Fox Arena is not open yet.</p></div> : <>
      <section className="arena-hud mt-6">
        <div className="arena-hud-avatar"><img src={headerLogo} alt="" width={88} height={88} className={`arena-fox tier-${tier!.level}`}/><span className="arena-lvl">LV {tier!.level}</span></div>
        <div className="min-w-0 flex-1"><span className="text-[10px] font-bold tracking-[0.25em] text-muted-foreground">FOX DEN RANK</span><h2 className="font-display text-2xl font-black text-chart-3">{tier!.name} Fox</h2>
          <div className="arena-cap mt-2"><i style={{ width: `${s.cap > 0 ? Math.min(100, Number(s.questVbix) / s.cap * 100) : 100}%` }}/></div>
          <p className="mt-1 text-[10px] text-muted-foreground">{s.cap > 0 ? `Mission XP ${Number(s.questVbix).toFixed(0)} / ${s.cap}` : 'No mission limit'}</p>
        </div>
      </section>
      <div className="arena-stats mt-3"><div><Flame size={16}/><b className="numeric">{s.streak}</b><small>Day streak</small></div><div><Star size={16}/><b className="numeric">{Number(s.questVbix).toFixed(0)}</b><small>Quest BIXP</small></div><div><Trophy size={16}/><b className="numeric">{Number(s.totalVbix).toFixed(0)}</b><small>Total BIXP</small></div></div>
      {(() => { const active = QUEST_KEYS.filter(k => s.missions[k]); const done = active.filter(k => s.claimed.includes(k)).length; const left = active.filter(k => !s.claimed.includes(k)).reduce((t, k) => t + Number(s.rewards[k] ?? 0), 0); return <div className="mt-8 flex items-end justify-between gap-3"><div><h2 className="flex items-center gap-2 font-display text-lg font-black"><Target size={18} className="text-chart-3"/>DAILY QUESTS</h2><p className="text-xs text-muted-foreground">{done}/{active.length} cleared · {left.toFixed(1)} BIXP up for grabs</p></div>{s.cap > 0 && Number(s.questVbix) >= s.cap && <span className="rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold text-chart-3">CAP REACHED</span>}</div>; })()}
      <div className="mt-3 grid gap-3 md:grid-cols-2">{QUEST_KEYS.filter(k => s.missions[k] && (!isSocial(k) || link(k))).map(k => { const done = s.claimed.includes(k); const L = QUEST_LABELS[k]; const I = ICON[k] ?? Swords; return <article key={k} className={`arena-quest ${done ? 'is-done' : ''}`}>
        <div className="flex items-start gap-3"><span className="arena-quest-icon"><I size={20}/></span><div className="min-w-0 flex-1"><b className="text-sm">{L.title}</b><p className="mt-1 text-xs text-muted-foreground">{L.hint}</p></div><span className="arena-reward">+{s.rewards[k]}<small>BIXP</small></span></div>
        {k === 'quiz' && !done && s.quiz && <div className="mt-3"><p className="text-sm font-semibold">⚔ {s.quiz.q}</p><div className="mt-2 grid gap-2">{s.quiz.options.map((o, i) => <button type="button" key={i} onClick={() => setAnswer(i)} className={`arena-option ${answer === i ? 'is-picked' : ''}`}><span>{String.fromCharCode(65 + i)}</span>{o}</button>)}</div></div>}
        <div className="mt-3 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{L.period}</span>{done ? <span className="flex items-center gap-1 text-xs font-black text-chart-2"><Check size={14}/> CLEARED</span> : <span className="flex items-center gap-2">{isSocial(k) && <a href={link(k)} target="_blank" rel="noopener noreferrer" className="rounded-md border border-chart-3 px-2 py-1 text-[11px] font-bold text-chart-3">OPEN ↗</a>}<Button size="sm" className="arena-claim" disabled={busy !== null || (k === 'quiz' && answer === null)} onClick={() => run(k)}>{busy === k ? 'Checking…' : 'CLAIM'}</Button></span>}</div>
      </article>; })}</div>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      {s.leaderboard && <section className="mt-10"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-black"><Trophy size={17} className="text-chart-3"/> SEASON {s.day.slice(0, 7)}</h2><span className="text-xs text-muted-foreground">You: <b className="numeric">{Number(s.monthPoints).toFixed(2)}</b></span></div>
        {(() => { const L = q.data!.leaders; if (!L.length) return <p className="py-6 text-sm text-muted-foreground">No points recorded this season yet.</p>; const top = [L[1], L[0], L[2]]; return <>
          <div className="arena-podium mt-4">{top.map((r, i) => r ? <div key={r.rank} className={`arena-step rank-${r.rank} ${r.is_me ? 'is-me' : ''}`}><Crown size={r.rank === 1 ? 22 : 16}/><b className="truncate text-xs">{r.member}</b><span className="numeric text-[11px]">{Number(r.points).toFixed(0)}</span><i>#{r.rank}</i></div> : <div key={`e${i}`}/>)}</div>
          <div className="mt-3">{L.slice(3).map(r => <div key={r.rank} className={`flex items-center justify-between border-b border-border py-3 text-sm ${r.is_me ? 'text-chart-3 font-bold' : ''}`}><span className="numeric w-8">#{r.rank}</span><span className="flex-1">{r.member}{r.is_me ? ' (you)' : ''}</span><b className="numeric">{Number(r.points).toFixed(2)}</b></div>)}</div></>; })()}
        <p className="mt-3 text-xs text-muted-foreground">Top 10 at season end are reviewed by the owner for BIX prizes from the Marketing allocation. Nothing pays out automatically.</p></section>}
    </>}
    <p className="mt-10 rounded-xl border border-border p-4 text-xs leading-5 text-muted-foreground">{DISCLOSURE}</p>
  </main></MemberGate></BixShell>;
}
