import { useState } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DRIVER_ADJ_MAX, DRIVER_ADJ_MIN } from '@/lib/bixgo-pay';

/** Driver sets their own fare adjustment (−20%…+30%) and which payment types they accept. Saved server-side via RPC. */
export function BixgoDriverRates({ adj, cash, bix, onSaved }: { adj: number; cash: boolean; bix: boolean; onSaved: () => void }) {
  const [v, setV] = useState({ adj, cash, bix });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('bixgo_driver_set_rates', { p_adj: v.adj, p_cash: v.cash, p_bix: v.bix });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success('Your fare settings are saved'); onSaved(); }
  };
  const Chip = ({ k, label }: { k: 'cash' | 'bix'; label: string }) =>
    <button onClick={() => setV({ ...v, [k]: !v[k] })} className={`flex-1 rounded-xl border py-2 font-bold ${v[k] ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{v[k] ? '✓ ' : ''}{label}</button>;
  return <div className="space-y-2 rounded-2xl border border-primary/30 p-3">
    <h4 className="flex items-center gap-1 text-xs font-black"><SlidersHorizontal className="h-3.5 w-3.5 text-primary"/>My fare</h4>
    <div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Adjust from city fare</span><b className={`tabular-nums ${v.adj > 0 ? 'text-primary' : ''}`}>{v.adj > 0 ? '+' : ''}{v.adj}%</b></div>
    <input type="range" min={DRIVER_ADJ_MIN} max={DRIVER_ADJ_MAX} step={1} value={v.adj} onChange={e => setV({ ...v, adj: Number(e.target.value) })} className="w-full accent-[var(--primary)]" aria-label="Fare adjustment"/>
    <div className="flex justify-between text-[10px] text-muted-foreground"><span>{DRIVER_ADJ_MIN}% saver</span><span>+{DRIVER_ADJ_MAX}% premium</span></div>
    <div className="flex gap-2 text-[11px]"><Chip k="bix" label="BIX orders"/><Chip k="cash" label="Cash orders"/></div>
    <p className="text-[10px] text-muted-foreground">BIX: passenger gets a discount, fare is held in BIX and 85% is paid to you on completion. Cash: you collect the cash yourself, but the company fee is taken first from your BIX balance when you accept.</p>
    <button disabled={busy} onClick={() => void save()} className="w-full rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin"/> : 'Save my fare'}</button>
  </div>;
}
