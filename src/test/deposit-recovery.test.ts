import { describe, expect, it } from 'vitest';
import { manualCreditAmount, isNearAmount, normalizeHash, MANUAL_MIN_USD } from '@/lib/deposit-recovery';

describe('manual on-chain deposit recovery', () => {
  it('credits exactly the on-chain amount, rounded down to cents', () => {
    expect(manualCreditAmount(99.237)).toBe(99.23);
    expect(manualCreditAmount(100.999)).toBe(100.99);
  });
  it('requires at least 1 USD stablecoin', () => {
    expect(MANUAL_MIN_USD).toBe(1);
    expect(manualCreditAmount(0.999) < MANUAL_MIN_USD).toBe(true);
  });
  it('suggests a member when the exchange fee cut the amount a little', () => {
    expect(isNearAmount(100.427, 99.427)).toBe(true);
    expect(isNearAmount(500, 400)).toBe(false);
  });
  it('stores TRON TxIDs without 0x and keeps EVM 0x', () => {
    expect(normalizeHash('TRC20', '0xabc')).toBe('abc');
    expect(normalizeHash('BEP20', '0xabc')).toBe('0xabc');
  });
});
