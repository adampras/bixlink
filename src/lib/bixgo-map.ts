import { z } from 'zod';

export const MAP_CATEGORIES = ['entrance', 'motor_lane', 'home', 'store', 'public'] as const;
export const mapPointSchema = z.object({
  name: z.string().trim().min(3).max(100), category: z.enum(MAP_CATEGORIES),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  detail: z.string().trim().max(200), note: z.string().trim().max(120),
  photo: z.string().max(200).nullable(), public: z.boolean(),
});
export const mapSettingsSchema = z.object({ enabled: z.boolean(), reward: z.number().min(0).max(1000), limit: z.number().int().min(1).max(20), budget: z.number().min(0).max(1000000) });
export const mapConfigSchema = z.object({ enabled: z.boolean(), reward_bix: z.coerce.number(), daily_limit: z.number(), budget_bix: z.coerce.number() });
export const mapSummarySchema = z.object({ available: z.coerce.number(), pending: z.coerce.number(), transferred: z.coerce.number(), approved: z.number(), submitted: z.number(), map_used: z.coerce.number(), pool_used: z.coerce.number() });
export function contributorRank(count: number) { return count > 20 ? 'Master Mapper' : count > 5 ? 'Local Explorer' : count > 0 ? 'New Contributor' : 'Community Contributor'; }
export const categoryLabel: Record<typeof MAP_CATEGORIES[number], string> = { entrance: 'Entrance', motor_lane: 'Motorbike lane', home: 'Home', store: 'Store', public: 'Public facility' };