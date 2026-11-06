import { describe, it, expect } from 'vitest';
import { cryptoEquivalent, formatMoney } from './bixgo-global';
describe('BIXGO global display', () => {
  it('converts 160,000 IDR at 16,000/USDT to 10 USD', () => { expect(formatMoney(160_000, 'USD', 16_000)).toBe('$10.00'); });
  it('converts to AED at 3.6725 per USD', () => { expect(formatMoney(160_000, 'AED', 16_000)).toBe('AED 36.73'); });
  it('prices BIX at the 0.50 reference', () => { expect(cryptoEquivalent(160_000, 16_000)).toEqual({ usdt: 10, bix: 20 }); });
  it('converts to MYR at 4.45 per USD', () => { expect(formatMoney(160_000, 'MYR', 16_000)).toBe('RM 44.50'); });
});
