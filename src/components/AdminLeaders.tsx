import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getAdminLeaders, reviewLeader } from '@/lib/bixlink.functions';
import { money } from '@/lib/bixlink';
import { Check, Crown, X } from 'lucide-react';

export function AdminLeaders({ onMessage }: { onMessage: (m: string) => void }) {
  const list = useServerFn(getAdminLeaders); const review = useServerFn(reviewLeader);
  const { data, refetch } = useQuery({ queryKey: ['admin-leaders'], queryFn: () => list() });
  const leaders = data?.leaders ?? []; const pool = data?.poolUsd ?? 1000000;
  const approved = leaders.filter(l => l.status === 'approved');
  const used = approved.reduce((s, l) => s + Number(l.virtual_usd), 0);
  const act = async (userId: string, status: 'approved' | 'rejected', virtualUsd: number, requireTurnover: boolean, ok: string) => {
    try { await review({ data: { userId, status, virtualUsd, requireTurnover } }); await refetch(); onMessage(ok); } catch (e) { onMessage(e instanceof Error ? e.message : 'Could not update leader.'); }
  };
  return <div className="mt-8 space-y-6">
    <section className="rounded-[20px] border border-chart-3 bg-card p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-black"><Crown size={18}/> Leader program · owner virtual pool</h3>
      <p className="mt-1 text-xs text-muted-foreground">Virtual balance is an internal credit, not backed funds. Withdrawals of it still go through manual admin review and are paid by the owner.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[['Pool', money(pool)], ['Allocated', money(used)], ['Remaining', money(pool - used)], ['Leaders', `${approved.length} / 100`]].map(([k, v]) => <div key={k} className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">{k}</span><b className="numeric block text-lg text-chart-3">{v}</b></div>)}</div>
    </section>
    <div className="space-y-2">{leaders.map(l => {
      const s = l.stats;
      return <div key={l.user_id} className="rounded-[20px] border border-border bg-card p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><b className="text-sm">{l.full_name || l.user_id.slice(0, 8)}</b> <span className="text-muted-foreground">@{l.username}</span> <span className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${l.status === 'approved' ? 'border-chart-2 text-chart-2' : l.status === 'rejected' ? 'border-destructive text-destructive' : 'border-chart-3 text-chart-3'}`}>{l.status}</span></div>
          <span className={s?.qualified ? 'font-bold text-chart-2' : 'text-muted-foreground'}>{!l.require_turnover ? 'WD: requirement off' : s?.qualified ? 'Qualified for WD' : 'Not qualified'}</span></div>
        <div className="mt-2 text-muted-foreground">Own stake {money(Number(s?.own_stake ?? 0))} · Direct turnover <b className="text-foreground">{money(Number(s?.turnover ?? 0))}</b> / target {money(Number(s?.target ?? 0))} (3×) · Locked seed capital (non-withdrawable until qualified) {money(Number(l.virtual_usd))}</div>
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act(l.user_id, 'approved', Number(f.get('v')), f.get('req') === 'on', 'Leader approved.'); }}>
          <span className="flex gap-1">{[100,500,1000,5000,10000].map(v => <button type="button" key={v} className="rounded-full border border-border px-2 py-1 hover:border-primary" onClick={e => { const i = e.currentTarget.form?.elements.namedItem('v') as HTMLInputElement | null; if (i) i.value = String(v); }}>${v >= 1000 ? `${v/1000}K` : v}</button>)}</span>
          <input name="v" type="number" min="0" step="0.01" defaultValue={Number(l.virtual_usd) || 10000} className="form-input w-36" aria-label="Virtual USD"/>
          <label className="flex items-center gap-1"><input name="req" type="checkbox" defaultChecked={l.require_turnover}/> Require 3× turnover for WD</label>
          <Button size="sm" className="rounded-full"><Check/> {l.status === 'approved' ? 'Update' : 'Approve'}</Button>
          {l.status !== 'rejected' && <Button type="button" size="sm" variant="destructive" className="rounded-full" onClick={() => act(l.user_id, 'rejected', 0, l.require_turnover, 'Leader rejected.')}><X/> Reject</Button>}
        </form>
      </div>; })}{!leaders.length && <p className="text-sm text-muted-foreground">No leader applications yet.</p>}</div>
  </div>;
}
