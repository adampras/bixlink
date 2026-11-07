import { describe, expect, it } from 'vitest';
import { BIXGO_DEFAULTS } from './bixgo';
describe('BIXGO default rates', () => {
  it('opens BIXGO to the public by default', () => expect(BIXGO_DEFAULTS.enabled).toBe(true));
  it('bike per km is below Rp2,500', () => expect(BIXGO_DEFAULTS.services.ride.perKmIdr).toBe(2_300));
  it('car per km is below Rp4,000', () => expect(BIXGO_DEFAULTS.services.car.perKmIdr).toBe(3_800));
});
