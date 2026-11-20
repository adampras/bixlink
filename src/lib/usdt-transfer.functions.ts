import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Real USDT member transfers: deposit USDT goes to any member, staking-profit USDT only inside
// an Admin 1-approved leader's team. All checks live in the bix_usdt_member_send RPC.
export const getUsdtTransfers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [quota, list] = await Promise.all([
      context.supabase.rpc('bix_usdt_transfer_quota', { p_user: context.userId }),
      context.supabase.from('bix_usdt_member_transfers').select('*')
        .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
        .order('created_at', { ascending: false }).limit(50),
    ]);
    if (quota.error || list.error) throw new Error('Unable to load USDT transfers. Please retry.');
    const q = (quota.data ?? {}) as { profit?: number; deposit?: number; real?: number; leader?: boolean };
    return { profit: Number(q.profit ?? 0), deposit: Number(q.deposit ?? 0), real: Number(q.real ?? 0), leader: q.leader === true, list: list.data ?? [] };
  });

export const checkUsdtRecipient = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => z.object({ code: z.string().trim().regex(/^BIX-\d{6}$/i) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: r, error } = await context.supabase.rpc('bix_usdt_recipient_check', { p_code: data.code.toUpperCase() });
    if (error) throw new Error(error.message);
    return r as { found: boolean; self?: boolean; name?: string; team?: boolean };
  });

export const sendUsdtTransfer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; amount: number; bucket: 'profit' | 'deposit'; note: string }) => z.object({
    code: z.string().trim().regex(/^BIX-\d{6}$/i), amount: z.number().finite().min(1).max(100000),
    bucket: z.enum(['profit', 'deposit']), note: z.string().max(120),
  }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc('bix_usdt_member_send', { p_code: data.code.toUpperCase(), p_amount: data.amount, p_bucket: data.bucket, p_note: data.note });
    if (error) throw new Error(error.message);
    return { id: String(id) };
  });
