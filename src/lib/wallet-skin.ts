export const WALLET_SKINS = [
  { id: 'auric', label: 'Auric Gold' },
  { id: 'violet', label: 'Royal Violet' },
  { id: 'emerald', label: 'Neon Emerald' },
  { id: 'sapphire', label: 'Sapphire Blue' },
  { id: 'ruby', label: 'Ruby Flame' },
] as const;
export type WalletSkin = typeof WALLET_SKINS[number]['id'];
const IDS = WALLET_SKINS.map(s => s.id) as readonly string[];

/** Active skins rotate once per 24h (UTC day). One active skin = fixed color. None = default. */
export function pickWalletSkin(active: readonly string[] | undefined, now = Date.now()): WalletSkin | undefined {
  const list = (active ?? []).filter(id => IDS.includes(id)) as WalletSkin[];
  if (list.length === 0) return undefined;
  const day = Math.floor(now / 86_400_000);
  return list[day % list.length];
}
