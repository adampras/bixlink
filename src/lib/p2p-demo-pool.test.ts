import { describe, expect, it } from 'vitest';
import { DEMO_POOL, demoFeed, demoPool, demoPrice } from './p2p-demo-pool';

describe('demo pool', () => {
  it('keeps every demo price between 0.30 and 0.50', () => {
    for (let s = 0; s < 20000; s++) { const p = demoPrice(s); expect(p).toBeGreaterThanOrEqual(0.3); expect(p).toBeLessThanOrEqual(0.5); }
  });
  it('never exceeds 500,000 BIX or 200,000 vUSDT', () => {
    for (let t = 0; t < 50; t++) { const p = demoPool(1_800_000_000_000 + t * 3_600_000); expect(p.bix).toBeLessThanOrEqual(DEMO_POOL.bix); expect(p.vusdt).toBeLessThanOrEqual(DEMO_POOL.vusdt); expect(p.vusdt).toBeGreaterThanOrEqual(0); }
  });
  it('marks every simulated fill as demo and is identical for all viewers', () => {
    const now = 1_800_000_000_000; const a = demoFeed(now); expect(a.every(f => f.demo)).toBe(true); expect(demoFeed(now)).toEqual(a);
  });
});
