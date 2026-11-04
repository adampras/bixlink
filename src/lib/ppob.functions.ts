import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { md5 } from 'js-md5';
import { readBixgo } from '@/lib/bixgo';

/** Digiflazz PPOB bridge. Credentials stay server-side. Member checkout is NOT wired to any balance yet; only the owner can send transactions. */
const API = 'https://api.digiflazz.com/v1';

function creds() {
  const user = process.env['DIGIFLAZZ_USERNAME'], key = process.env['DIGIFLAZZ_API_KEY'];
  return user && key ? { user, key } : null;
}
async function call(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null) as any;
  if (!r.ok || !j) { console.error('digiflazz', path, r.status, j); throw new Error('PPOB provider is not responding'); }
  return j.data;
}
async function bixgoCfg(supabase: any) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'bixgo').maybeSingle();
  return readBixgo(data?.value);
}
async function owner(supabase: any) {
  const { data, error } = await supabase.rpc('is_bix_admin');
  if (error || !data) throw new Error('Owner access required');
}

export const ppobStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await owner(context.supabase);
    const c = creds();
    if (!c) return { configured: false, balance: null as number | null, error: null as string | null };
    try { const d = await call('cek-saldo', { cmd: 'deposit', username: c.user, sign: md5(c.user + c.key + 'depo') }); return { configured: true, balance: Number(d?.deposit ?? 0), error: null }; }
    catch (e) { return { configured: true, balance: null, error: e instanceof Error ? e.message : 'Failed to check balance' }; }
  });

const CATS = ['Pulsa', 'Data', 'PLN', 'E-Money', 'Games'] as const;
export const ppobPriceList = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { category: string }) => z.object({ category: z.enum(CATS) }).parse(d))
  .handler(async ({ data, context }) => {
    const cfg = await bixgoCfg(context.supabase);
    const c = creds();
    if (!cfg.ppob?.enabled || !c) return { available: false, items: [] as { sku: string; name: string; brand: string; price: number; active: boolean }[] };
    const list = await call('price-list', { cmd: 'prepaid', username: c.user, sign: md5(c.user + c.key + 'pricelist') });
    const items = (Array.isArray(list) ? list : []).filter((p: any) => p.category === data.category)
      .map((p: any) => ({ sku: String(p.buyer_sku_code), name: String(p.product_name), brand: String(p.brand), price: Math.round(Number(p.price) + (cfg.ppob?.marginIdr ?? 0)), active: !!p.buyer_product_status && !!p.seller_product_status }))
      .sort((a: any, b: any) => a.price - b.price).slice(0, 80);
    return { available: true, items };
  });

export const ppobOwnerTransaction = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { sku: string; customerNo: string }) => z.object({ sku: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/), customerNo: z.string().trim().regex(/^[0-9]{6,20}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    await owner(context.supabase);
    const cfg = await bixgoCfg(context.supabase);
    const c = creds(); if (!c) throw new Error('PPOB API key is not set');
    const ref = 'BG' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    const d = await call('transaction', { username: c.user, buyer_sku_code: data.sku, customer_no: data.customerNo, ref_id: ref, sign: md5(c.user + c.key + ref), ...(cfg.ppob?.live ? {} : { testing: true }) });
    return { ref, live: !!cfg.ppob?.live, status: String(d?.status ?? 'Unknown'), message: String(d?.message ?? ''), sn: String(d?.sn ?? ''), price: Number(d?.price ?? 0) };
  });
