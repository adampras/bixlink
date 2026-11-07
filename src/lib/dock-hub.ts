/** Shared BIX HUB catalog grouped by function; Owner 1 toggles each id via readiness.dockHub. */
export const HUB_GROUPS = ['Trading & Finance', 'Wallet & Payments', 'Ecosystem', 'Account'] as const;
export const HUB_ITEMS = [
  { id: 'trade', to: '/trade', label: 'Trade', note: 'Buy / sell BIX', group: 'Trading & Finance' },
  { id: 'bixtrade', to: '/bixtrade', label: 'BIXTRADE', note: 'Arbitrage bot', group: 'Trading & Finance' },
  { id: 'presale', to: '/presale', label: 'Presale', note: 'Genesis', group: 'Trading & Finance' },
  { id: 'boost', to: '/boost', label: 'Boost APY', note: 'Engine', group: 'Trading & Finance' },
  { id: 'buyback', to: '/buyback', label: 'Dev Buyback', note: 'Sell BIX', group: 'Trading & Finance' },
  { id: 'exchange', to: '/quantum-exchange', label: 'Exchange', note: 'Coming soon', group: 'Trading & Finance' },
  { id: 'onchain', to: '/sovereign-wallet', label: 'On-chain Wallet', note: 'Open apps wallet', group: 'Wallet & Payments' },
  { id: 'pay', to: '/pay', label: 'BIX PAY', note: 'Transfer', group: 'Wallet & Payments' },
  { id: 'vault', to: '/consortium-vault', label: 'Consortium', note: '5 nations', group: 'Wallet & Payments' },
  { id: 'bixtok', to: '/bixtok', label: 'BIXTOK', note: 'Video & LIVE', group: 'Ecosystem' },
  { id: 'call', to: '/call', label: 'BIX CALL', note: 'Voice & Video', group: 'Ecosystem' },
  { id: 'bixgo', to: '/bixgo', label: 'BIXGO', note: 'Ride · Food · Send', group: 'Ecosystem' },
  { id: 'gold', to: '/gold', label: 'BIX GOLD', note: 'Gold · Gram savings', group: 'Ecosystem' },
  { id: 'nft', to: '/nft-marketplace', label: 'NFT & Shop', note: 'Marketplace', group: 'Ecosystem' },
  { id: 'mining', to: '/mining', label: 'Mining', note: 'Rig pre-order', group: 'Ecosystem' },
  { id: 'arena', to: '/arena', label: 'Fox Arena', note: 'Missions', group: 'Ecosystem' },
  { id: 'home', to: '/', label: 'Home', note: 'Overview', group: 'Account' },
  { id: 'profile', to: '/profile', label: 'Profile', note: 'Account', group: 'Account' },
  { id: 'settings', to: '/settings', label: 'Settings', note: 'Preferences', group: 'Account' },
] as const;
export type HubId = typeof HUB_ITEMS[number]['id'];
export const hubVisible = (cfg: Record<string, boolean> | undefined, id: string) => cfg?.[id] !== false;
/** Apply the owner-chosen order (unknown/new ids keep catalog order at the end). */
export function hubOrdered<T extends { id: string }>(items: readonly T[], order: string[] | undefined): T[] {
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  return items.map((it, i) => ({ it, r: rank.get(it.id) ?? 1000 + i })).sort((a, b) => a.r - b.r).map(x => x.it);
}
