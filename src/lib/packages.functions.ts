import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';

export const getEditablePackages = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const access = await context.supabase.rpc('bix_can_manage_packages');
  if (access.error || !access.data) throw new Error('Package editor access required');
  const { data, error } = await context.supabase.from('packages').select('*').eq('retired', false).is('clone_of', null).order('price_usd');
  if (error) throw error;
  return (data ?? []).map(p => ({ ...p, duration_apys: p.duration_apys as Record<string, number> }));
});

export const saveDurationPackage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; price: number; apys: Record<string, number>; enabled: boolean }) => z.object({
    id: z.string().min(1).max(40), price: z.number().positive().max(10_000_000), enabled: z.boolean(),
    apys: z.object({ '30': z.number().min(0).max(360), '60': z.number().min(0).max(360), '90': z.number().min(0).max(360), '180': z.number().min(0).max(360), '360': z.number().min(0).max(360) }).strict(),
  }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('bix_edit_duration_package', { p_id: data.id, p_price: data.price, p_apys: data.apys as Json, p_enabled: data.enabled });
    if (error) throw new Error(error.message);
    const saved = await context.supabase.from('packages').select('id,price_usd,duration_apys,enabled').eq('id', data.id).single();
    if (saved.error || !saved.data) throw new Error('Could not confirm saved package');
    return saved.data;
  });