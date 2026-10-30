/** Shared BIX HUB catalog: the mobile HOME slot opens these shortcuts; Owner 1 toggles each id via readiness.dockHub. */
export const HUB_ITEMS = [
  { id: 'home', to: '/', label: 'Home', note: 'Overview' },
  { id: 'trade', to: '/trade', label: 'Trade', note: 'Buy / sell BIX' },
  { id: 'boost', to: '/boost', label: 'Boost APY', note: 'Engine' },
  { id: 'mining', to: '/mining', label: 'Mining', note: 'Rig pre-order' },
  { id: 'exchange', to: '/quantum-exchange', label: 'Exchange', note: 'Coming soon' },
  { id: 'presale', to: '/presale', label: 'Presale', note: 'Genesis' },
  { id: 'arena', to: '/arena', label: 'Fox Arena', note: 'Missions' },
  { id: 'bixtok', to: '/bixtok', label: 'BIXTOK', note: 'Video & LIVE' },
  { id: 'buyback', to: '/buyback', label: 'Dev Buyback', note: 'Sell BIX' },
  { id: 'vault', to: '/consortium-vault', label: 'Consortium', note: '5 nations' },
  { id: 'nft', to: '/nft-marketplace', label: 'NFT & Shop', note: 'Marketplace' },
  { id: 'pay', to: '/pay', label: 'BIX PAY', note: 'Transfer' },
  { id: 'profile', to: '/profile', label: 'Profile', note: 'Account' },
] as const;
export type HubId = typeof HUB_ITEMS[number]['id'];
export const hubVisible = (cfg: Record<string, boolean> | undefined, id: string) => cfg?.[id] !== false;
