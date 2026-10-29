import { describe, expect, it } from 'vitest';
import { parseWalletRecipient } from '../lib/sovereign-flow';

describe('Sovereign dual-mode recipient isolation', () => {
  it('accepts a BIX member ID and an existing BIX PAY QR link in account mode', () => {
    expect(parseWalletRecipient('bix-123456', true)).toBe('BIX-123456');
    expect(parseWalletRecipient('https://example.org/pay?to=BIX-123456', true)).toBe('BIX-123456');
  });
  it('does not interpret a blockchain address as an internal recipient', () => {
    expect(parseWalletRecipient('0x' + '1'.repeat(40), true)).toBeNull();
  });
  it('only accepts blockchain recipients in Web3 mode', () => {
    expect(parseWalletRecipient('BIX-123456', false)).toBeNull();
    expect(parseWalletRecipient('ethereum:0x' + '1'.repeat(40), false)).toBe('0x' + '1'.repeat(40));
  });
});