import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canSendVirtualUsdt } from '@/lib/transaction-limits';

// Virtual USDT keeps the existing test ledger and RPC authorization; it is
// never substituted for the account's actual USDT asset balance.
export const getSovereignVirtual = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [balance, list, owner] = await Promise.all([
      context.supabase.rpc('bix_vusdt_balance', { p_user: context.userId }),
      context.supabase.from('vusdt_transfers').select('*')
        .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
        .order('created_at', { ascending: false }).limit(50),
      context.supabase.rpc('bix_is_owner1'),
    ]);
    if (balance.error || list.error || owner.error) throw new Error('Unable to load virtual transfers. Please retry.');
    return { balance: Number(balance.data ?? 0), list: list.data ?? [], canSend: canSendVirtualUsdt(owner.data === true) };
  });

export const sendSovereignVirtual = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string; amount: number; note: string }) => z.object({
    code: z.string().trim().regex(/^BIX-\d{6}$/i),
    amount: z.number().finite().positive(), note: z.string().max(120),
  }).parse(data))
  .handler(async ({ context, data }) => {
    const owner = await context.supabase.rpc('bix_is_owner1');
    if (owner.error || !canSendVirtualUsdt(owner.data === true)) throw new Error('Only Owner 1 can transfer virtual USDT');
    const { error } = await context.supabase.rpc('bix_vusdt_send', {
      p_code: data.code.toUpperCase(), p_amount: data.amount, p_note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });