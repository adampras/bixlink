export type WalletProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, callback: (value: unknown) => void) => void; removeListener?: (event: string, callback: (value: unknown) => void) => void };
export function injectedWallet() { return (window as unknown as { ethereum?: WalletProvider }).ethereum ?? null; }
export async function bnbWalletAddress(provider: WalletProvider) {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') throw new Error('No wallet account selected.');
  const chain = await provider.request({ method: 'eth_chainId' });
  if (chain !== '0x38') await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
  return accounts[0];
}
export async function signWalletProof(provider: WalletProvider, message: string, address: string) {
  const hex = `0x${Array.from(new TextEncoder().encode(message)).map(v => v.toString(16).padStart(2, '0')).join('')}`;
  const signature = await provider.request({ method: 'personal_sign', params: [hex, address] });
  if (typeof signature !== 'string') throw new Error('Wallet did not return a signature.');
  const accounts = await provider.request({ method: 'eth_accounts' });
  const chain = await provider.request({ method: 'eth_chainId' });
  if (!Array.isArray(accounts) || String(accounts[0]).toLowerCase() !== address.toLowerCase() || chain !== '0x38') throw new Error('Wallet account or network changed. Please try again.');
  return signature;
}