import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Save, Check, X, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { getBixBonusReviews, reviewBixBonus } from '@/lib/network.functions';
import { number } from '@/lib/bixlink';

export function AdminReferrals({ initial, onSaved, onMessage }: { initial: Record<string, unknown> | undefined; onSaved: () => Promise<void>; onMessage: (message: string) => void }) {
 const save = useServerFn(updateSetting); const fetch = useServerFn(getBixBonusReviews); const review = useServerFn(reviewBixBonus); const qc = useQueryClient();
 const [busy, setBusy] = useState(false);
 const { data: bonuses = [] } = useQuery({ queryKey: ['admin-bix-bonuses'], queryFn: () => fetch() });
 const fields: [string,string,number][] = [['Direct %','direct',10], ...[12,6,3,2,1].map((n,i): [string,string,number] => [`Level ${i+1} %`,`level${i+1}`,n]), ['RewardPlus %','rewardPlus',5],['Minimum direct members','minimumDirect',3],['USDT split %','splitUsdt',70],['BIX split %','splitBix',30]];
 return <section className="mt-8 max-w-4xl">
 <form className="space-y-5" onSubmit={async e => {
 e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
 const value = { ...initial, direct: Number(f.get('direct')), levels: [1,2,3,4,5].map(i => Number(f.get(`level${i}`))), rewardPlus: Number(f.get('rewardPlus')), minimumDirect: Number(f.get('minimumDirect')), splitUsdt: Number(f.get('splitUsdt')), splitBix: Number(f.get('splitBix')), bixDirectPct: Number(f.get('bixDirectPct')), bixDirectEnabled: f.get('bixDirectEnabled') === 'on' };
 try { await save({ data: { key: 'referrals', value } }); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Referral settings saved and confirmed.'); } catch(err) { onMessage(err instanceof Error ? err.message : 'Could not save settings.'); } finally {setBusy(false);}
 }}>
 <h2 className="font-display text-xl font-bold">USDT package referrals</h2>
 <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{fields.map(([label,name,fallback]) => {
 const level = name.startsWith('level') ? (initial?.['levels'] as number[] | undefined)?.[Number(name.slice(5))-1] : initial?.[name];
 return <label key={name} className="text-xs text-muted-foreground">{label}<input className="form-input mt-2" name={name} type="number" step="0.01" min={name === 'minimumDirect' ? 1 : 0} max={name === 'minimumDirect' ? undefined : 100} defaultValue={Number(level ?? fallback)} required/></label>;
 })}</div>
 <div className="border-y border-border py-5 space-y-4">
 <h2 className="flex items-center gap-2 font-display text-xl font-bold text-chart-3"><Coins/> BIX Booster direct bonus</h2>
 <label className="flex items-center gap-3 text-sm"><input name="bixDirectEnabled" type="checkbox" defaultChecked={Boolean(initial?.['bixDirectEnabled'] ?? true)}/> Enable direct BIX staking bonuses</label>
 <label className="block max-w-xs text-xs text-muted-foreground">Direct bonus %<input className="form-input mt-2" name="bixDirectPct" type="number" min="0" max="100" step="0.01" defaultValue={Number(initial?.['bixDirectPct'] ?? initial?.['direct'] ?? 10)} required/></label>
 <p className="text-xs text-muted-foreground">100% BIX. New stakes only. Owner approval funds each bonus from the existing BIX reserve; no APY profit is settled.</p>
 </div>
 <Button disabled={busy} type="submit"><Save/>{busy ? 'Saving…' : 'Save referral settings'}</Button>
 </form>
 <div className="mt-10 border-t border-border pt-6"><h2 className="font-display text-xl font-bold">BIX bonus review</h2>
 <div className="mt-4 space-y-3">{bonuses.map(b => <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
 <div className="min-w-0 text-sm"><strong className="text-chart-3">{number(Number(b.amount_bix))} BIX</strong><span className="ml-2 text-muted-foreground">{number(Number(b.rate_pct))}% · {b.status}</span><p className="mt-1 text-xs text-muted-foreground">Member {b.member_id.slice(0,8)} → Sponsor {b.referrer_id.slice(0,8)}</p></div>
  {b.status === 'pending' && <div className="flex gap-2">{[true,false].map(approve => <Button key={String(approve)} size="sm" variant={approve ? 'default' : 'outline'} disabled={busy} onClick={async () => {setBusy(true);try {await review({data:{id:b.id,approve}});qc.setQueryData(['admin-bix-bonuses'], bonuses.map(item => item.id === b.id ? {...item,status:approve ? 'approved' : 'rejected'} : item));await qc.invalidateQueries();onMessage(approve ? 'Bonus approved and credited in BIX.' : 'Bonus rejected.');} catch(err){onMessage(err instanceof Error ? err.message : 'Could not review bonus.');} finally{setBusy(false);}}}>{approve ? <Check/> : <X/>}{approve ? 'Approve' : 'Reject'}</Button>)}</div>}
 </div>)}{!bonuses.length && <p className="text-sm text-muted-foreground">No BIX referral bonuses yet.</p>}</div></div>
 </section>;
}
