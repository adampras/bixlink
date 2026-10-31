import { describe, expect, it } from 'vitest';
import { BIXTRADE_DEFAULTS, botCapital, dailySeries } from '@/lib/bixtrade';

describe('bixtrade settlement', () => {
  it('capital counts only settled rows: deposits minus gross withdrawals', () => {
    expect(botCapital([
      { kind: 'deposit', amount_usd: 500, settled_at: '2026-10-01' },
      { kind: 'deposit', amount_usd: 100, settled_at: null },
      { kind: 'withdraw', amount_usd: 200, settled_at: '2026-10-10' },
    ])).toBe(300);
  });
  it('daily performance stays inside owner range and is stable per day', () => {
    const s = { ...BIXTRADE_DEFAULTS, minDailyPct: 0.3, maxDailyPct: 0.8 };
    const a = dailySeries(s, 14, new Date('2026-10-31T00:00:00Z'));
    expect(a).toHaveLength(14);
    expect(a.every(x => x.pct >= 0.3 && x.pct <= 0.8)).toBe(true);
    expect(dailySeries(s, 14, new Date('2026-10-31T00:00:00Z'))).toEqual(a);
  });
});
