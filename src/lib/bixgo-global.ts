/** BIXGO Global presentation layer: currency display, international hubs and travel catalog.
 *  Display-only conversions from the IDR fare engine; no payment, booking or FX execution happens. */
export const BIX_REF_USD = 0.84291; // owner-managed internal reference price per BIX

export const GLOBAL_CURRENCIES = [
  { code: 'USD', symbol: '$', perUsd: 1, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', perUsd: 0.92, flag: '🇪🇺' },
  { code: 'AED', symbol: 'AED ', perUsd: 3.6725, flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', perUsd: 1.34, flag: '🇸🇬' },
  { code: 'IDR', symbol: 'Rp ', perUsd: 0, flag: '🇮🇩' },
] as const;
export type GlobalCurrency = typeof GLOBAL_CURRENCIES[number]['code'];

/** Convert an IDR amount to USD using the owner's USDT/IDR reference. */
export const idrToUsd = (idr: number, usdtIdr: number) => idr / usdtIdr;

/** Format an IDR fare in the selected display currency. */
export function formatMoney(idr: number, cur: GlobalCurrency, usdtIdr: number) {
  if (cur === 'IDR') return 'Rp ' + Math.round(idr).toLocaleString('id-ID');
  const c = GLOBAL_CURRENCIES.find(x => x.code === cur)!;
  const v = idrToUsd(idr, usdtIdr) * c.perUsd;
  return c.symbol + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** USDT and BIX equivalents of an IDR amount (BIX at internal reference price). */
export function cryptoEquivalent(idr: number, usdtIdr: number) {
  const usdt = idrToUsd(idr, usdtIdr);
  return { usdt: +usdt.toFixed(2), bix: +(usdt / BIX_REF_USD).toFixed(2) };
}

export const GLOBAL_CITIES = [
  { id: 'dubai', city: 'Dubai', country: 'UAE', cur: 'AED', lat: 25.2048, lng: 55.2708 },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', cur: 'SGD', lat: 1.3521, lng: 103.8198 },
  { id: 'london', city: 'London', country: 'United Kingdom', cur: 'EUR', lat: 51.5072, lng: -0.1276 },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', cur: 'USD', lat: 35.6762, lng: 139.6503 },
  { id: 'bali', city: 'Bali', country: 'Indonesia', cur: 'USD', lat: -8.4095, lng: 115.1889 },
  { id: 'makassar', city: 'Makassar', country: 'Indonesia', cur: 'IDR', lat: -5.1477, lng: 119.4327 },
] as const satisfies readonly { id: string; city: string; country: string; cur: GlobalCurrency; lat: number; lng: number }[];

/** Travel hub catalog (prices in USD). Preview-only until a member payment rule exists. */
export const TRAVEL_CATALOG = {
  esim: [
    { id: 'e1', name: 'Global eSIM 5 GB · 15 days', note: '120+ countries', usd: 12 },
    { id: 'e2', name: 'UAE eSIM 10 GB · 30 days', note: 'du / Etisalat', usd: 18 },
    { id: 'e3', name: 'Asia eSIM 20 GB · 30 days', note: '14 countries', usd: 24 },
    { id: 'e4', name: 'Europe eSIM 15 GB · 30 days', note: '39 countries', usd: 21 },
  ],
  hotel: [
    { id: 'h1', name: 'Marina Skyline Suites', note: 'Dubai · per night', usd: 189 },
    { id: 'h2', name: 'Orchard Grand', note: 'Singapore · per night', usd: 214 },
    { id: 'h3', name: 'Kensington Royal', note: 'London · per night', usd: 236 },
    { id: 'h4', name: 'Uluwatu Cliff Villa', note: 'Bali · per night', usd: 142 },
  ],
  lounge: [
    { id: 'l1', name: 'DXB Premium Lounge', note: '3-hour access', usd: 55 },
    { id: 'l2', name: 'SIN Changi Lounge', note: '3-hour access', usd: 48 },
    { id: 'l3', name: 'LHR Executive Lounge', note: '3-hour access', usd: 62 },
  ],
} as const;
export type TravelKind = keyof typeof TRAVEL_CATALOG;

const CUR_KEY = 'bixgo_currency';
export const readCurrency = (): GlobalCurrency => {
  try { const v = localStorage.getItem(CUR_KEY); if (GLOBAL_CURRENCIES.some(c => c.code === v)) return v as GlobalCurrency; } catch { /* ignore */ }
  return 'USD';
};
export const saveCurrency = (c: GlobalCurrency) => { try { localStorage.setItem(CUR_KEY, c); } catch { /* ignore */ } };
