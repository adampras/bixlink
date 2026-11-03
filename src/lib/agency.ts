export type AgencyTier = { enabled: boolean; minUsd: number; maxUsd: number; overridePct: number; perCountry?: number; perCity?: number };
export type AgencyConfig = { enabled: boolean; national: AgencyTier; city: AgencyTier };
export type AgencyApplication = { id: string; user_id: string; tier: 'national' | 'city'; country: string; city: string | null; contact: string; commitment_usd: number; status: string; license_no: string | null; note: string | null; created_at: string };

export const DEFAULT_AGENCY: AgencyConfig = {
  enabled: false,
  national: { enabled: true, minUsd: 25000, maxUsd: 100000, overridePct: 3, perCountry: 1 },
  city: { enabled: true, minUsd: 5000, maxUsd: 10000, overridePct: 1.5, perCity: 3 },
};

export function normalizeAgency(v: unknown): AgencyConfig {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<AgencyConfig>;
  return { enabled: Boolean(o.enabled), national: { ...DEFAULT_AGENCY.national, ...(o.national ?? {}) }, city: { ...DEFAULT_AGENCY.city, ...(o.city ?? {}) } };
}

/** Same range rule the server enforces. */
export function agencyAmountValid(cfg: AgencyConfig, tier: 'national' | 'city', usd: number) {
  const t = cfg[tier];
  return Number.isFinite(usd) && usd >= t.minUsd && usd <= t.maxUsd;
}
