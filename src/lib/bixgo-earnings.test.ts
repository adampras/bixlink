import { describe, expect, it } from 'vitest';
import { earningsRows, earningsTotals, receiptAmounts } from './bixgo-earnings';
const trip = { id: 'trip-1', status: 'completed', created_at: '2026-11-07T08:00:00Z', total_idr: 160000 };
describe('Recorded BIXGO earnings', () => {
  it('shows the recorded 85% driver receipt and full company deduction, not the owner remainder', () => {
    expect(receiptAmounts({ ...trip, pay_method: 'BIX Token', fare_bix: 20, driver_bix: 17 })).toMatchObject({ gross: 20, net: 17, fee: 3 });
  });
  it('keeps cash collected separate from the prepaid BIX fee', () => {
    expect(earningsTotals([{ ...trip, pay_method: 'Cash', gas_bix: 3 }])).toEqual({ cash: 160000, cashFeeBix: 3, bix: 0, usdt: 0 });
  });
  it('does not invent a missing settled receipt', () => {
    expect(receiptAmounts({ ...trip, fare_usdt: 10 }).net).toBeNull();
  });
  it('excludes unfinished trips and filters payment and completion period', () => {
    const rows = [{ ...trip, pay_method: 'Cash' }, { ...trip, id: 'pending', status: 'assigned' }, { ...trip, id: 'old', created_at: '2026-10-01T00:00:00Z' }];
    expect(earningsRows(rows, 'week', 'cash', '', new Date('2026-11-07T14:00:00Z')).map(j => j.id)).toEqual(['trip-1']);
  });
});