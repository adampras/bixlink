export type SiteControl = { maintenance: boolean; staging: boolean; message?: string; publicSnapshot?: Record<string, unknown> };
export const defaultSiteControl: SiteControl = { maintenance: false, staging: false };

export const SNAPSHOT_KEYS = ['booster', 'booster_visual', 'referrals', 'swap', 'bix_market', 'bix_pay', 'landing_content', 'wallet', 'readiness', 'deposit_wallets', 'usdt_transfer', 'unstake', 'mining_visibility', 'mining_conversion', 'splash'] as const;
export const PUBLIC_SNAPSHOT_KEYS = ['readiness', 'splash', 'landing_content', 'booster_visual'] as const;

/** Non-admins see the frozen snapshot while staging is on; admins see live values. */
export function effectiveSettings(live: Record<string, any>, control: SiteControl, snapshot: Record<string, any> | undefined, isAdmin: boolean) {
  if (isAdmin || !control.staging) return live;
  return { ...live, ...(control.publicSnapshot ?? {}), ...(snapshot ?? {}) };
}

/** Maintenance blocks everyone except admins and the sign-in / admin pages. */
export function isBlockedByMaintenance(control: SiteControl, isAdmin: boolean, path: string) {
  if (!control.maintenance || isAdmin) return false;
  return !['/auth', '/admin', '/review', '/reset-password'].some(p => path === p || path.startsWith(p + '/'));
}
