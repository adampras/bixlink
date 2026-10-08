import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { CircleDollarSign, Save, ShieldCheck } from 'lucide-react';
import { updateSetting, updateInternalMovement } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/bixlink';

import { useQueryClient } from '@tanstack/react-query';
import { movementInputSchema, resolveMovement, type MovementInput } from '@/lib/internal-market';

const SUPPLY = 21_000_000;
function movementForm(value: unknown, price: number): MovementInput {
  const c = resolveMovement(value);
  return c ? { enabled:c.enabled, lower:c.lower, upper:c.upper, intervalSeconds:c.intervalSeconds, intensity:c.intensity, bias:c.bias } : { enabled:false, lower:price*.9, upper:price*1.1, intervalSeconds:5, intensity:50, bias:'balanced' };
}

export function AdminBixMarket({ initialPrice, initialMovement, onMessage, onSaved }: { initialPrice: number; initialMovement?: unknown; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const saveSetting = useServerFn(updateSetting);
  const saveMovement = useServerFn(updateInternalMovement);
  const qc = useQueryClient();
  const current = resolveMovement(initialMovement);
  const [movement, setMovement] = useState<MovementInput>(() => movementForm(initialMovement, initialPrice));
  useEffect(() => { setMovement(movementForm(initialMovement, initialPrice)); }, [initialMovement, initialPrice]);
  async function refresh() { await onSaved(); await qc.invalidateQueries({queryKey:['bix-home-market']}); await qc.invalidateQueries({queryKey:['bix-public-config']}); }
  const [price, setPrice] = useState(String(initialPrice));
  const [saving, setSaving] = useState(false);
  const numericPrice = Number(price);
  const valid = Number.isFinite(numericPrice) && numericPrice > 0 && numericPrice <= 1_000_000;

  return <section className="mt-8 max-w-2xl">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-chart-3/10 text-chart-3"><CircleDollarSign size={20}/></span><div><span className="eyebrow">INTERNAL MARKET</span><h2 className="mt-2 font-display text-xl font-black">BIX reference price</h2></div></div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">Ledger reference for swaps and rewards. Simulated movement is display-only and does not change this reference.</p>
    <label className="mt-5 block text-xs font-bold uppercase text-muted-foreground">Price per BIX in USDT<input className="form-input numeric mt-2" type="number" min="0.000001" max="1000000" step="0.000001" value={price} onChange={event => setPrice(event.target.value)}/></label>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Fixed supply</span><b className="numeric mt-1 block">21,000,000 BIX</b></div><div className="rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">Implied valuation</span><b className="numeric mt-1 block text-chart-3">{valid ? money(numericPrice * SUPPLY) : '—'}</b></div></div>
    <div className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0 text-chart-2" size={15}/><span>Existing requests keep their recorded price. Only future requests use the new reference.</span></div>
    <Button className="mt-5 rounded-full" disabled={!valid || saving} onClick={async () => { setSaving(true); try { await saveSetting({ data: { key: 'bix_market', value: { priceUsd: numericPrice } } }); await refresh(); onMessage('BIX internal reference price updated.'); } catch { onMessage('Could not update the BIX reference price.'); } finally { setSaving(false); } }}><Save/>{saving ? 'Saving…' : 'Save reference price'}</Button>
    <div className="mt-8 border-t border-border pt-6" data-no-translate>
      <h3 className="font-display text-lg font-bold">Simulated price movement</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">Automatic up/down display within your range. No exchange trades, liquidity, payouts or balance changes. Applying changed parameters restarts the simulation.</p>
      <div className="mt-4 grid grid-cols-2 gap-4">{(['lower','upper'] as const).map(key => <label key={key} className="text-xs text-muted-foreground">{key === 'lower' ? 'Lower price' : 'Upper price'}<input aria-label={key === 'lower' ? 'Lower price' : 'Upper price'} className="form-input numeric mt-2" type="number" min="0.000001" step="0.000001" value={movement[key]} onChange={e => setMovement(m => ({...m,[key]:Number(e.target.value)}))}/></label>)}<label className="text-xs text-muted-foreground">Step interval (seconds)<input aria-label="Step interval (seconds)" className="form-input mt-2" type="number" min="2" max="300" value={movement.intervalSeconds} onChange={e => setMovement(m => ({...m,intervalSeconds:Number(e.target.value)}))}/></label><label className="text-xs text-muted-foreground">Direction<select aria-label="Movement direction" className="form-input mt-2" value={movement.bias} onChange={e => setMovement(m => ({...m,bias:e.target.value as MovementInput['bias']}))}><option value="balanced">Balanced up/down</option><option value="up">Upward bias</option><option value="down">Downward bias</option></select></label></div>
      <label className="mt-4 block text-xs text-muted-foreground">Movement intensity · {movement.intensity}%<input aria-label="Movement intensity" className="mt-3 w-full accent-primary" type="range" min="1" max="100" value={movement.intensity} onChange={e => setMovement(m => ({...m,intensity:Number(e.target.value)}))}/></label>
      <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" className="accent-primary" checked={movement.enabled} onChange={e => setMovement(m => ({...m,enabled:e.target.checked}))}/>Run simulated movement</label>
      <p className="mt-3 text-xs text-chart-2">Saved status: {current?.enabled ? 'RUNNING' : current ? 'PAUSED' : 'OFF'}</p>
      <Button className="mt-4" disabled={saving || !movementInputSchema.safeParse(movement).success} onClick={async () => {setSaving(true);try {await saveMovement({data:movement});await refresh();onMessage('Internal simulation settings saved. Ledger reference unchanged.');} catch(e) {onMessage(e instanceof Error ? e.message : 'Could not save simulation.');} finally {setSaving(false);}}}><Save/>{saving ? 'Saving…' : 'Apply movement settings'}</Button>
    </div>
  </section>;
}