import { describe, it, expect } from 'vitest';
import { BIXTRADE_DEFAULTS, bixtradeSettingsSchema, profitSplit, withdrawNet } from '@/lib/bixtrade';
describe('bixtrade plan', () => {
  it('default split is 70/20/10', () => { expect(profitSplit(BIXTRADE_DEFAULTS, 100)).toMatchObject({ member: 70, company: 20, affiliate: 10 }); });
  it('rejects split not totaling 100', () => { expect(bixtradeSettingsSchema.safeParse({ ...BIXTRADE_DEFAULTS, memberSharePct: 80 }).success).toBe(false); });
  it('early exit adds 5% on top of 2% fee', () => { expect(withdrawNet(BIXTRADE_DEFAULTS, 100, true)).toBe(93); });
});
