import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Crown } from 'lucide-react';
import { getConditionalLeaderAccess } from '@/lib/bixlink.functions';

// Info-only card: visible to Owner 1 and Owner 1's network (server-gated); hidden for Owner 2–5 networks.
export function ConditionalLeaderInfo() {
  const fetchAccess = useServerFn(getConditionalLeaderAccess);
  const { data } = useQuery({ queryKey: ['conditional-leader-access'], queryFn: () => fetchAccess() });
  if (!data?.allowed) return null;
  const rows = [
    ['Account value', 'Up to a $5,000 package (existing conditional leaders keep their set value)'],
    ['Turnover target', '5× the joined package value'],
    ['After 5× reached', 'Special company rewards and challenges'],
    ['BIXCOIN distribution', '5–10% when your members/investors stake with the 70:30 split'],
    ['BIX allocation', 'Eligible when team turnover exceeds $100,000'],
  ];
  return <section className="mt-6 rounded-2xl border border-chart-3/50 bg-card p-5">
    <div className="eyebrow flex items-center gap-2 text-chart-3"><Crown size={14}/> CONDITIONAL LEADER ACCOUNT · GLOBAL</div>
    <h2 className="mt-1 font-display text-lg font-black">Conditional loan account for leaders worldwide</h2>
    <dl className="mt-3 space-y-2 text-xs">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2 border-b border-border/60 pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
    <p className="mt-3 text-[10px] text-muted-foreground">Conditional account is an internal locked credit, not withdrawable funds. Rewards and allocations are reviewed and approved by the owner. Terms apply.</p>
  </section>;
}
