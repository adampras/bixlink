export function boosterMaximum(value?: number) {
  return Math.min(45, Math.max(8, Number.isFinite(value) ? Number(value) : 45));
}

export function nativeBixApy(amount: number, days: number, maximum = 45) {
  const base = days >= 540 ? 20 : days >= 360 ? 17 : days >= 180 ? 14 : days >= 90 ? 11 : 8;
  const volume = amount >= 10000 ? 5 : amount >= 5000 ? 4 : amount >= 1000 ? 3 : amount >= 500 ? 2 : amount >= 100 ? 1 : 0;
  const cap = boosterMaximum(maximum);
  return Math.round(Math.min(cap, 8 + (base + volume - 8) * (cap - 8) / 17) * 100) / 100;
}