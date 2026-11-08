import { describe, expect, it } from 'vitest';
import { isDirectTransfer, payKind, tripQuote } from './bixgo-pay';

describe('BIXGO direct-to-driver payments', () => {
  it('QR and bank transfer pay the 15% fee as BIX gas like cash', () => {
    expect(payKind('QRIS')).toBe('cash');
    expect(payKind('Bank')).toBe('cash');
    expect(tripQuote(160000, 0, 16000, 15, payKind('Bank')).gasBix).toBe(3);
  });
  it('only QR and bank need payment confirmation', () => {
    expect(isDirectTransfer('QRIS')).toBe(true);
    expect(isDirectTransfer('Cash')).toBe(false);
  });
});
