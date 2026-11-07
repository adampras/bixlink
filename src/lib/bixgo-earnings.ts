import { payKind, type PayKind } from './bixgo-pay';

export type EarningsTrip = {
  id: string; status: string; pay_method?: string; created_at: string; completed_at?: string | null;
  fare_usdt?: number; driver_usdt?: number; fare_bix?: number; driver_bix?: number;
  fare_idr?: number; total_idr: number; gas_bix?: number;
};
export type EarningsRange = 'today' | 'week' | 'all';
const value = (n: number | undefined) => n == null || !Number.isFinite(Number(n)) ? null : Number(n);
export function receiptAmounts(j: EarningsTrip) {
  const kind = payKind(j.pay_method);
  const gross = value(kind === 'bix' ? j.fare_bix : kind === 'cash' ? j.fare_idr ?? j.total_idr : j.fare_usdt);
  const net = kind === 'cash' ? gross : value(kind === 'bix' ? j.driver_bix : j.driver_usdt);
  const fee = kind === 'cash' ? value(j.gas_bix) : gross == null || net == null ? null : Math.max(0, gross - net);
  return { kind, gross, net, fee, unit: kind === 'cash' ? 'IDR' : kind === 'bix' ? 'BIX' : 'USDT', feeUnit: kind === 'usdt' ? 'USDT' : 'BIX' };
}
export function earningsRows<T extends EarningsTrip>(trips: T[], range: EarningsRange, payment: PayKind | 'all', query: string, now = new Date()) {
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const since = range === 'today' ? midnight.getTime() : range === 'week' ? now.getTime() - 7 * 864e5 : 0;
  return trips.filter(j => j.status === 'completed' && new Date(j.completed_at ?? j.created_at).getTime() >= since &&
    (payment === 'all' || payKind(j.pay_method) === payment) && j.id.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime());
}
export function earningsTotals(trips: EarningsTrip[]) {
  return trips.reduce((total, j) => {
    const r = receiptAmounts(j);
    if (r.kind === 'cash') { total.cash += r.net ?? 0; total.cashFeeBix += r.fee ?? 0; }
    else if (r.kind === 'bix') total.bix += r.net ?? 0;
    else total.usdt += r.net ?? 0;
    return total;
  }, { usdt: 0, bix: 0, cash: 0, cashFeeBix: 0 });
}
export function earningsCsv(trips: EarningsTrip[]) {
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [['Trip ID', 'Completed', 'Payment', 'Fare', 'Driver receipt', 'Currency', 'Company fee', 'Fee currency'],
    ...trips.map(j => { const r = receiptAmounts(j); return [j.id, j.completed_at ?? j.created_at, r.kind, r.gross, r.net, r.unit, r.fee, r.feeUnit]; })]
    .map(row => row.map(escape).join(',')).join('\r\n');
}