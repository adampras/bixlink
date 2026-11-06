import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Plus, Save, Trash2 } from 'lucide-react';
import { updateSetting } from '@/lib/bixlink.functions';
import { readBixGold, type BixGoldSettings } from '@/lib/bix-gold';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminFold } from '@/components/AdminNavigation';

const num = (v: string) => (v === '' ? 0 : Number(v));
function N({ label, value, onChange, step = 'any' }: { label: string; value: number; onChange: (n: number) => void; step?: string }) {
  return <label className="block text-xs text-muted-foreground">{label}<input type="number" min={0} step={step} className="form-input mt-1" value={value} onChange={e => onChange(num(e.target.value))}/></label>;
}

export function AdminBixGold({ initial, onMessage, onSaved }: { initial?: unknown; onMessage: (m: string) => void; onSaved?: () => void }) {
  const [s, setS] = useState<BixGoldSettings>(() => readBixGold(initial));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(updateSetting);
  const set = <K extends keyof BixGoldSettings>(k: K, v: BixGoldSettings[K]) => setS({ ...s, [k]: v });
  const submit = async () => { setBusy(true); try { await save({ data: { key: 'bix_gold', value: s } }); onMessage('BIX GOLD settings saved.'); onSaved?.(); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save BIX GOLD'); } finally { setBusy(false); } };

  return <section className="mt-8 max-w-4xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-xl font-bold">BIX GOLD · Marketing Plan</h2>
      <label className="flex items-center gap-2 text-sm"><Switch checked={s.enabled} onCheckedChange={v => set('enabled', v)}/>{s.enabled ? 'LIVE (public)' : 'Under construction'}</label>
    </div>
    <p className="text-sm text-muted-foreground">All values are presentation references shown on the BIX GOLD page. Nothing here credits balances or pays bonuses automatically.</p>

    <AdminFold title="1 · Gold reference price" tone="gold" defaultOpen>
      <label className="mt-4 flex items-center gap-2 text-sm"><Switch checked={s.autoPrice} onCheckedChange={v => set('autoPrice', v)}/>Auto daily market price (live spot + FX). Off = use manual values below.</label>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <N label="USD per gram" value={s.priceUsdPerGram} onChange={v => set('priceUsdPerGram', v)}/>
        <N label="1 USD = IDR" value={s.usdIdr} onChange={v => set('usdIdr', v)}/>
        <N label="1 USD = MYR" value={s.usdMyr} onChange={v => set('usdMyr', v)}/>
      </div>
    </AdminFold>

    <AdminFold title="2 · Gram packages" tone="emerald" badge={s.packages.length}>
      <div className="mt-4 space-y-2">{s.packages.map((p, i) => <div key={i} className="grid grid-cols-[1fr_7rem_auto_auto] items-end gap-2">
        <label className="text-xs text-muted-foreground">Name<input className="form-input mt-1" value={p.name} maxLength={40} onChange={e => set('packages', s.packages.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}/></label>
        <N label="Grams" value={p.grams} onChange={v => set('packages', s.packages.map((x, j) => j === i ? { ...x, grams: v } : x))}/>
        <Switch aria-label="Package enabled" checked={p.enabled} onCheckedChange={v => set('packages', s.packages.map((x, j) => j === i ? { ...x, enabled: v } : x))}/>
        <Button size="icon" variant="ghost" aria-label="Remove package" onClick={() => set('packages', s.packages.filter((_, j) => j !== i))}><Trash2/></Button>
      </div>)}
      {s.packages.length < 10 && <Button variant="outline" size="sm" onClick={() => set('packages', [...s.packages, { name: 'New package', grams: 1, enabled: true }])}><Plus/>Add package</Button>}</div>
    </AdminFold>

    <AdminFold title="3 · Sponsor & generation bonus" tone="cyan">
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <N label="Sponsor (direct) %" value={s.sponsorPct} onChange={v => set('sponsorPct', v)}/>
        {s.levels.map((l, i) => <N key={i} label={`Level ${i + 1} %`} value={l} onChange={v => set('levels', s.levels.map((x, j) => j === i ? v : x))}/>)}
      </div>
    </AdminFold>

    <AdminFold title="4 · Passive gold yield (lock)" tone="violet">
      <div className="mt-4 space-y-2">{s.yieldPlans.map((y, i) => <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
        <N label="Lock days" step="1" value={y.days} onChange={v => set('yieldPlans', s.yieldPlans.map((x, j) => j === i ? { ...x, days: Math.round(v) } : x))}/>
        <N label="Monthly %" value={y.monthlyPct} onChange={v => set('yieldPlans', s.yieldPlans.map((x, j) => j === i ? { ...x, monthlyPct: v } : x))}/>
        <Switch aria-label="Plan enabled" checked={y.enabled} onCheckedChange={v => set('yieldPlans', s.yieldPlans.map((x, j) => j === i ? { ...x, enabled: v } : x))}/>
        <Button size="icon" variant="ghost" aria-label="Remove plan" onClick={() => set('yieldPlans', s.yieldPlans.filter((_, j) => j !== i))}><Trash2/></Button>
      </div>)}
      {s.yieldPlans.length < 8 && <Button variant="outline" size="sm" onClick={() => set('yieldPlans', [...s.yieldPlans, { days: 30, monthlyPct: 0, enabled: false }])}><Plus/>Add plan</Button>}</div>
    </AdminFold>

    <AdminFold title="5 · Physical minting & rank rewards" tone="rose">
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <N label="Minting fee (USD per order)" value={s.mintFeeUsd} onChange={v => set('mintFeeUsd', v)}/>
        <N label="Shipping insurance %" value={s.insurancePct} onChange={v => set('insurancePct', v)}/>
      </div>
      <div className="mt-4 space-y-2">{s.ranks.map((r, i) => <div key={i} className="grid grid-cols-[1fr_7rem_1fr_auto] items-end gap-2">
        <label className="text-xs text-muted-foreground">Rank<input className="form-input mt-1" maxLength={40} value={r.name} onChange={e => set('ranks', s.ranks.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}/></label>
        <N label="Team grams" value={r.teamGrams} onChange={v => set('ranks', s.ranks.map((x, j) => j === i ? { ...x, teamGrams: v } : x))}/>
        <label className="text-xs text-muted-foreground">Reward<input className="form-input mt-1" maxLength={80} value={r.reward} placeholder="e.g. 5g gold coin" onChange={e => set('ranks', s.ranks.map((x, j) => j === i ? { ...x, reward: e.target.value } : x))}/></label>
        <Button size="icon" variant="ghost" aria-label="Remove rank" onClick={() => set('ranks', s.ranks.filter((_, j) => j !== i))}><Trash2/></Button>
      </div>)}
      {s.ranks.length < 10 && <Button variant="outline" size="sm" onClick={() => set('ranks', [...s.ranks, { name: 'New rank', teamGrams: 0, reward: '' }])}><Plus/>Add rank</Button>}</div>
      <label className="mt-4 block text-xs text-muted-foreground">Notes / terms shown to members<textarea className="form-input mt-1 min-h-20" maxLength={600} value={s.notes} onChange={e => set('notes', e.target.value)}/></label>
    </AdminFold>

    <Button disabled={busy} onClick={() => void submit()}><Save/>{busy ? 'Saving…' : 'Save BIX GOLD settings'}</Button>
  </section>;
}
