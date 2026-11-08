import { describe, it, expect } from 'vitest';
import { gasFeeBix, careNext } from './bixcare';

describe('BIXCARE gas fee', () => {
  it('car wash Rp50.000 at 3% costs 0.1875 BIX', () => { expect(gasFeeBix(50000, 'wash')).toBe(0.1875); });
  it('rental Rp1.000.000 at 2% costs 2.5 BIX', () => { expect(gasFeeBix(1000000, 'rent')).toBe(2.5); });
  it('buyer can only cancel while pending', () => { expect(careNext('accepted', 'buyer')).toEqual([]); expect(careNext('pending', 'buyer')).toEqual(['cancelled']); });
});

import { payQuote, walletNet } from './bixcare';
describe('bixcare wallet pay', () => {
  it('quotes Rp80.000 as 5 USDT and 10 BIX', () => { expect(payQuote(80000)).toEqual({ usdt: 5, bix: 10 }); });
  it('wash outlet nets 97% of a 10 BIX payment', () => { expect(walletNet(10, 'wash')).toBe(9.7); });
});

import { careStats, gasRunway, timeSlots } from './bixcare';
describe('bixcare dashboard helpers', () => {
  const base = { id: 'a', status: 'completed', total_idr: 100000, pay_method: 'qris', merchant_bix: 0, merchant_usdt: 0, fee_bix: 6, created_at: '2026-11-08T05:00:00Z', items: [] } as never;
  it('sums only completed orders', () => {
    const s = careStats([base, { ...(base as object), status: 'pending' } as never]);
    expect(s.orders).toBe(1); expect(s.omzet).toBe(100000); expect(s.byMethod['qris']).toBe(100000);
  });
  it('gas runway keeps the 20 BIX minimum', () => { expect(gasRunway(50, 6)).toBe(5); expect(gasRunway(15, 6)).toBe(0); });
  it('2-hour slots fit inside opening hours', () => {
    const s = timeSlots('08:00', '17:00', new Date('2026-11-08T00:00:00'), 1);
    expect(s.map(d => d.getHours())).toEqual([8, 10, 12, 14]);
  });
});
