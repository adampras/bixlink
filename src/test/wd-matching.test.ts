import { describe, it, expect } from 'vitest';
import { wdSplit, wdMatchingError, DEFAULT_WD_MATCHING } from '@/lib/wd-matching';
describe('WD matching', () => {
  it('5% fee with 3% to sponsor on $100', () => {
    expect(wdSplit(100, DEFAULT_WD_MATCHING)).toEqual({ fee: 5, match: 3, platform: 2, net: 95 });
  });
  it('matching cannot exceed fee', () => {
    expect(wdMatchingError({ ...DEFAULT_WD_MATCHING, matchPct: 6 })).not.toBeNull();
  });
});
