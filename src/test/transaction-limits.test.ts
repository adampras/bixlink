import { describe, expect, it } from 'vitest';
import { buybackAmountSchema, canSendVirtualUsdt } from '@/lib/transaction-limits';
describe('requested transaction locks', () => {
  it('only permits verified Owner 1 to send vUSDT', () => {
    expect(canSendVirtualUsdt(true)).toBe(true);
    expect(canSendVirtualUsdt(false)).toBe(false);
  });
  it('requires at least 500 BIX for developer buyback', () => {
    expect(buybackAmountSchema.safeParse(499.99).success).toBe(false);
    expect(buybackAmountSchema.safeParse(500).success).toBe(true);
    expect(buybackAmountSchema.safeParse(Infinity).success).toBe(false);
  });
});