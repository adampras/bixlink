import { describe, expect, it } from 'vitest';
import { genesisTier, strategyQuote } from '@/lib/presale-strategy';

describe('presale strategies at $0.10', () => {
  it('hybrid splits $1,000 into $500 staking and 5,000 BIX', () => {
    const q = strategyQuote('hybrid', 1000, 0.1, 180);
    expect(q.stakingUsd).toBe(500); expect(q.bix).toBe(5000);
  });
  it('dividend pays 0.2%/day: $360 over 180 days on $1,000', () => {
    expect(strategyQuote('dividend', 1000, 0.1, 180).dividendUsd).toBe(360);
  });
  it('founder keeps 100% dev cash', () => {
    expect(strategyQuote('founder', 1000, 0.1, 365).bonusBix).toBe(2000);
  });
  it('maps $100,000 to Sovereign tier', () => { expect(genesisTier(100000)).toBe('Sovereign Singularity'); });
});
