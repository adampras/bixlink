import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Check, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getVipReviews, reviewVip } from '@/lib/network.functions';
import { money, number } from '@/lib/bixlink';

export function AdminVip({ onMessage }: { onMessage?: (m: string) => void }) {
  const list = useServerFn(getVipReviews); const review = useServerFn(reviewVip);
  const { data = [], refetch } = useQuery({ queryKey: ['admin-vip'], queryFn: () => list() });
  const act = async (id: string, approve: boolean) => { try { await review({ data: { id, approve } }); await refetch(); onMessage?.(approve ? 'VIP reward approved.' : 'VIP reward rejected.'); } catch (e) { onMessage?.(e instanceof Error ? e.message : 'Could not review.'); } };
  return <section className="mt-8 max-w-4xl rounded-[20px] border border-chart-3 bg-card p-5">
    <h3 className="flex items-center gap-2 font-display text-lg font-black"><Crown size={18}/> REWARD PLUS VIP claims</h3>
    <p className="mt-1 text-xs text-muted-foreground">Team sales = active USDT stakes of the whole downline (clones excluded). Each level pays once; approval is funded from the owner BIX reserve.</p>
    <div className="mt-4 space-y-2">{data.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs">
      <div><b className="text-chart-3">VIP{r.level}</b> · {number(Number(r.amount_bix))} BIX · <span className="text-muted-foreground">{r.user_id.slice(0, 8)} · sales {money(Number(r.team_sales_usd))} / {money(Number(r.target_usd))}</span></div>
      {r.status === 'pending' ? <div className="flex gap-2"><Button size="sm" className="rounded-full" onClick={() => act(r.id, true)}><Check/>Approve</Button><Button size="sm" variant="destructive" className="rounded-full" onClick={() => act(r.id, false)}><X/>Reject</Button></div> : <span className="font-bold uppercase">{r.status}</span>}
    </div>)}{!data.length && <p className="text-sm text-muted-foreground">No VIP claims yet.</p>}</div>
  </section>;
}
