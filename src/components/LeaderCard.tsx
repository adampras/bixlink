import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { applyLeader, getMyLeader } from '@/lib/bixlink.functions';
import { money } from '@/lib/bixlink';
import { Crown, Info } from 'lucide-react';

export function LeaderCard() {
  const fetchMe = useServerFn(getMyLeader); const apply = useServerFn(applyLeader);
  const { data: s, refetch } = useQuery({ queryKey: ['my-leader'], queryFn: () => fetchMe() });
  const [msg, setMsg] = useState('');
  const pct = s && s.target > 0 ? Math.min(100, (s.turnover / s.target) * 100) : 0;
  return <section className="profile-leader">
    <div className="profile-leader-title"><span><Crown/></span><h2>Leader program</h2></div>
    {!s?.status || s.status === 'rejected' ? <><p className="mt-2 text-sm text-muted-foreground">{s?.status === 'rejected' ? 'Your previous application was rejected. You can apply again.' : 'Apply to become one of 100 main BIXLINK leaders. The owner reviews every application.'}</p><Button className="mt-4 rounded-full bg-chart-3 text-background" onClick={async () => { try { await apply(); await refetch(); setMsg('Application submitted.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not apply.'); } }}>Apply as leader</Button></>
    : s.status === 'pending' ? <p className="mt-2 text-sm text-chart-3">Application pending owner review.</p>
    : <div className="profile-leader-body"><div className="profile-leader-balance"><div><span>Virtual balance</span><b>{money(s.virtual_usd)}</b></div><div><span>Achievement</span><strong>{Math.round(pct)}%</strong></div></div>
      {s.require_turnover ? <><progress className="profile-leader-progress" max="100" value={pct}/><div className="profile-leader-range"><span>{money(s.turnover)}</span><span>{money(s.target)}</span></div><p className="profile-leader-note"><Info/> Withdrawal unlocks when your direct network's active stakes reach {s.multiple}× your own stake package.</p>{s.qualified && <p className="profile-qualified">Qualified ✓</p>}{s.own_stake === 0 && <p className="mt-2 text-xs text-chart-3">Activate a stake package first to set your target.</p>}</> : <p className="mt-2 text-xs text-chart-2">Withdrawal requirement waived by the owner.</p>}
    </div>}
    {msg && <p className="mt-3 text-xs text-chart-2">{msg}</p>}
  </section>;
}
