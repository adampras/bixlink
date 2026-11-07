import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const cancelBixgoTrip = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.uuid(), reason: z.string().min(1).max(100), note: z.string().max(240) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('bixgo_cancel_trip', { p_id: data.id, p_reason: data.reason, p_note: data.note });
    if (error) throw new Error(error.message);
    return result;
  });
export const getBixgoDriver = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('bixgo_trip_driver', { p_id: data.id });
    if (error) throw new Error(error.message);
    return result;
  });
export const updateBixgoLocation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.uuid(), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bixgo_driver_location', { p_id: data.id, p_lat: data.lat, p_lng: data.lng });
    if (error) throw new Error(error.message);
    return { ok: true };
  });