/** BIXGO membership tiers derived from a member's active USDT staking. Perks are display rules; no payment is captured. */
export type BixgoTier = { key: 'explorer' | 'pro' | 'executive' | 'sovereign'; name: string; minUsd: number; rideDiscountPct: number; perks: string[]; driverLicense: boolean };

export const BIXGO_TIERS: BixgoTier[] = [
  { key: 'explorer', name: 'Explorer', minUsd: 0, rideDiscountPct: 0, driverLicense: false, perks: ['Standard fares', 'Pay with USDT or BIX'] },
  { key: 'pro', name: 'Pro Navigator', minUsd: 100, rideDiscountPct: 5, driverLicense: true, perks: ['5% ride discount', 'Driver-Partner license eligible'] },
  { key: 'executive', name: 'Executive Club', minUsd: 500, rideDiscountPct: 8, driverLicense: true, perks: ['8% ride discount', 'BIX Black priority', 'Airport pickup priority'] },
  { key: 'sovereign', name: 'Sovereign Fleet Node', minUsd: 3000, rideDiscountPct: 10, driverLicense: true, perks: ['10% ride discount', 'Personal concierge', 'City franchise pool eligibility (owner-reviewed)'] },
];

export function tierFor(activeStakeUsd: number): BixgoTier {
  let t = BIXGO_TIERS[0]!;
  for (const x of BIXGO_TIERS) if (activeStakeUsd >= x.minUsd) t = x;
  return t;
}

export function nextTier(activeStakeUsd: number): BixgoTier | null {
  return BIXGO_TIERS.find(x => x.minUsd > activeStakeUsd) ?? null;
}

/** Licensed driver keeps this share of a completed fare; the rest is the platform/network commission. */
export const DRIVER_SHARE_PCT = 85;
export const driverEarning = (fare: number) => Math.round(fare * DRIVER_SHARE_PCT) / 100;
