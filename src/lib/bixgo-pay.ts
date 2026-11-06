/** BIXGO payment rules shown in the app (the server RPC bixgo_driver_accept enforces the same numbers). */
export const DRIVER_ADJ_MIN = -20;
export const DRIVER_ADJ_MAX = 30;
export const BIXGO_BIX_USD = 0.5;
export const DRIVER_SHARE = 0.85;

export type PayKind = 'usdt' | 'bix' | 'cash';
export const payKind = (m: string | null | undefined): PayKind => {
  const s = (m ?? 'USDT').toLowerCase();
  return s.startsWith('bix') ? 'bix' : s === 'cash' ? 'cash' : 'usdt';
};

/** Driver-adjusted fare plus what moves for each payment kind. */
export function tripQuote(totalIdr: number, adjPct: number, usdtIdr: number, commissionPct: number, kind: PayKind) {
  const adj = Math.min(DRIVER_ADJ_MAX, Math.max(DRIVER_ADJ_MIN, adjPct));
  const fareIdr = Math.round(totalIdr * (1 + adj / 100));
  const usd = Math.round(fareIdr / usdtIdr * 100) / 100;
  const bix = kind === 'bix' ? Math.round(usd / BIXGO_BIX_USD * 100) / 100 : 0;
  const gasBix = kind === 'cash' ? Math.round(usd * commissionPct / 100 / BIXGO_BIX_USD * 100) / 100 : 0;
  return { fareIdr, usd, bix, gasBix, driverBix: Math.round(bix * DRIVER_SHARE * 100) / 100 };
}
