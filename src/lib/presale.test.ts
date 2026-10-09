import { describe, expect, it } from 'vitest';
import { presaleReleased, sponsorBix } from './presale';

describe('presale', () => {
  it('sponsor receives 10% of package BIX', () => { expect(sponsorBix(17500, 10)).toBe(1750); });
  it('releases half after half the duration', () => {
    const start = Date.UTC(2026, 0, 1);
    expect(presaleReleased(1000, 10, start, start + 5 * 86_400_000)).toBe(500);
  });
  it('never releases more than the package', () => {
    const start = Date.UTC(2026, 0, 1);
    expect(presaleReleased(1000, 10, start, start + 99 * 86_400_000)).toBe(1000);
  });
});

import { bixForUsd } from './presale';
describe('presale price', () => {
  it('$500 at $0.50 per BIX gives 1000 BIX', () => { expect(bixForUsd(500, 0.5)).toBe(1000); });
  it('$10000 at $0.10 per BIX gives 100000 BIX', () => { expect(bixForUsd(10000, 0.1)).toBe(100000); });
});
