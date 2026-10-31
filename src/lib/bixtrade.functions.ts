import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { BIXTRADE_PAIRS, BIXTRADE_CYCLE_MIN, botCapital, planExecutions, readBixtrade } from '@/lib/bixtrade';

/** Records server-side bot executions for the caller's settled capital since the last run. Never touches balances. */
export const runBixtradeCycle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { funding: 'real' | 'virtual' }) => z.object({ funding: z.enum(['real', 'virtual']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: set } = await supabase.from('app_settings').select('value').eq('key', 'bixtrade').maybeSingle();
    const cfg = readBixtrade(set?.value);
    if (!cfg.enabled) return { added: 0, reason: 'closed' };
    const { data: reqs } = await supabase.from('bixtrade_requests').select('kind,amount_usd,settled_at,strategy,funding').eq('user_id', userId).eq('funding', data.funding);
    const rows = reqs ?? [];
    const capital = botCapital(rows);
    if (capital <= 0) return { added: 0, reason: 'no_capital' };
    const { data: last } = await supabase.from('bixtrade_executions').select('executed_at').eq('user_id', userId).eq('funding', data.funding).order('executed_at', { ascending: false }).limit(1).maybeSingle();
    const firstDeposit = rows.filter(r => r.settled_at && r.kind === 'deposit').map(r => r.settled_at as string).sort()[0];
    const now = new Date();
    const fromMs = Math.max(new Date(last?.executed_at ?? firstDeposit ?? now.toISOString()).getTime(), now.getTime() - 86400000);
    if (now.getTime() - fromMs < BIXTRADE_CYCLE_MIN * 60000) return { added: 0, reason: 'wait' };
    let prices: Record<string, number> = {};
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(BIXTRADE_PAIRS))}`);
      const list = (await r.json()) as { symbol: string; price: string }[];
      if (Array.isArray(list)) prices = Object.fromEntries(list.map(x => [x.symbol, Number(x.price)]));
    } catch (e) { console.error('bixtrade price feed', e); }
    if (!Object.keys(prices).length) return { added: 0, reason: 'feed' };
    const strategy = rows.filter(r => r.kind === 'deposit' && r.settled_at).at(-1)?.strategy ?? 'core';
    const plan = planExecutions(cfg, capital, prices, new Date(fromMs), now);
    if (!plan.length) return { added: 0, reason: 'wait' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
    const { error } = await supabaseAdmin.from('bixtrade_executions').insert(plan.map(p => ({ ...p, user_id: userId, funding: data.funding, strategy, ref: `ARB-${p.pair.split('/')[0]}-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}` })));
    if (error) { console.error(error); throw new Error('Could not record executions'); }
    return { added: plan.length, reason: 'ok' };
  });
