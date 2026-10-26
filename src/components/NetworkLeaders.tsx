import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { listNetworkLeaders, setNetworkLeader } from '@/lib/reviewer.functions';
import { Crown, LifeBuoy } from 'lucide-react';

const KINDS = [
  { value: 'none', label: 'Regular Member' },
  { value: 'sponsored_leader', label: 'Sponsored Leader' },
  { value: 'team_support', label: 'Team Leader Support' },
] as const;

/** Label-only leader designations within the caller's allowed network; no balances or payouts. */
export function NetworkLeaders({ onMessage }: { onMessage: (m: string) => void }) {
  const list = useServerFn(listNetworkLeaders); const save = useServerFn(setNetworkLeader); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['network-leaders'], queryFn: () => list() });
  const [search, setSearch] = useState(''); const [busy, setBusy] = useState('');
  const rows = (q.data ?? []).filter(r => !search || `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase()));
  const count = (k: string) => (q.data ?? []).filter(r => r.kind === k).length;
  return <section className="mt-6 rounded-[20px] border border-primary/60 bg-card p-5">
    <h2 className="font-display text-lg font-bold">Sponsored Leaders & Team Leader Support</h2>
    <p className="mt-1 text-xs text-muted-foreground">Designate members in your sponsor network. This is a role status only and does not add balances or bonuses.</p>
    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
      <div className="rounded-xl border border-border p-3"><Crown className="mx-auto text-primary" size={18}/><b className="block text-lg tabular-nums text-chart-2">{count('sponsored_leader')}</b>Sponsored Leaders</div>
      <div className="rounded-xl border border-border p-3"><LifeBuoy className="mx-auto text-primary" size={18}/><b className="block text-lg tabular-nums text-chart-2">{count('team_support')}</b>Team Support</div>
    </div>
    <input className="form-input mt-4 w-full" placeholder="Search member code or name" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search members"/>
    {q.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading network…</p>
      : q.error ? <p className="mt-4 text-sm text-destructive">{q.error instanceof Error ? q.error.message : 'Access denied.'}</p>
      : <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">{rows.map(r => <div key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs">
        <div className="min-w-0"><b className="font-mono text-primary">{r.code}</b> <span className="text-muted-foreground">{r.name}</span></div>
        <select aria-label={`Role for ${r.code}`} className="form-input h-9 min-w-0 text-xs" value={r.kind} disabled={busy === r.userId} onChange={async e => {
          const kind = e.target.value as typeof KINDS[number]['value']; setBusy(r.userId);
          try { await save({ data: { userId: r.userId, kind } }); await qc.invalidateQueries({ queryKey: ['network-leaders'] }); onMessage(`${r.code}: ${KINDS.find(k => k.value === kind)?.label}.`); }
          catch (err) { onMessage(err instanceof Error ? err.message : 'Failed to save.'); } finally { setBusy(''); }
        }}>{KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
      </div>)}{!rows.length && <p className="text-sm text-muted-foreground">No members found in this network.</p>}</div>}
  </section>;
}
