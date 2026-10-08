import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { boosterMaximum } from '@/lib/booster-apy';

export type BoosterVisual = 'fox' | 'reactor' | 'emblem';

export function AdminBoosterVisual({ enabled, onMessage, onSaved }: { initialVisual: BoosterVisual; enabled: boolean; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const saveSetting = useServerFn(updateSetting);
  const [saving, setSaving] = useState(false);
  const { data: cfg } = usePublicConfig();
  const [maximum, setMaximum] = useState<number | null>(null);
  const [active, setActive] = useState(enabled);
  const cap = maximum ?? boosterMaximum(cfg?.booster.maxApy);

  return <div className="mt-8 max-w-4xl space-y-5">
    <div className="rounded-[20px] border border-chart-2 bg-card p-6">
      <h2 className="font-display text-xl font-black">BIXCOIN yield engine</h2>
      <p className="my-5 text-sm leading-6 text-muted-foreground">When active, every eligible BIXCOIN staking position receives a live minute-by-minute profit projection. Package volume and lock duration set APY from 8% to the owner-selected maximum, allocated 70% BIX and 30% USDT. Existing stakes and USDT packages do not change.</p>
      <label className="flex items-center gap-3"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/> APY BOOSTER ACTIVE</label>
      <label className="mt-4 block text-sm">Maximum annual BIX APY (%)<input aria-label="Maximum annual BIX APY" type="number" min={8} max={45} step={0.01} value={cap} onChange={event => setMaximum(Number(event.target.value))} className="mt-2 block w-36 rounded-lg border border-border bg-background p-3"/></label>
      <Button className="mt-4" disabled={saving || !Number.isFinite(cap) || cap < 8 || cap > 45} onClick={async () => { setSaving(true); try { await saveSetting({ data: { key: 'booster', value: { enabled: active, rate: cfg?.booster.rate ?? 25, maxApy: cap } } }); await onSaved(); onMessage('BIX Booster maximum saved. Existing contracts and USDT packages are unchanged.'); } catch { onMessage('Could not save BIX Booster maximum.'); } finally { setSaving(false); } }}>Save Booster APY</Button>

    </div>

  </div>;
}
