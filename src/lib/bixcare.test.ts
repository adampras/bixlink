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
