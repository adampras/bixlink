import { describe, expect, it } from 'vitest';
import { DEFAULT_FRANCHISES, franchiseSchema, haversineKm, splitCommission, franchiseFor, BIXGO_DEFAULTS } from './bixgo';

describe('BIXGO franchise', () => {
  it('rejects splits not totaling 100%', () => {
    expect(franchiseSchema.safeParse({ ...DEFAULT_FRANCHISES[0], poolPct: 30 }).success).toBe(false);
  });
  it('splits commission with remainder to platform', () => {
    const s = splitCommission({ ...DEFAULT_FRANCHISES[0]!, franchisePct: 50, platformPct: 30, poolPct: 20 }, 3000);
    expect(s).toEqual({ franchise: 1500, pool: 600, platform: 900 });
  });
  it('no franchise means all commission to platform', () => {
    expect(splitCommission(null, 3000)).toEqual({ franchise: 0, platform: 3000, pool: 0 });
  });
  it('finds Makassar branch within radius only', () => {
    expect(franchiseFor(BIXGO_DEFAULTS, { lat: -5.15, lng: 119.43 })?.city).toBe('Makassar');
    expect(franchiseFor(BIXGO_DEFAULTS, { lat: 25.2, lng: 55.27 })).toBeNull();
  });
  it('haversine Makassar–Jakarta ≈ 1420 km', () => {
    expect(Math.round(haversineKm({ lat: -5.1477, lng: 119.4327 }, { lat: -6.2, lng: 106.816 }) / 10)).toBeGreaterThan(138);
  });
});
