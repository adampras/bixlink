import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const resultSchema = z.object({ enabled: z.boolean(), released: z.number().optional() });

export const getActiveBonusAuto = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('bix_active_bonus_auto_admin' as never);
    if (error) throw new Error(error.message);
    return resultSchema.parse(data);
  });

export const setActiveBonusAuto = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => z.object({ enabled: z.boolean() }).strict().parse(input))
  .handler(async ({ context, data: input }) => {
    const { data, error } = await context.supabase.rpc('bix_active_bonus_auto_set' as never, { p_enabled: input.enabled } as never);
    if (error) throw new Error(error.message);
    return resultSchema.parse(data);
  });