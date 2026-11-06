import { describe, expect, it } from 'vitest';
import { payKind, tripQuote } from './bixgo-pay';

describe('BIXGO driver fare & payment', () => {
  it('driver adjustment is capped at +30%', () => {
    expect(tripQuote(100_000, 50, 16_000, 15, 'usdt').fareIdr).toBe(130_000);
  });
  it('driver adjustment is floored at -20%', () => {
    expect(tripQuote(100_000, -40, 16_000, 15, 'usdt').fareIdr).toBe(80_000);
  });
  it('cash trip charges driver 15% fee in BIX at 0.50 USD', () => {
    // 160,000 IDR = 10 USD → fee 1.5 USD → 3 BIX
    expect(tripQuote(160_000, 0, 16_000, 15, 'cash').gasBix).toBe(3);
  });
  it('BIX trip pays driver 85%', () => {
    const q = tripQuote(160_000, 0, 16_000, 15, 'bix');
    expect(q.bix).toBe(20);
    expect(q.driverBix).toBe(17);
  });
  it('maps stored pay methods', () => {
    expect(payKind('BIX Token')).toBe('bix');
    expect(payKind('Cash')).toBe('cash');
  });
});
