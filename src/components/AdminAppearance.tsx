import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePresentationTheme } from '@/lib/bixlink.functions';
import { resolvePresentationTheme, type PresentationTheme } from '@/lib/presentation-theme';
import { AdminWalletAppearance } from '@/components/AdminReadiness';
import type { Readiness } from '@/lib/readiness';

const options: { id: PresentationTheme; name: string; detail: string }[] = [
  { id: 'original', name: 'BIXLINK Original', detail: 'Tricolor · Violet / Green / Gold' },
  { id: 'emerald', name: 'Obsidian Emerald', detail: 'Emerald / Champagne · Spacious glass' },
  { id: 'graphite', name: 'Graphite Silver', detail: 'Silver / Teal · Spacious glass' },
  { id: 'royal', name: 'Royal Gold & Jade', detail: 'Pearl / Gold / Jade · Violet accents' },
  { id: 'glass', name: 'Spectrum Clear Glass', detail: '8 category colors · Clear glass' },
  { id: 'future', name: 'BIXLINK Future Glass', detail: 'Crystal / Cyan / Gold · Transparent' },
  { id: 'matcha', name: 'Black Matcha Lux', detail: 'Obsidian / Glossy Matcha / Silver / Orange' },
];
export function AdminAppearance({ initialTheme, initialReadiness, onSaved, onMessage }: { initialTheme?: PresentationTheme | undefined; initialReadiness?: Readiness | undefined; onSaved: () => Promise<void>; onMessage: (message: string) => void }) {
  const current = resolvePresentationTheme(initialTheme);
  const [selected, setSelected] = useState<PresentationTheme>(current);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(updatePresentationTheme);
  const qc = useQueryClient();
  useEffect(() => { setSelected(current); }, [current]);
  return <section className="mt-8 max-w-5xl" data-no-translate>
    <AdminWalletAppearance initial={initialReadiness} onMessage={onMessage} onSaved={onSaved}/>
    <div className="mt-8 flex items-center gap-2 text-primary"><Palette size={18}/><h2 className="font-display text-xl font-bold">Project appearance</h2></div>
    <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Project theme">
      {options.map(option => <Button key={option.id} type="button" variant="outline" className="theme-option" aria-label={`Select ${option.name}`} aria-pressed={selected === option.id} disabled={saving} onClick={() => setSelected(option.id)}>
        <span className="theme-miniature" data-presentation-theme={option.id}>
          <span className="theme-miniature-bar"><span>BIXLINK</span><span className="theme-swatches"><i/><i/><i/></span></span>
          <span className="theme-miniature-panels"><span><small>BIX / USDT</small><b>REFERENCE</b><span className="theme-miniature-chart"/></span><span><small>MARKET WATCH</small><i/><i/><i/></span></span>
          <span className="theme-miniature-ribbon"><i/><i/><i/><i/>{option.id === 'glass' && <><i/><i/><i/><i/></>}</span>
        </span>
        <span className="flex w-full items-center justify-between gap-2"><span className="min-w-0 text-left"><b className="block text-sm">{option.name}</b><small className="mt-1 block text-xs text-muted-foreground">{option.detail}</small></span>{selected === option.id && <Check className="shrink-0 text-chart-2" size={18}/>}</span>
        <span className="text-left text-[10px] font-bold text-chart-2">{current === option.id ? 'ACTIVE' : '\u00a0'}</span>
      </Button>)}
    </div>
    <div className="mt-6 flex justify-end"><Button disabled={saving || selected === current} onClick={async () => { setSaving(true); try { await save({ data: { theme: selected } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); await onSaved(); onMessage('Project theme saved for all members and visitors.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not save theme.'); } finally { setSaving(false); } }}><Save/>{saving ? 'Saving…' : 'Apply project theme'}</Button></div>
  </section>;
}