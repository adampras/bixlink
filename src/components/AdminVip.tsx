import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Crown, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVipReviews, reviewVip, getVipStatus } from '@/lib/network.functions';
import { updateSetting } from '@/lib/bixlink.functions';
import { money, number } from '@/lib/bixlink';

type Tier = { level: number; targetUsd: number; rewardBix: number };

export function AdminVip({ onMessage }: { onMessage?: (m: string) => void }) {
  const list = useServerFn(getVipReviews); const review = useServerFn(reviewVip); const status = useServerFn(getVipStatus); const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  const { data = [], refetch } = useQuery({ queryKey: ['admin-vip'], queryFn: () => list() });
  const { data: vip } = useQuery({ queryKey: ['vip-status'], queryFn: () => status() });
  const [tiers, setTiers] = useState<Tier[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { if (vip?.tiers && !tiers.length) setTiers(vip.tiers.map(t => ({ level: t.level, targetUsd: Number(t.targetUsd), rewardBix: Number(t.rewardBix) }))); }, [vip, tiers.length]);
  const act = async (id: string, approve: boolean) => { try { await review({ data: { id, approve } }); await refetch(); onMessage?.(approve ? 'VIP reward approved.' : 'VIP reward rejected.'); } catch (e) { onMessage?.(e instanceof Error ? e.message : 'Could not review.'); } };
  const edit = (i: number, k: 'targetUsd' | 'rewardBix', v: number) => setTiers(t => t.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const saveTiers = async () => {
    setBusy(true);
    try { await save({ data: { key: 'vip_tiers', value: { tiers } } }); await qc.invalidateQueries({ queryKey: ['vip-status'] }); onMessage?.('VIP reward tiers saved.'); }
    catch (e) { onMessage?.(e instanceof Error ? e.message : 'Could not save VIP tiers.'); } finally { setBusy(false); }
  };
  return <section className="mt-8 max-w-4xl rounded-[20px] border border-chart-3 bg-card p-5">
    <h3 className="flex items-center gap-2 font-display text-lg font-black"><Crown size={18}/> REWARD PLUS VIP · Edit tiers</h3>
    <p className="mt-1 text-xs text-muted-foreground">Set team sales target (USDT) and one-time BIX reward per level. Applies to new claims; already-claimed rewards keep their recorded amount.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-xs">
      <thead><tr className="text-left text-muted-foreground"><th className="py-2">Level</th><th>Team sales target (USDT)</th><th>Reward (BIX)</th></tr></thead>
      <tbody>{tiers.map((t, i) => <tr key={t.level} className="border-t border-border">
        <td className="py-2 font-bold text-chart-3">VIP{t.level}</td>
        <td className="pr-2"><input aria-label={`VIP${t.level} target`} className="form-input" type="number" min="1" step="1" value={t.targetUsd} onChange={e => edit(i, 'targetUsd', Number(e.target.value))}/></td>
        <td><input aria-label={`VIP${t.level} reward`} className="form-input" type="number" min="1" step="1" value={t.rewardBix} onChange={e => edit(i, 'rewardBix', Number(e.target.value))}/></td>
      </tr>)}</tbody>
    </table></div>
    <Button className="mt-4" disabled={busy || !tiers.length} onClick={saveTiers}><Save/>{busy ? 'Saving…' : 'Save VIP tiers'}</Button>
    <h4 className="mt-8 font-display text-base font-bold">VIP claims review</h4>
    <p className="mt-1 text-xs text-muted-foreground">Team sales = active USDT stakes of the whole downline (clones excluded). Each level pays once; approval is funded from the owner BIX reserve.</p>
    <div className="mt-4 space-y-2">{data.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs">
      <div><b className="text-chart-3">VIP{r.level}</b> · {number(Number(r.amount_bix))} BIX · <span className="text-muted-foreground">{r.user_id.slice(0, 8)} · sales {money(Number(r.team_sales_usd))} / {money(Number(r.target_usd))}</span></div>
      {r.status === 'pending' ? <div className="flex gap-2"><Button size="sm" className="rounded-full" onClick={() => act(r.id, true)}><Check/>Approve</Button><Button size="sm" variant="destructive" className="rounded-full" onClick={() => act(r.id, false)}><X/>Reject</Button></div> : <span className="font-bold uppercase">{r.status}</span>}
    </div>)}{!data.length && <p className="text-sm text-muted-foreground">No VIP claims yet.</p>}</div>
  </section>;
}
