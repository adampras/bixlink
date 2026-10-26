import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { closeSeason, getArenaAdmin, reviewPrize, saveArena, type ArenaConfig, type SeasonPrize } from '@/lib/arena.functions';
import { QUEST_KEYS, QUEST_LABELS } from '@/lib/arena';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function AdminArena({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getArenaAdmin); const save = useServerFn(saveArena); const close = useServerFn(closeSeason); const review = useServerFn(reviewPrize);
  const [cfg, setCfg] = useState<ArenaConfig | null>(null); const [prizes, setPrizes] = useState<SeasonPrize[]>([]);
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: (config: ArenaConfig) => save({ data: config }), onSuccess: async result => { setCfg(result.config); await queryClient.invalidateQueries({ queryKey: ['arena'] }); onMessage('Fox Arena saved and verified. New amounts apply to future claims, not previously claimed rewards.'); }, onError: error => onMessage(error.message) });
  const [season, setSeason] = useState(() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); });
  const refresh = () => load().then(r => { setCfg(r.config); setPrizes(r.prizes); }).catch(e => onMessage(e.message));
  useEffect(() => { refresh(); }, []);
  if (!cfg) return <p className="mt-8 text-sm text-muted-foreground">Loading Fox Arena…</p>;
  const num = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
  const setQuiz = (i: number, patch: Partial<ArenaConfig['quiz'][number]>) => setCfg({ ...cfg, quiz: cfg.quiz.map((x, j) => j === i ? { ...x, ...patch } : x) });
  return <section className="mt-8 grid max-w-3xl gap-4">
    <h2 className="font-display text-xl font-black">FOX ARENA</h2>
    <p className="text-xs text-muted-foreground">Save after editing. New reward amounts apply to future claims only; completed missions and existing balances are unchanged.</p>
    <label className="mt-3 block max-w-xs text-xs font-bold">BIXP mission limit per account (0 = unlimited)<input type="number" min="0" step="1" className={num} value={cfg.cap ?? 0} onChange={e => setCfg({ ...cfg, cap: Math.max(0, Number(e.target.value) || 0) })}/></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })}/> Arena open</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.leaderboard} onChange={e => setCfg({ ...cfg, leaderboard: e.target.checked })}/> Show leaderboard</label>
    {QUEST_KEYS.map(k => <div key={k} className="grid grid-cols-[1fr_7rem] items-center gap-3 rounded-lg border border-border p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.missions[k] ?? true} onChange={e => setCfg({ ...cfg, missions: { ...cfg.missions, [k]: e.target.checked } })}/>{QUEST_LABELS[k].title}</label><label className="text-xs">BIXP<input type="number" step="0.1" min="0" max="10000" className={num} value={cfg.rewards[k] ?? (k === 'welcome' ? 100 : 5)} onChange={e => setCfg({ ...cfg, rewards: { ...cfg.rewards, [k]: Number(e.target.value) } })}/></label></div>)}
    <h3 className="mt-2 font-bold">Official social links (enable the mission and set its link)</h3>
    {(['follow_x', 'join_telegram', 'sub_youtube'] as const).map(k => <label key={k} className="text-xs">{QUEST_LABELS[k].title} — https:// link<input className={num} placeholder="https://" value={cfg.links?.[k] ?? ''} onChange={e => setCfg({ ...cfg, links: { ...cfg.links, [k]: e.target.value.trim() } })}/></label>)}
    <p className="text-[11px] text-muted-foreground">Social follows cannot be verified automatically; members claim after opening the link. Each social mission and the welcome bonus pay once per verified account.</p>
    <p className="text-xs leading-5 text-muted-foreground">Telegram: use your official announcement channel; link a separate discussion group from that channel. X: use your official public profile, not a community invitation.</p>
    <h3 className="mt-2 font-bold">Quiz questions (one per day, rotating)</h3>
    {cfg.quiz.map((x, i) => <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
      <input className={num} value={x.q} onChange={e => setQuiz(i, { q: e.target.value })} placeholder="Question"/>
      {x.options.map((o, j) => <label key={j} className="flex items-center gap-2 text-xs"><input type="radio" name={`ans-${i}`} checked={x.answer === j} onChange={() => setQuiz(i, { answer: j })}/><input className={num} value={o} onChange={e => setQuiz(i, { options: x.options.map((y, n) => n === j ? e.target.value : y) })}/></label>)}
      <Button size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, quiz: cfg.quiz.filter((_, j) => j !== i) })}>Remove question</Button>
    </div>)}
    <Button variant="outline" onClick={() => setCfg({ ...cfg, quiz: [...cfg.quiz, { q: '', options: ['', '', ''], answer: 0 }] })}>Add question</Button>
    <label className="text-xs">Season prizes, BIX for rank 1–10 (comma separated)<input className={num} value={cfg.prizes.join(',')} onChange={e => setCfg({ ...cfg, prizes: e.target.value.split(',').map(Number).filter(n => Number.isFinite(n)).slice(0, 10) })}/></label>
    <Button disabled={mutation.isPending} onClick={() => mutation.mutate(cfg)}>{mutation.isPending ? 'Saving and verifying…' : 'Save Fox Arena'}</Button>
    <h3 className="mt-6 font-bold">Season prizes (owner review)</h3>
    <div className="flex gap-2"><input type="month" className={num} value={season} onChange={e => setSeason(e.target.value)}/><Button variant="outline" onClick={async () => { try { const r = await close({ data: { season } }); onMessage(`${r.created} prize rows created for review.`); refresh(); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed'); } }}>Close season</Button></div>
    {prizes.length ? prizes.map(p => <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs"><span>{p.season} · #{p.rank} · {p.user_id.slice(0, 8)}… · {Number(p.points).toFixed(2)} pts</span><b>{Number(p.amount_bix)} BIX</b>{p.status === 'pending' ? <span className="flex gap-1"><Button size="sm" onClick={async () => { await review({ data: { id: p.id, approve: true } }); refresh(); }}>Approve</Button><Button size="sm" variant="ghost" onClick={async () => { await review({ data: { id: p.id, approve: false } }); refresh(); }}>Reject</Button></span> : <span className="uppercase">{p.status}</span>}</div>) : <p className="text-xs text-muted-foreground">No season prizes yet.</p>}
    <p className="text-xs text-muted-foreground">Approval records the prize decision. Credit approved BIX through the existing Allocations tool from the Marketing allocation.</p>
  </section>;
}
