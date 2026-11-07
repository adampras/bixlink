import { useState } from 'react';
import { ChevronDown, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { earningsCsv, earningsRows, earningsTotals, receiptAmounts, type EarningsRange, type EarningsTrip } from '@/lib/bixgo-earnings';
import type { PayKind } from '@/lib/bixgo-pay';

type Trip = EarningsTrip & { pickup: string; dropoff: string; km: number; service: string; city: string; rating?: number | null; rating_note?: string };
const money = (n: number | null, unit: string) => n == null ? 'Not recorded' : unit === 'IDR' ? `Rp ${Math.round(n).toLocaleString('id-ID')}` : `${n.toFixed(2)} ${unit}`;
export function BixgoEarnings({ trips }: { trips: Trip[] }) {
  const [range, setRange] = useState<EarningsRange>('week');
  const [payment, setPayment] = useState<PayKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const rows = earningsRows(trips, range, payment, query);
  const total = earningsTotals(rows);
  const download = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', earningsCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `BIXGO-earnings-${range}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="space-y-3 border-t border-border pt-4" aria-label="Driver earnings">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Earnings slip</h4><Button size="icon" variant="outline" disabled={!rows.length} onClick={download} title="Download earnings CSV" aria-label="Download earnings CSV"><Download/></Button></div>
    <div className="grid grid-cols-3 gap-1" role="group" aria-label="Earnings period">{(['today', 'week', 'all'] as const).map(r => <Button size="sm" key={r} variant={range === r ? 'secondary' : 'ghost'} aria-pressed={range === r} onClick={() => setRange(r)}>{r === 'today' ? 'Today' : r === 'week' ? '7 days' : 'All time'}</Button>)}</div>
    <div className="grid grid-cols-2 gap-2"><label className="flex min-w-0 items-center gap-2 rounded-md border border-input px-2"><Search className="h-4 w-4 shrink-0 text-muted-foreground"/><input aria-label="Search trip ID" placeholder="Trip ID" value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 w-full bg-transparent py-2 text-xs outline-none"/></label><select aria-label="Payment filter" value={payment} onChange={e => setPayment(e.target.value as PayKind | 'all')} className="rounded-md border border-input bg-card px-2 text-xs"><option value="all">All payments</option><option value="usdt">USDT</option><option value="bix">BIX</option><option value="cash">Cash</option></select></div>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 bg-muted/40 p-3 text-xs tabular-nums">
      {([['USDT received', money(total.usdt, 'USDT')], ['BIX received', money(total.bix, 'BIX')], ['Cash collected', money(total.cash, 'IDR')], ['Cash-trip BIX fees', money(total.cashFeeBix, 'BIX')]]).map(([label, amount]) => <div key={label} className="min-w-0"><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="break-words font-bold">{amount}</dd></div>)}
    </dl>
    <p className="text-[11px] text-muted-foreground">{rows.length} completed trips · Cash is collected directly, not credited to your wallet.</p>
    {!rows.length && <p className="py-4 text-center text-xs text-muted-foreground">No completed trips match these filters.</p>}
    <div className="space-y-2">{rows.map(j => { const r = receiptAmounts(j); return <details key={j.id} className="rounded-lg border border-border bg-card p-3 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2"><div className="min-w-0 flex-1"><b className="block">{j.service.toUpperCase()} · #{j.id.slice(0, 8).toUpperCase()}</b><span className="text-[10px] text-muted-foreground">{new Date(j.completed_at ?? j.created_at).toLocaleString()}</span></div><b className="text-primary tabular-nums">{money(r.net, r.unit)}</b><ChevronDown className="h-4 w-4 shrink-0"/></summary>
      <div className="mt-3 space-y-2 border-t border-border pt-3"><p className="break-words">{j.pickup} → {j.dropoff}</p><p className="text-muted-foreground">{j.city} · {Number(j.km).toFixed(1)} km · {r.kind.toUpperCase()}</p><dl className="space-y-1 tabular-nums">{[['Fare', money(r.gross, r.unit)], [r.kind === 'cash' ? 'BIX fee paid separately' : 'Company deduction', money(r.fee, r.feeUnit)], [r.kind === 'cash' ? 'Cash collected' : 'Driver received', money(r.net, r.unit)]].map(([label, amount]) => <div key={label} className="flex flex-wrap justify-between gap-1"><dt>{label}</dt><dd className="font-semibold">{amount}</dd></div>)}</dl><p className="break-all text-[10px] text-muted-foreground">Trip ID: {j.id}</p>{j.rating && <p className="break-words text-primary">{'★'.repeat(j.rating)} {j.rating_note}</p>}</div>
    </details>; })}</div>
  </section>;
}