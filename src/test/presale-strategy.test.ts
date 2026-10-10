import { describe, expect, it } from 'vitest';
import { dividendSettled, genesisTier, strategyQuote } from '@/lib/presale-strategy';

// $1,000 package at $0.10 = 10,000 BIX, 180-day release, default owner settings.
describe('presale strategies', () => {
  it('hybrid gives 50% BIX and 0.3%/day on the 50% USDT half', () => {
    const q = strategyQuote('hybrid', 1000, 10000, 180);
    expect(q.bix).toBe(5000); expect(q.dailyUsd).toBeCloseTo(1.5); expect(q.totalUsd).toBe(270);
  });
  it('dividend gives full BIX and 0.2%/day: $360 over 180 days', () => {
    const q = strategyQuote('dividend', 1000, 10000, 180);
    expect(q.bix).toBe(10000); expect(q.totalUsd).toBe(360);
  });
  it('founder adds 20% yearly bonus BIX: 365 days = +2,000', () => {
    expect(strategyQuote('founder', 1000, 10000, 365).bonusBix).toBe(2000);
  });
  it('dividend stops at the release period', () => {
    expect(dividendSettled(2, 180, 0, 400 * 86_400_000)).toBe(360);
  });
  it('maps $100,000 to Sovereign tier', () => { expect(genesisTier(100000)).toBe('Sovereign Singularity'); });
});
