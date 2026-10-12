import { useState } from 'react';
import { Shuffle, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YieldControlPanel } from '@/components/YieldControlPanel';
import { AdminDurationPackages } from '@/components/AdminDurationPackages';

/** One staking workspace: bulk daily updates or individual package terms. */
export function AdminStakingControls({ onMessage }: { onMessage: (message: string) => void }) {
  const [view, setView] = useState<'daily' | 'packages'>('daily');
  return <section className="mt-6 min-w-0">
    <div role="group" aria-label="Staking controls" className="grid grid-cols-2 gap-2 border-b border-border pb-4">
      <Button variant={view === 'daily' ? 'default' : 'outline'} aria-pressed={view === 'daily'} className="h-auto min-h-11 whitespace-normal" onClick={() => setView('daily')}><Shuffle size={16}/>Profit harian</Button>
      <Button variant={view === 'packages' ? 'default' : 'outline'} aria-pressed={view === 'packages'} className="h-auto min-h-11 whitespace-normal" onClick={() => setView('packages')}><SlidersHorizontal size={16}/>Edit paket</Button>
    </div>
    {view === 'daily' ? <YieldControlPanel market={false}/> : <AdminDurationPackages onMessage={onMessage}/>}
  </section>;
}