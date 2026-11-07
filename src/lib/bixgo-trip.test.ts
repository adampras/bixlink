import { describe, expect, it } from 'vitest';
import { canCancelTrip, validCancelReason, locationFresh } from './bixgo-trip';
describe('BIXGO trip safety', () => {
  it('allows cancellation before start but not during or after a trip', () => {
    expect(['pending', 'assigned', 'in_transit', 'completed', 'cancelled'].map(canCancelTrip)).toEqual([true, true, false, false, false]);
  });
  it('requires an explanation for Other', () => {
    expect(validCancelReason('rider', 'Other', '')).toBe(false);
    expect(validCancelReason('rider', 'Other', 'Incorrect address')).toBe(true);
  });
  it('does not accept rider reasons for a driver', () => {
    expect(validCancelReason('driver', 'Driver taking too long', '')).toBe(false);
  });
  it('never labels a stale GPS position live', () => {
    const now = Date.parse('2026-11-07T15:00:00Z');
    expect(locationFresh('2026-11-07T14:59:30Z', now)).toBe(true);
    expect(locationFresh('2026-11-07T14:58:00Z', now)).toBe(false);
    expect(locationFresh(null, now)).toBe(false);
  });
});