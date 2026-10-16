import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Check, Flame, Lock, Swords, Trophy } from 'lucide-react';
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
  return <BixShell><MemberGate ready={ready} signedIn={!!user} title="FOX ARENA"><main className="mx-auto max-w-5xl px-5 py-8 md:px-8">
    <div className="eyebrow"><Swords size={14}/> BIXLINK GAME ECOSYSTEM</div>
    <h1 className="mt-3 font-display text-[26px] font-bold md:text-3xl">Fox Arena</h1>
    {q.isLoading || !s ? <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted"/> : !s.enabled ? <div className="mt-10 flex items-center gap-3 text-muted-foreground"><Lock size={20}/><p>Fox Arena is not open yet.</p></div> : <>
      <section className="arena-den mt-6">
        <img src={headerLogo} alt="" width={84} height={84} className={`arena-fox tier-${tier!.level}`}/>
        <div className="min-w-0"><span className="text-[10px] font-bold tracking-widest text-muted-foreground">FOX DEN · STATUS ONLY</span><h2 className="font-display text-xl font-bold text-chart-3">{tier!.name} Fox</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs"><span className="flex items-center gap-1"><Flame size={14} className="text-chart-3"/>{s.streak}-day streak</span><span>Quest BIXP: <b className="numeric">{Number(s.questVbix).toFixed(2)}</b></span><span>Total BIXP: <b className="numeric">{Number(s.totalVbix).toFixed(2)}{s.cap > 0 ? ` · mission limit ${Number(s.questVbix).toFixed(0)}/${s.cap}` : ' · no limit'}</b></span></div>
          <div className="arena-cap mt-2"><i style={{ width: `${s.cap > 0 ? Math.min(100, Number(s.questVbix) / s.cap * 100) : 100}%` }}/></div>
        </div>
      </section>
      {(() => { const active = QUEST_KEYS.filter(k => s.missions[k]); const done = active.filter(k => s.claimed.includes(k)).length; const left = active.filter(k => !s.claimed.includes(k)).reduce((t, k) => t + Number(s.rewards[k] ?? 0), 0); return <div className="mt-8 flex items-end justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Fox Quest</h2><p className="text-xs text-muted-foreground">{done}/{active.length} missions done · {left.toFixed(1)} BIXP still available</p></div>{s.cap > 0 && Number(s.questVbix) >= s.cap && <span className="rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold text-chart-3">CAP REACHED</span>}</div>; })()}
      <div className="mt-3 grid gap-3 md:grid-cols-2">{QUEST_KEYS.filter(k => s.missions[k]).map(k => { const done = s.claimed.includes(k); const L = QUEST_LABELS[k]; return <article key={k} className="arena-quest">
        <div className="flex items-start justify-between gap-3"><div><b className="text-sm">{L.title}</b><p className="mt-1 text-xs text-muted-foreground">{L.hint}</p></div><span className="shrink-0 text-xs font-bold text-chart-3">+{s.rewards[k]} BIXP</span></div>
        {k === 'quiz' && !done && s.quiz && <div className="mt-3"><p className="text-sm">{s.quiz.q}</p><div className="mt-2 grid gap-2">{s.quiz.options.map((o, i) => <button type="button" key={i} onClick={() => setAnswer(i)} className={`rounded-lg border px-3 py-2 text-left text-xs ${answer === i ? 'border-primary bg-primary/10' : 'border-border'}`}>{o}</button>)}</div></div>}
        <div className="mt-3 flex items-center justify-between"><span className="text-[10px] uppercase text-muted-foreground">{L.period}</span>{done ? <span className="flex items-center gap-1 text-xs font-bold text-chart-2"><Check size={14}/> Done</span> : <Button size="sm" disabled={busy !== null || (k === 'quiz' && answer === null)} onClick={() => run(k)}>{busy === k ? 'Checking…' : 'Claim'}</Button>}</div>
      </article>; })}</div>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      {s.leaderboard && <section className="mt-10"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Trophy size={17}/> Season {s.day.slice(0, 7)}</h2><span className="text-xs text-muted-foreground">Your points: <b className="numeric">{Number(s.monthPoints).toFixed(2)}</b></span></div>
        <div className="mt-3">{q.data!.leaders.length ? q.data!.leaders.map(r => <div key={r.rank} className={`flex items-center justify-between border-b border-border py-3 text-sm ${r.is_me ? 'text-chart-3 font-bold' : ''}`}><span className="numeric w-8">#{r.rank}</span><span className="flex-1">{r.member}{r.is_me ? ' (you)' : ''}</span><b className="numeric">{Number(r.points).toFixed(2)}</b></div>) : <p className="py-6 text-sm text-muted-foreground">No points recorded this season yet.</p>}</div>
        <p className="mt-3 text-xs text-muted-foreground">Top 10 at season end are reviewed by the owner for BIX prizes from the Marketing allocation. Nothing pays out automatically.</p></section>}
    </>}
    <p className="mt-10 rounded-xl border border-border p-4 text-xs leading-5 text-muted-foreground">{DISCLOSURE}</p>
  </main></MemberGate></BixShell>;
}
