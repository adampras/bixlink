import { describe, expect, it } from 'vitest';
import { BIXGO_DEFAULTS, cityFare } from './bixgo';
describe('cityFare', () => {
  it('applies Kuala Lumpur 1.35x multiplier', () => expect(cityFare(BIXGO_DEFAULTS, 'my-kuala-lumpur', 200_000)).toBe(270_000));
  it('enforces Jakarta minimum fare', () => expect(cityFare(BIXGO_DEFAULTS, 'jakarta-selatan', 5_000)).toBe(12_000));
  it('leaves unknown city unchanged', () => expect(cityFare(BIXGO_DEFAULTS, 'xyz', 5_000)).toBe(5_000));
});
