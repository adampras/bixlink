import { describe, expect, it } from 'vitest';
import { standardApys, standardDailyPct } from '@/lib/yield-preset';

describe('standard yield preset', () => {
  it('lowest package 30D is 0.5% per day', () => expect(standardDailyPct(0, 0)).toBe(0.5));
  it('highest package 360D stays at or under 1% per day', () => expect(standardDailyPct(7, 4)).toBeLessThanOrEqual(1));
  it('annual APY stays within the 360 server cap', () => expect(Math.max(...Object.values(standardApys(7)))).toBeLessThanOrEqual(360));
});

import { fluctuatedDailyPct, fluctuatedApys } from '@/lib/yield-preset';
describe('daily fluctuation', () => {
  it('never goes below 0.5% per day', () => { for (let i = 0; i < 14; i++) for (let j = 0; j < 5; j++) expect(fluctuatedDailyPct(i, j, '2026-10-11')).toBeGreaterThanOrEqual(0.5); });
  it('never goes above 1% per day', () => { for (let i = 0; i < 14; i++) for (let j = 0; j < 5; j++) expect(fluctuatedDailyPct(i, j, '2026-10-12')).toBeLessThanOrEqual(1); });
  it('same day gives same rates', () => expect(fluctuatedApys(3, '2026-10-11')).toEqual(fluctuatedApys(3, '2026-10-11')));
  it('distributes standards across all fourteen tiers instead of repeating tier eight', () => {
    expect(standardDailyPct(0, 0, 14)).toBe(0.5);
    expect(standardDailyPct(13, 4, 14)).toBe(0.97);
    expect(standardApys(8, 14)).not.toEqual(standardApys(13, 14));
  });
  it('changes the all-package daily grid on the next UTC date within the existing annual cap', () => {
    const grid = (day: string) => Array.from({length: 14}, (_, i) => fluctuatedApys(i, day, 14));
    expect(grid('2026-10-11')).not.toEqual(grid('2026-10-12'));
    for (const rates of grid('2026-10-12')) for (const rate of Object.values(rates)) {
      expect(rate / 365).toBeGreaterThanOrEqual(0.5);
      expect(rate).toBeLessThanOrEqual(360);
    }
  });
});
