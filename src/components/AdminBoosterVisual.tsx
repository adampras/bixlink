import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bot, Cpu, Shield } from 'lucide-react';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
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
      <p className="my-5 text-sm leading-6 text-muted-foreground">When active, every eligible BIXCOIN staking position receives a live minute-by-minute profit projection. Package volume and lock duration set APY from 8% to 25%, allocated 70% USDT and 30% BIX.</p>
      <label className="flex items-center gap-3"><input type="checkbox" defaultChecked={enabled} onChange={async event => { try { await saveSetting({ data: { key: 'booster', value: { enabled: event.target.checked, rate: 25 } } }); onMessage('Booster updated.'); await onSaved(); } catch { onMessage('Could not update booster.'); } }}/> APY BOOSTER ACTIVE · up to 25%</label>
    </div>

    <section className="rounded-[20px] border border-border bg-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><span className="eyebrow">VISUAL CONTROL</span><h3 className="mt-2 font-display text-lg font-black">BOOST APY centerpiece</h3></div>
        <span className="text-xs text-muted-foreground">Tricolor theme remains locked</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {visualOptions.map(option => {
          const Icon = option.icon;
          const active = selected === option.id;
          return <Button key={option.id} type="button" variant="outline" className={`admin-visual-option ${active ? 'admin-visual-option--active' : ''}`} aria-pressed={active} onClick={() => setSelected(option.id)}>
            <img src={option.image} alt="" className="admin-visual-thumb"/>
            <span className="admin-visual-copy"><b><Icon size={15}/>{option.label}</b><small>{option.description}</small></span>
          </Button>;
        })}
      </div>
      <Button className="mt-5 rounded-full" onClick={saveVisual} disabled={saving}><SaveIcon/>{saving ? 'Saving…' : 'Save visual'}</Button>
    </section>
  </div>;
}

function SaveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
}