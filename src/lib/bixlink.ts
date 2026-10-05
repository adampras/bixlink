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
export type Package = typeof fallbackPackages[number] & { daily_profit_enabled?: boolean };
export const money = (n: number) => '$' + Number(n).toLocaleString('en-US');
