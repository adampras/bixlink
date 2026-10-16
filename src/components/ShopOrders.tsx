import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { money } from '@/lib/bixlink';
import { ORDER_STEPS } from '@/lib/shipping';

const LABEL: Record<string, string> = { pending: 'Awaiting confirmation', processing: 'Packing', shipped: 'In transit', completed: 'Delivered', cancelled: 'Cancelled' };
export const shopOrdersKey = (u?: string) => ['shop-orders', u];
export function ShopOrders({ userId }: { userId: string }) {
  const q = useQuery({ queryKey: shopOrdersKey(userId), queryFn: async () => { const { data, error } = await supabase.from('bix_shop_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return data; } });
  if (q.isPending) return <p className="py-6 text-muted-foreground">Loading orders…</p>;
  if (q.isError) return <p role="alert" className="py-6 text-destructive">Orders unavailable.</p>;
  if (!q.data.length) return <p className="py-8 text-muted-foreground">No orders yet.</p>;
  return <div className="mt-6 grid gap-3">{q.data.map(o => { const idx = ORDER_STEPS.indexOf(o.status as typeof ORDER_STEPS[number]); const items = (o.items as { name: string; qty: number }[]) ?? []; return <article key={o.id} className="order-card">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 font-semibold"><Package size={16} />#{o.id.slice(0, 8).toUpperCase()}</span><span className="text-xs text-chart-3">{LABEL[o.status] ?? o.status}</span></div>
    <p className="mt-1 text-xs text-muted-foreground">{items.map(i => `${i.qty}× ${i.name}`).join(', ')} · {o.courier}</p>
    {o.status !== 'cancelled' && <ol className="order-steps">{ORDER_STEPS.map((s, i) => <li key={s} className={i <= idx ? 'is-done' : ''}>{LABEL[s]}</li>)}</ol>}
    <div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">{o.tracking_number ? `Tracking: ${o.tracking_number}` : 'Tracking number pending'}</span><b className="numeric">{money(Number(o.subtotal_usd) + Number(o.shipping_usd))}</b></div>
  </article>; })}</div>;
}
