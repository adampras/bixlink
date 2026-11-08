import { describe, expect, it } from 'vitest';
import { cartTotal, nextStatuses } from './bixgo-merchant';

describe('BIXGO merchant rules', () => {
  it('sums cart lines by price x qty', () => { expect(cartTotal([{ price: 15000, qty: 2 }, { price: 5000, qty: 1 }])).toBe(35000); });
  it('merchant flow pending → accepted → ready → completed', () => {
    expect(nextStatuses('pending', 'merchant')).toEqual(['accepted', 'rejected']);
    expect(nextStatuses('accepted', 'merchant')).toEqual(['ready']);
    expect(nextStatuses('ready', 'merchant')).toEqual(['completed']);
    expect(nextStatuses('completed', 'merchant')).toEqual([]);
  });
  it('buyer can only cancel while pending', () => {
    expect(nextStatuses('pending', 'buyer')).toEqual(['cancelled']);
    expect(nextStatuses('accepted', 'buyer')).toEqual([]);
  });
});
