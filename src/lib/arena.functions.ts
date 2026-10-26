import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { QUEST_KEYS, arenaRewardsMatch, type QuestKey } from './arena';

export type ArenaStatus = {
  enabled: boolean; leaderboard: boolean; rewards: Record<QuestKey, number>; missions: Record<QuestKey, boolean>;
  quiz: { q: string; options: string[] } | null; links?: Partial<Record<string, string>>; day: string; week: string; streak: number; claimed: QuestKey[];
  questVbix: number; totalVbix: number; monthPoints: number; hasStake: boolean; mining: boolean; cap: number;
};
export type LeaderRow = { rank: number; member: string; points: number; is_me: boolean };
export type ArenaConfig = { enabled: boolean; leaderboard: boolean; cap?: number; rewards: Record<QuestKey, number>; missions: Record<QuestKey, boolean>; links?: Partial<Record<string, string>>; quiz: { q: string; options: string[]; answer: number }[]; prizes: number[] };
export type SeasonPrize = { id: string; season: string; rank: number; points: number; amount_bix: number; status: string; user_id: string };

export const getArenaStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [s, l] = await Promise.all([context.supabase.rpc('bix_quest_status'), context.supabase.rpc('bix_leaderboard', {})]);
  if (s.error) throw new Error(s.error.message);
  return { status: s.data as unknown as ArenaStatus, leaders: (l.data ?? []) as unknown as LeaderRow[] };
});

export const claimQuest = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { key: QuestKey; answer?: number }) => z.object({ key: z.enum(QUEST_KEYS), answer: z.number().int().min(0).max(9).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc('bix_quest_claim', { p_key: data.key, ...(data.answer !== undefined ? { p_answer: data.answer } : {}) });
    if (error) throw new Error(error.message);
    return r as unknown as { amount: number; capped: boolean };
  });

export const getArenaAdmin = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('bix_arena_admin_config');
  if (error) throw new Error(error.message);
  return data as unknown as { config: ArenaConfig; prizes: SeasonPrize[] };
});

const bools = z.object(Object.fromEntries(QUEST_KEYS.map(k => [k, z.boolean()])) as Record<QuestKey, z.ZodBoolean>).partial();
const nums = z.object(Object.fromEntries(QUEST_KEYS.map(k => [k, z.number().min(0).max(10_000)])) as Record<QuestKey, z.ZodNumber>).partial();
export const saveArena = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: ArenaConfig) => z.object({ enabled: z.boolean(), leaderboard: z.boolean(), cap: z.number().min(0).max(100_000_000).optional(), rewards: nums, missions: bools, links: z.object({ follow_x: z.string().trim().max(300).regex(/^(https:\/\/.*)?$/), join_telegram: z.string().trim().max(300).regex(/^(https:\/\/.*)?$/), sub_youtube: z.string().trim().max(300).regex(/^(https:\/\/.*)?$/) }).partial().optional(), quiz: z.array(z.object({ q: z.string().trim().min(3).max(200), options: z.array(z.string().trim().min(1).max(80)).min(2).max(4), answer: z.number().int().min(0).max(3) })).max(60), prizes: z.array(z.number().min(0).max(10_000)).max(10) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_arena_save', { p_config: data });
    if (error) throw new Error(error.message);
    const result = await context.supabase.rpc('bix_arena_admin_config');
    if (result.error) throw new Error(result.error.message);
    const saved = result.data as unknown as { config: ArenaConfig };
    if (!arenaRewardsMatch(data, saved.config)) throw new Error('Reward changes could not be verified. Please reload and try again.');
    return { ok: true, config: saved.config };
  });

export const closeSeason = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { season: string }) => z.object({ season: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: n, error } = await context.supabase.rpc('bix_season_close', { p_season: data.season });
    if (error) throw new Error(error.message);
    return { created: Number(n) };
  });

export const reviewPrize = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean }) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_review_season_prize', { p_id: data.id, p_approve: data.approve });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
