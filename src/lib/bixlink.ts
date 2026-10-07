export const fallbackPackages = [
  { id: 'SEED', price_usd: 10, lock_days: 30, apy: 8 },
  { id: 'SPARK', price_usd: 30, lock_days: 60, apy: 10 },
  { id: 'EXPLORER', price_usd: 100, lock_days: 90, apy: 12 },
  { id: 'PIONEER', price_usd: 500, lock_days: 120, apy: 15 },
  { id: 'BUILDER', price_usd: 1000, lock_days: 180, apy: 18 },
  { id: 'GUARDIAN', price_usd: 3000, lock_days: 270, apy: 20 },
  { id: 'TITAN', price_usd: 5000, lock_days: 360, apy: 22 },
  { id: 'LEGEND', price_usd: 10000, lock_days: 540, apy: 25 },
];
export type Package = typeof fallbackPackages[number] & { daily_profit_enabled?: boolean; duration_apys?: Record<string, number>; enabled?: boolean; retired?: boolean };
const locale = () => typeof document === 'undefined' ? 'en-US' : ({ en: 'en-US', id: 'id-ID', ms: 'ms-MY', vi: 'vi-VN', th: 'th-TH', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' }[document.documentElement.lang] ?? 'en-US');
export const number = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale(), options).format(Number(value));
export const money = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2, ...options }).format(Number(value));
export const dateTime = (value: string | number | Date) => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export const date = (value: string | number | Date) => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(new Date(value));
