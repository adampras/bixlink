/** BIXGO Global presentation layer: currency display, international hubs and travel catalog.
 *  Display-only conversions from the IDR fare engine; no payment, booking or FX execution happens. */
import { REGION_CITIES } from './bixgo-regions';
export const BIX_REF_USD = 0.5; // BIXGO internal reference: 1 BIX = $0.50 (2 BIX per USDT)

export const GLOBAL_CURRENCIES = [
  { code: 'USD', symbol: '$', perUsd: 1, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', perUsd: 0.92, flag: '🇪🇺' },
  { code: 'AED', symbol: 'AED ', perUsd: 3.6725, flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', perUsd: 1.34, flag: '🇸🇬' },
  { code: 'IDR', symbol: 'Rp ', perUsd: 0, flag: '🇮🇩' },
  { code: 'MYR', symbol: 'RM ', perUsd: 4.45, flag: '🇲🇾' },
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

/** Launch scope: all Indonesian provinces and Malaysian states. */
export const GLOBAL_CITIES = REGION_CITIES;

/** Travel hub catalog (USD, market-referenced retail prices). Preview-only until a member payment rule exists. */
export const TRAVEL_CATALOG = {
  esim: [
    { id: 'e1', name: 'ASEAN eSIM 3 GB · 7 days', note: 'ID · MY · SG · TH', usd: 7.5 },
    { id: 'e2', name: 'ASEAN eSIM 10 GB · 30 days', note: 'ID · MY · SG · TH', usd: 16 },
    { id: 'e3', name: 'Malaysia eSIM 1 GB/day · 7 days', note: 'Maxis / CelcomDigi route', usd: 9 },
    { id: 'e4', name: 'Indonesia eSIM 15 GB · 30 days', note: 'Telkomsel / Indosat route', usd: 12 },
  ],
  hotel: [
    { id: 'h1', name: 'Executive Business Room', note: 'Jakarta · Surabaya · Makassar · per night', usd: 45 },
    { id: 'h2', name: 'KL Sentral Executive', note: 'Kuala Lumpur · per night', usd: 75 },
    { id: 'h3', name: 'Seminyak Luxury Villa', note: 'Bali · per night', usd: 120 },
    { id: 'h4', name: 'Langkawi Island Resort', note: 'Kedah · per night', usd: 220 },
  ],
  lounge: [
    { id: 'l1', name: 'CGK Premium Lounge', note: 'Soekarno-Hatta · 3 hours', usd: 22 },
    { id: 'l2', name: 'DPS / UPG Lounge', note: 'Ngurah Rai · Hasanuddin · 3 hours', usd: 22 },
    { id: 'l3', name: 'KLIA Plaza Premium', note: 'KLIA 1 & 2 · 3 hours', usd: 32 },
  ],
} as const;
export type TravelKind = keyof typeof TRAVEL_CATALOG;

const CUR_KEY = 'bixgo_currency';
export const readCurrency = (): GlobalCurrency => {
  try { const v = localStorage.getItem(CUR_KEY); if (GLOBAL_CURRENCIES.some(c => c.code === v)) return v as GlobalCurrency; } catch { /* ignore */ }
  return 'IDR';
};
export const saveCurrency = (c: GlobalCurrency) => { try { localStorage.setItem(CUR_KEY, c); } catch { /* ignore */ } };
