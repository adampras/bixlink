import { describe, expect, it } from 'vitest';
import { apyToDaily, cleanDaily, dailyToApy, flatApys, ladderApys, shiftApys } from '@/lib/yield-preset';

describe('flat daily profit 0.5%–1.2%', () => {
  it('clamps below 0.5% up to 0.5%', () => expect(cleanDaily(0.2)).toBe(0.5));
  it('clamps above 1.2% down to 1.2%', () => expect(cleanDaily(2)).toBe(1.2));
  it('removes trailing decimals', () => expect(cleanDaily(0.8123)).toBe(0.8));
  it('1.2% daily stores as 438 annual and reads back as 1.2', () => { expect(dailyToApy(1.2)).toBe(438); expect(apyToDaily(438)).toBe(1.2); });
  it('ladder is 0.5/0.6/0.8/1.0/1.2', () => expect(Object.values(ladderApys()).map(apyToDaily)).toEqual([0.5, 0.6, 0.8, 1, 1.2]));
  it('flat sets every duration equal', () => expect(new Set(Object.values(flatApys(0.8))).size).toBe(1));
  it('shift stays within range', () => expect(Object.values(shiftApys(flatApys(1.2), 0.05)).map(apyToDaily)).toEqual([1.2, 1.2, 1.2, 1.2, 1.2]));
});
