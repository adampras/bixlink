/** Presale Phase 1: $0.25/BIX, $100–$1,000, 1%/day vesting over 100 days.
 *  Opens 14 Nov 2026 00:00 WIB (UTC+7) and runs two months. Server config is authoritative. */
export const PHASE1 = { price: 0.25, min: 100, max: 1000, vestingDays: 100, dailyPct: 1,
  startsAt: '2026-11-13T17:00:00.000Z', endsAt: '2027-01-13T17:00:00.000Z' } as const;
export const bixFor = (usd: number, price: number = PHASE1.price) => price > 0 ? Math.round(usd / price * 100) / 100 : 0;
export const clampUsd = (usd: number) => Math.min(PHASE1.max, Math.max(PHASE1.min, Math.round(usd)));
export function countdown(target: string, now: number) {
  const l = Math.max(0, Date.parse(target) - now);
  return [Math.floor(l / 864e5), Math.floor(l / 36e5) % 24, Math.floor(l / 6e4) % 60, Math.floor(l / 1e3) % 60];
}
export function phaseState(now: number): 'upcoming' | 'live' | 'ended' {
  return now < Date.parse(PHASE1.startsAt) ? 'upcoming' : now >= Date.parse(PHASE1.endsAt) ? 'ended' : 'live';
}
