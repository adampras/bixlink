import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import { BNB_CHAIN_ID, WALLET_CHALLENGE_TTL_MS, normalizeWalletAddress, walletProofMessage } from '@/lib/wallet-login';
describe('BNB identity proof', () => {
  it('limits identity proofs to BNB Chain and five minutes', () => {
    expect(BNB_CHAIN_ID).toBe(56);
    expect(WALLET_CHALLENGE_TTL_MS).toBe(300_000);
  });
  it('normalizes addresses and rejects malformed identities', () => {
    expect(normalizeWalletAddress('0xABCDEF0000000000000000000000000000000000')).toBe('0xabcdef0000000000000000000000000000000000');
    expect(() => normalizeWalletAddress('0x123')).toThrow();
  });
  it('binds signatures to origin, nonce and purpose', async () => {
    const account = privateKeyToAccount(`0x${'11'.repeat(32)}`);
    const message = walletProofMessage('https://bixlink.com', account.address, 'nonce1', 'login', '2026-10-26T05:20:00Z');
    const signature = await account.signMessage({ message });
    expect(await verifyMessage({ address: account.address, message, signature })).toBe(true);
    for (const changed of [walletProofMessage('https://other.example', account.address, 'nonce1', 'login', '2026-10-26T05:20:00Z'), walletProofMessage('https://bixlink.com', account.address, 'nonce2', 'login', '2026-10-26T05:20:00Z'), walletProofMessage('https://bixlink.com', account.address, 'nonce1', 'link', '2026-10-26T05:20:00Z')]) {
      expect(await verifyMessage({ address: account.address, message: changed, signature })).toBe(false);
    }
  });
});