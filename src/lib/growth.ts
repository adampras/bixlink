import { z } from 'zod';

export const growthSchema = z.object({
  activity_enabled: z.boolean(), radar_enabled: z.boolean(),
  flash_title: z.string().trim().min(1).max(100), flash_enabled: z.boolean(),
  flash_ends_at: z.string().datetime({ offset: true }).nullable(),
  circuit_enabled: z.boolean(), threshold_usd: z.number().finite().positive().max(100000000),
  window_minutes: z.number().int().min(1).max(1440), frozen: z.boolean(),
});
export type GrowthControl = z.infer<typeof growthSchema>;
export const defaultGrowth: GrowthControl = { activity_enabled: true, radar_enabled: true, flash_title: 'BIXLINK community event', flash_enabled: false, flash_ends_at: null, circuit_enabled: true, threshold_usd: 5000, window_minutes: 120, frozen: false };
export type Activity = { id: string; member: string; kind: string; amount: number; at: string };
export type GrowthSnapshot = { eligible: boolean; control?: Pick<GrowthControl, 'activity_enabled'|'radar_enabled'|'flash_enabled'|'flash_title'|'flash_ends_at'|'frozen'>; events?: Activity[] };
export type RadarMember = { code: string; name: string; whatsapp?: string | null; joined_at: string; deposit_usd: number; last_activity: string; kind: string; target: number; turnover: number };
export function radarFlags(member: RadarMember, now: number) {
  const progress = member.target > 0 ? member.turnover / member.target : 0;
  return { potential: member.deposit_usd === 0, near: progress >= .6 && progress <= .9, dormant: now - Date.parse(member.last_activity) > 3 * 86400000, progress };
}
export function flashActive(control: Pick<GrowthControl, 'flash_enabled'|'flash_ends_at'>, now: number) {
  return control.flash_enabled && control.flash_ends_at !== null && Date.parse(control.flash_ends_at) > now;
}
export function queueTrips(total: number, threshold = 5000) { return total > threshold; }