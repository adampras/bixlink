import { describe, expect, it } from 'vitest';
import { nftTier, nftBuybackBix, monthlyRate } from '@/lib/nft';

describe('reactor NFT cards', () => {
  it('smallest package on shortest lock is COMMON', () => { expect(nftTier(10, 30)).toBe('COMMON'); });
  it('largest package on 360 days is MYTHIC', () => { expect(nftTier(10000, 360)).toBe('MYTHIC'); });
  it('longer lock upgrades the same package', () => { expect(nftTier(500, 30)).toBe('RARE'); expect(nftTier(500, 180)).toBe('EPIC'); });
  it('buyback pays card value divided by BIX price', () => { expect(nftBuybackBix(1000, 0.5)).toBe(2000); });
  it('shows annual 24% as 2% per month', () => { expect(monthlyRate(24)).toBe(2); });
});

import { nftSignature as sigOf } from '@/lib/nft';
import { describe as d2, it as i2, expect as e2 } from 'vitest';
d2('nft signature', () => {
  i2('gives 40 distinct cards for 8 packages x 5 periods', () => {
    const prices = [10, 50, 100, 500, 1000, 3000, 5000, 10000];
    const codes = new Set(prices.flatMap(p => [30, 60, 90, 180, 360].map(d => sigOf(p, d).code)));
    e2(codes.size).toBe(40);
  });
});
