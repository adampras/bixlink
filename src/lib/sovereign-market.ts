export type MarketQuote = { p: number; c: number };
export type MarketSnapshot<T> = { savedAt: number; data: T };
export function readMarketSnapshot<T>(raw: string | null): MarketSnapshot<T> | null {
  try { const v = JSON.parse(raw ?? 'null'); return v && Number.isFinite(v.savedAt) && v.data ? v : null; } catch { return null; }
}
export function marketScope(symbol: string, category: string, watchlist: string[]) {
  return category === 'ecosystem' ? ['BIX', 'USDT', 'BNB'].includes(symbol) : category === 'watchlist' ? watchlist.includes(symbol) : true;
}