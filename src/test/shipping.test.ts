import { describe, expect, it } from 'vitest';
import { cartSubtotal, p2pPriceAllowed, shippingCost } from '@/lib/shipping';

describe('shop shipping', () => {
  it('charges DHL base plus per extra item', () => expect(shippingCost('dhl', 3)).toBe(47));
  it('charges nothing for an empty cart', () => expect(shippingCost('jne-reg', 0)).toBe(0));
  it('sums cart subtotal', () => expect(cartSubtotal([{ id: 'a', name: 'A', priceUsd: 12.5, qty: 2 }])).toBe(25));
});
describe('p2p corridor', () => {
  it('rejects below $0.25 floor', () => expect(p2pPriceAllowed(0.24)).toBe(false));
  it('rejects above $0.50 ceiling', () => expect(p2pPriceAllowed(0.51)).toBe(false));
  it('accepts inside corridor', () => expect(p2pPriceAllowed(0.42)).toBe(true));
});
