import { describe, expect, it } from 'vitest';
import { BIXGO_DEFAULTS, cityFare } from './bixgo';
describe('cityFare', () => {
  it('applies Dubai 1.8x multiplier', () => expect(cityFare(BIXGO_DEFAULTS, 'dubai', 200_000)).toBe(360_000));
  it('enforces London minimum fare', () => expect(cityFare(BIXGO_DEFAULTS, 'london', 10_000)).toBe(160_000));
  it('leaves unknown city unchanged', () => expect(cityFare(BIXGO_DEFAULTS, 'xyz', 5_000)).toBe(5_000));
});
