import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getTeamAccounts, setTeamAccountActive } from '@/lib/team.functions';
import { Power } from 'lucide-react';

export function AdminTeams({ onMessage }: { onMessage: (m: string) => void }) {
  const list = useServerFn(getTeamAccounts); const toggle = useServerFn(setTeamAccountActive);
  const { data = [], refetch } = useQuery({ queryKey: ['admin-teams'], queryFn: () => list() });
  const name = (id: string | null) => data.find(d => d.user_id === id)?.label ?? 'lsevenplus75';
  return <div className="mt-8 space-y-3">
    <h3 className="font-display text-lg font-black">Founder & Leader teams</h3>
    {data.map(a => <div key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-xs">
      <div><b className="text-sm">{a.label}</b> <span className="ml-1 rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold uppercase text-chart-3">{a.team_role} · {a.region}</span>
        <div className="mt-1 text-muted-foreground">{a.email} · sponsor {name(a.sponsor_id)}</div></div>
      <Button size="sm" variant={a.active ? 'default' : 'outline'} className="rounded-full" onClick={async () => { try { await toggle({ data: { userId: a.user_id, active: !a.active } }); await refetch(); onMessage(`${a.label} ${a.active ? 'deactivated' : 'activated'}.`); } catch (e) { onMessage(e instanceof Error ? e.message : 'Could not update account.'); } }}><Power/> {a.active ? 'ACTIVE' : 'INACTIVE'}</Button>
    </div>)}
    {!data.length && <p className="text-sm text-muted-foreground">No team accounts yet.</p>}
  </div>;
}
