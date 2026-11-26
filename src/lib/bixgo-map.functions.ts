import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mapConfigSchema, mapPointSchema, mapSettingsSchema, mapSummarySchema } from './bixgo-map';

export const getBixgoMap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ admin: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.admin) { const check = await context.supabase.rpc('bix_is_owner1'); if (check.error || !check.data) throw new Error('Owner 1 only'); }
    let points = context.supabase.from('bixgo_map_points').select('*').order('created_at', { ascending: false }).limit(200);
    if (!data.admin) points = points.eq('user_id', context.userId);
    const [rows, settings, summary, claims] = await Promise.all([points, context.supabase.rpc('bixgo_map_settings'), context.supabase.rpc('bixgo_map_summary'), context.supabase.from('bixgo_map_claims').select('id,amount_bix,created_at').eq('user_id',context.userId).order('created_at',{ascending:false}).limit(30)]);
    if (rows.error || settings.error || summary.error || claims.error) throw new Error('Mapping data unavailable. Retry.');
    return { points: rows.data ?? [], config: mapConfigSchema.parse(settings.data), summary: mapSummarySchema.parse(summary.data), claims: claims.data ?? [] };
  });
export const submitBixgoMap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => mapPointSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc('bixgo_map_submit', { p_name: data.name, p_category: data.category, p_lat: data.lat, p_lng: data.lng, p_detail: data.detail, p_note: data.note, p_photo: data.photo ?? '', p_public: data.public });
    if (error) throw new Error(error.message); return { id };
  });
export const saveBixgoMap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => mapSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('bixgo_map_save', { p_enabled: data.enabled, p_reward: data.reward, p_limit: data.limit, p_budget: data.budget });
    if (error) throw new Error(error.message); return mapConfigSchema.parse(result);
  });
export const reviewBixgoMap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.uuid(), action: z.enum(['approved','rejected','archived']), note: z.string().trim().max(240) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bixgo_map_review', { p_id: data.id, p_action: data.action, p_note: data.note });
    if (error) throw new Error(error.message); return { ok: true };
  });
export const claimBixgoMap = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => { const { data, error } = await context.supabase.rpc('bixgo_map_claim'); if (error) throw new Error(error.message); return z.object({ claimed: z.coerce.number() }).parse(data); });