import { describe, expect, it } from 'vitest';
import { BIXTRADE_DEFAULTS, planExecutions } from '@/lib/bixtrade';
const cfg = { ...BIXTRADE_DEFAULTS, enabled: true, minDailyPct: 0.5, maxDailyPct: 0.5, winRate: 99 };
const prices = { BTCUSDT: 68000, ETHUSDT: 3500, SOLUSDT: 150, BNBUSDT: 600 };
describe('planExecutions', () => {
  it('caps trades at 12 and keeps net within owner daily range', () => {
    const to = new Date('2026-10-31T12:00:00Z'), from = new Date(to.getTime() - 86400000);
    const p = planExecutions(cfg, 1000, prices, from, to, () => 0.5);
    expect(p).toHaveLength(12);
    expect(p.reduce((s, x) => s + x.net_usd, 0)).toBeCloseTo(5, 1);
  });
  it('records nothing inside the 5-minute wait or without capital', () => {
    const to = new Date(); expect(planExecutions(cfg, 1000, prices, new Date(to.getTime() - 60000), to)).toHaveLength(0);
    expect(planExecutions(cfg, 0, prices, new Date(0), to)).toHaveLength(0);
  });
});
