import { describe, expect, it } from 'vitest';
import { standardApys, standardDailyPct } from '@/lib/yield-preset';

describe('standard yield preset', () => {
  it('lowest package 30D is 0.5% per day', () => expect(standardDailyPct(0, 0)).toBe(0.5));
  it('highest package 360D stays at or under 1% per day', () => expect(standardDailyPct(7, 4)).toBeLessThanOrEqual(1));
  it('annual APY stays within the 360 server cap', () => expect(Math.max(...Object.values(standardApys(7))))).toBeLessThanOrEqual(360));
});
