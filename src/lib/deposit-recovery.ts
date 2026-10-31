// Client-safe rules for manual on-chain deposit recovery (Owner 1 / Owner 2).

/** Minimum on-chain amount (USD stablecoin) that may be credited manually. */
export const MANUAL_MIN_USD = 1;

/** Credit exactly what arrived on-chain, rounded down to cents (never rounds up). */
export const manualCreditAmount = (onChain: number) => Math.floor(Number(onChain) * 100) / 100;

/** A member request "looks like" a transfer when it is within $3 or 2% (exchange fees cut the unique digits). */
export const isNearAmount = (requested: number, onChain: number) =>
  Math.abs(Number(requested) - Number(onChain)) <= Math.max(3, Number(onChain) * 0.02);

/** TRON hashes are stored without 0x; EVM hashes keep it. */
export const normalizeHash = (network: string, hash: string) => {
  const h = hash.trim();
  return network === 'TRC20' ? h.replace(/^0x/i, '') : h;
};
