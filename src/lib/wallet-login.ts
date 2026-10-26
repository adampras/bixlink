export const BNB_CHAIN_ID = 56;
export const WALLET_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const WALLET_EMAIL_DOMAIN = 'wallet.bixlink.invalid';
export function walletAccountIdentity(address: string) {
  const username = normalizeWalletAddress(address);
  return { username, email: `${username}@${WALLET_EMAIL_DOMAIN}` };
}
export function isWalletOnlyAccount(user: { email?: string } | null | undefined) {
  return Boolean(user?.email?.toLowerCase().endsWith(`@${WALLET_EMAIL_DOMAIN}`));
}
export function hasVerifiedEmail(user: { email?: string; email_confirmed_at?: string } | null | undefined) {
  return Boolean(user?.email_confirmed_at && !isWalletOnlyAccount(user));
}
export function normalizeWalletAddress(value: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('Invalid wallet address.');
  return value.toLowerCase() as `0x${string}`;
}
export function walletProofMessage(origin: string, address: string, nonce: string, purpose: 'link' | 'login', expires: string) {
  return `${new URL(origin).host} requests a BIXLINK wallet signature.\n\nAddress: ${normalizeWalletAddress(address)}\nAction: ${purpose === 'link' ? 'Link wallet to your verified account' : 'Sign in to your linked account'}\nURI: ${origin}\nChain ID: ${BNB_CHAIN_ID}\nNonce: ${nonce}\nExpiration Time: ${expires}\n\nNo transaction, token approval, payment or withdrawal is authorized.`;
}