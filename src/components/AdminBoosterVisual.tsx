import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bot, Cpu, Shield } from 'lucide-react';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { boosterMaximum } from '@/lib/booster-apy';
import foxVisual from '@/assets/booster-concept-fox.png';
import reactorVisual from '@/assets/booster-concept-reactor.png';
import emblemVisual from '@/assets/booster-concept-emblem.png';

export type BoosterVisual = 'fox' | 'reactor' | 'emblem';

const visualOptions = [
  { id: 'fox' as const, label: 'Fox Robot', description: 'Guardian robot with reactor', icon: Bot, image: foxVisual },
  { id: 'reactor' as const, label: 'Mesin Reaktor', description: 'Precision yield power core', icon: Cpu, image: reactorVisual },
  { id: 'emblem' as const, label: 'Emblem Fox', description: 'Minimal premium insignia', icon: Shield, image: emblemVisual },
];

export function AdminBoosterVisual({ initialVisual, enabled, onMessage, onSaved }: { initialVisual: BoosterVisual; enabled: boolean; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const saveSetting = useServerFn(updateSetting);
  const [selected, setSelected] = useState<BoosterVisual>(initialVisual);
  const [saving, setSaving] = useState(false);
  const { data: cfg } = usePublicConfig();
  const [maximum, setMaximum] = useState<number | null>(null);
  const [active, setActive] = useState(enabled);
  const cap = maximum ?? boosterMaximum(cfg?.booster.maxApy);

  async function saveVisual() {
    setSaving(true);
    try {
      await saveSetting({ data: { key: 'booster_visual', value: { visual: selected } } });
      await onSaved();
      onMessage('BOOST APY visual updated.');
    } catch {
      onMessage('Could not update BOOST APY visual.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="mt-8 max-w-4xl space-y-5">
    <div className="rounded-[20px] border border-chart-2 bg-card p-6">
      <h2 className="font-display text-xl font-black">BIXCOIN yield engine</h2>
      <p className="my-5 text-sm leading-6 text-muted-foreground">When active, every eligible BIXCOIN staking position receives a live minute-by-minute profit projection. Package volume and lock duration set APY from 8% to the owner-selected maximum, allocated 70% BIX and 30% USDT. Existing stakes and USDT packages do not change.</p>
      <label className="flex items-center gap-3"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/> APY BOOSTER ACTIVE</label>
      <label className="mt-4 block text-sm">Maximum annual BIX APY (%)<input aria-label="Maximum annual BIX APY" type="number" min={8} max={45} step={0.01} value={cap} onChange={event => setMaximum(Number(event.target.value))} className="mt-2 block w-36 rounded-lg border border-border bg-background p-3"/></label>
      <Button className="mt-4" disabled={saving || !Number.isFinite(cap) || cap < 8 || cap > 45} onClick={async () => { setSaving(true); try { await saveSetting({ data: { key: 'booster', value: { enabled: active, rate: cfg?.booster.rate ?? 25, maxApy: cap } } }); await onSaved(); onMessage('BIX Booster maximum saved. Existing contracts and USDT packages are unchanged.'); } catch { onMessage('Could not save BIX Booster maximum.'); } finally { setSaving(false); } }}>Save Booster APY</Button>

    </div>

    <p className="text-sm text-muted-foreground">BOOST APY and landing use the shared Frosted Glass Luxe reactor video.</p>
  </div>;
}

function SaveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
}