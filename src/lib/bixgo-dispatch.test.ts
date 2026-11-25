import { describe, expect, it } from 'vitest';
import { dispatchLocationSchema, freshDispatchFix } from './bixgo-dispatch';

describe('dispatch GPS safety', () => {
  it('accepts a fix up to 90 seconds old but rejects older locations', () => {
    expect(freshDispatchFix(10_000, 100_000)).toBe(true);
    expect(freshDispatchFix(9_999, 100_000)).toBe(false);
  });
  it('rejects future timestamps', () => expect(freshDispatchFix(100_001, 100_000)).toBe(false));
  it('requires GPS accuracy within 150 metres', () => {
    expect(dispatchLocationSchema.safeParse({ lat: -8.58, lng: 116.1, accuracy: 150 }).success).toBe(true);
    expect(dispatchLocationSchema.safeParse({ lat: -8.58, lng: 116.1, accuracy: 151 }).success).toBe(false);
  });
  it('rejects invalid coordinates', () => {
    expect(dispatchLocationSchema.safeParse({ lat: 91, lng: 116, accuracy: 5 }).success).toBe(false);
    expect(dispatchLocationSchema.safeParse({ lat: -8, lng: Infinity, accuracy: 5 }).success).toBe(false);
  });
});