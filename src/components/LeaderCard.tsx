import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { applyLeader, getMyLeader } from '@/lib/bixlink.functions';
import { money } from '@/lib/bixlink';
import { Crown } from 'lucide-react';

export function LeaderCard() {
  const fetchMe = useServerFn(getMyLeader); const apply = useServerFn(applyLeader);
  const { data: s, refetch } = useQuery({ queryKey: ['my-leader'], queryFn: () => fetchMe() });
  const [msg, setMsg] = useState('');
  const pct = s && s.target > 0 ? Math.min(100, (s.turnover / s.target) * 100) : 0;
  return <section className="mt-6 rounded-[20px] border border-chart-3 bg-card p-6">
    <h2 className="flex items-center gap-2 font-bold"><Crown size={18} className="text-chart-3"/> Leader program</h2>
    {!s?.status || s.status === 'rejected' ? <><p className="mt-2 text-sm text-muted-foreground">{s?.status === 'rejected' ? 'Your previous application was rejected. You can apply again.' : 'Apply to become one of 100 main BIXLINK leaders. The owner reviews every application.'}</p><Button className="mt-4 rounded-full bg-chart-3 text-background" onClick={async () => { try { await apply(); await refetch(); setMsg('Application submitted.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not apply.'); } }}>Apply as leader</Button></>
    : s.status === 'pending' ? <p className="mt-2 text-sm text-chart-3">Application pending owner review.</p>
    : <div className="mt-3 text-sm"><p>Virtual balance: <b className="numeric text-chart-3">{money(s.virtual_usd)}</b></p>
      {s.require_turnover ? <><p className="mt-2 text-xs text-muted-foreground">Withdrawal of virtual balance unlocks when your direct network's active stakes reach {s.multiple}× your own stake package.</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-chart-2" style={{ width: `${pct}%` }}/></div><p className="numeric mt-1 text-xs">{money(s.turnover)} / {money(s.target)} {s.qualified ? '· Qualified ✓' : ''}</p>{s.own_stake === 0 && <p className="mt-1 text-xs text-chart-3">Activate a stake package first to set your target.</p>}</> : <p className="mt-2 text-xs text-chart-2">Withdrawal requirement waived by the owner.</p>}
    </div>}
    {msg && <p className="mt-3 text-xs text-chart-2">{msg}</p>}
  </section>;
}
