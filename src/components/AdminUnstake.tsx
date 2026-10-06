import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';

type Tier = { days: number; pct: number };
const DEFAULT: Tier[] = [{ days: 30, pct: 20 }, { days: 60, pct: 15 }, { days: 90, pct: 10 }, { days: 180, pct: 8 }, { days: 360, pct: 5 }];

export function AdminUnstake({ initial, onMessage }: { initial?: Tier[] | undefined; onMessage: (m: string) => void }) {
  const [tiers, setTiers] = useState<Tier[]>(initial?.length ? initial : DEFAULT);
  const save = useServerFn(updateSetting); const qc = useQueryClient();
  const set = (i: number, k: keyof Tier, v: number) => setTiers(t => t.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return <section className="mt-8 max-w-2xl rounded-[20px] border border-chart-3 bg-card p-5">
    <h3 className="font-display text-lg font-black">Early unstake penalty</h3>
    <p className="mt-1 text-xs text-muted-foreground">Penalty applies when a member unstakes before the given day count. No penalty after the lock period ends.</p>
    <div className="mt-4 space-y-2">{tiers.map((t, i) => <div key={i} className="flex items-center gap-2 text-xs">Before<input type="number" min={1} className="form-input w-24" value={t.days} onChange={e => set(i, 'days', Number(e.target.value))}/>days →<input type="number" min={0} max={100} step="0.1" className="form-input w-24" value={t.pct} onChange={e => set(i, 'pct', Number(e.target.value))}/>%</div>)}</div>
    <Button className="mt-4 rounded-full" onClick={async () => { try { await save({ data: { key: 'unstake', value: { tiers: [...tiers].sort((a, b) => a.days - b.days) } } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Unstake penalties saved.'); } catch { onMessage('Could not save penalties.'); } }}>Save penalties</Button>
  </section>;
}
