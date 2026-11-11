import { describe, expect, it } from 'vitest';
import { BIXGO_DEFAULTS, bixgoFare, readBixgo } from '@/lib/bixgo';

describe('BIXGO fare', () => {
  it('base + per km for BIXRide', () => { expect(bixgoFare(BIXGO_DEFAULTS, 'ride', 4).idr).toBe(18_200); });
  it('BIX payment applies 10% discount', () => { expect(bixgoFare(BIXGO_DEFAULTS, 'ride', 4, true).payIdr).toBe(16_380); });
  it('commission is 15% of paid fare', () => { expect(bixgoFare(BIXGO_DEFAULTS, 'car', 2).commissionIdr).toBe(3_390); });
  it('page open by default', () => { expect(readBixgo(undefined).enabled).toBe(true); });
});
