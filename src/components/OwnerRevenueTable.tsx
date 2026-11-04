import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { getOwnerRevenue } from '@/lib/deposit.functions';
import { dateTime, money } from '@/lib/bixlink';
import { Landmark } from 'lucide-react';

/** Real turnover ledger: approved on-chain deposits, grouped by the Owner wallet that received them. */
export function OwnerRevenueTable() {
  const load = useServerFn(getOwnerRevenue);
  const { data = [], isLoading } = useQuery({ queryKey: ['owner-revenue'], queryFn: () => load() });
  const [owner, setOwner] = useState('all');
  const groups = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const r of data) { const g = m.get(r.owner_code) ?? { total: 0, count: 0 }; g.total += r.amount_usd; g.count++; m.set(r.owner_code, g); }
    return [...m.entries()];
  }, [data]);
  const total = data.reduce((s, r) => s + r.amount_usd, 0);
  const rows = data.filter(r => owner === 'all' || r.owner_code === owner);
  return <section className="rounded-[20px] border border-primary/50 bg-card p-5">
    <h3 className="flex items-center gap-2 font-display text-lg font-black"><Landmark size={18}/> Actual turnover received</h3>
    <p className="mt-1 text-xs text-muted-foreground">Only approved deposits. Clone accounts are not counted.</p>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button type="button" onClick={() => setOwner('all')} data-active={owner === 'all'} className="rounded-xl border border-border p-3 text-left data-[active=true]:border-primary"><div className="text-[10px] uppercase text-muted-foreground">Total</div><div className="font-mono font-bold tabular-nums text-chart-2">{money(total)}</div><div className="text-[10px] text-muted-foreground">{data.length} deposit</div></button>
      {groups.map(([code, g]) => <button key={code} type="button" onClick={() => setOwner(code)} data-active={owner === code} className="rounded-xl border border-border p-3 text-left data-[active=true]:border-primary"><div className="text-[10px] uppercase text-muted-foreground">{code}</div><div className="font-mono font-bold tabular-nums text-chart-2">{money(g.total)}</div><div className="text-[10px] text-muted-foreground">{g.count} deposit</div></button>)}
    </div>
    <div className="mt-4 max-h-96 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-card text-muted-foreground"><tr><th className="py-2">Tanggal</th><th>Member</th><th>Wallet</th><th>Owner</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="border-t border-border"><td className="py-2">{dateTime(r.created_at)}</td><td className="font-mono">{r.member_code}</td><td>{r.wallet_code ?? '—'} · {r.network ?? ''}</td><td>{r.owner_code}</td><td className="text-right font-mono tabular-nums text-chart-2">{money(r.amount_usd)}</td></tr>)}</tbody>
      </table>
      {!rows.length && <p className="py-4 text-sm text-muted-foreground">{isLoading ? 'Loading…' : 'No turnover yet.'}</p>}
    </div>
  </section>;
}
