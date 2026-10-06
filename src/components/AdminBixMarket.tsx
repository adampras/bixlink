import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CircleDollarSign, Save, ShieldCheck } from 'lucide-react';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/bixlink';

const SUPPLY = 21_000_000;

export function AdminBixMarket({ initialPrice, onMessage, onSaved }: { initialPrice: number; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const saveSetting = useServerFn(updateSetting);
  const [price, setPrice] = useState(String(initialPrice));
  const [saving, setSaving] = useState(false);
  const numericPrice = Number(price);
  const valid = Number.isFinite(numericPrice) && numericPrice > 0 && numericPrice <= 1_000_000;

  return <section className="mt-8 max-w-2xl rounded-[20px] border border-chart-3 bg-card p-6">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-chart-3/10 text-chart-3"><CircleDollarSign size={20}/></span><div><span className="eyebrow">INTERNAL MARKET</span><h2 className="mt-2 font-display text-xl font-black">BIX reference price</h2></div></div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">This value controls the HOME market display and new admin-reviewed BIX/USDT swap requests. It is not a global exchange price.</p>
    <label className="mt-5 block text-xs font-bold uppercase text-muted-foreground">Price per BIX in USDT<input className="form-input numeric mt-2" type="number" min="0.000001" max="1000000" step="0.000001" value={price} onChange={event => setPrice(event.target.value)}/></label>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Fixed supply</span><b className="numeric mt-1 block">21,000,000 BIX</b></div><div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Implied valuation</span><b className="numeric mt-1 block text-chart-3">{valid ? money(numericPrice * SUPPLY) : '—'}</b></div></div>
    <div className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0 text-chart-2" size={15}/><span>Existing requests keep their recorded price. Only future requests use the new reference.</span></div>
    <Button className="mt-5 rounded-full" disabled={!valid || saving} onClick={async () => { setSaving(true); try { await saveSetting({ data: { key: 'bix_market', value: { priceUsd: numericPrice } } }); await onSaved(); onMessage('BIX internal reference price updated.'); } catch { onMessage('Could not update the BIX reference price.'); } finally { setSaving(false); } }}><Save/>{saving ? 'Saving…' : 'Save reference price'}</Button>
  </section>;
}