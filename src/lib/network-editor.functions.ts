import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const code = (v: unknown) => String(v ?? '').trim().slice(0, 120);

export const networkLookup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => ({ code: code(d.code) }))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc('bix_network_lookup', { p_code: data.code });
    if (error) throw new Error(error.message);
    return r as { code: string; email: string | null; sponsor: string | null; direct: number; team: number };
  });

export const networkMove = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { member: string; sponsor: string | null }) => ({ member: code(d.member), sponsor: d.sponsor ? code(d.sponsor) : '' }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bix_network_move', { p_member: data.member, p_sponsor: data.sponsor });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const networkInsert = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { newCode: string; child: string }) => ({ newCode: code(d.newCode), child: code(d.child) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bix_network_insert', { p_new: data.newCode, p_child: data.child });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
