import { describe, it, expect } from 'vitest';
import { projectBixtrade, readBixtrade, BIXTRADE_DEFAULTS } from '@/lib/bixtrade';
describe('bixtrade', () => {
  it('defaults closed (under reconstruction)', () => { expect(readBixtrade(undefined).enabled).toBe(false); });
  it('clamps allocation to owner max', () => { expect(projectBixtrade({ ...BIXTRADE_DEFAULTS, maxAlloc: 500 }, 10000, 10).amount).toBe(500); });
  it('projects with owner daily range', () => { const p = projectBixtrade({ ...BIXTRADE_DEFAULTS, minDailyPct: 0.5, maxDailyPct: 1 }, 1000, 10); expect([p.low, p.high]).toEqual([50, 100]); });
});
