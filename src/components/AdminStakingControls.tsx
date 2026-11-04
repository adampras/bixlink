import { useState } from 'react';
import { Gem, LineChart, Shuffle, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YieldControlPanel } from '@/components/YieldControlPanel';
import { AdminMarketTab } from '@/components/AdminMarketTab';
import { AdminDurationPackages } from '@/components/AdminDurationPackages';
import { AdminStakingSkin } from '@/components/AdminStakingSkin';

type View = 'daily' | 'packages' | 'market' | 'skin';
/** One staking workspace: bulk daily updates, package terms, market, or network-scoped design. */
export function AdminStakingControls({ onMessage }: { onMessage: (message: string) => void }) {
  const [view, setView] = useState<View>('daily');
  const tab = (v: View, icon: React.ReactNode, label: string) => <Button variant={view === v ? 'default' : 'outline'} aria-pressed={view === v} className="h-auto min-h-11 whitespace-normal" onClick={() => setView(v)}>{icon}{label}</Button>;
  return <section className="mt-6 min-w-0">
    <div role="group" aria-label="Staking controls" className="grid grid-cols-2 gap-2 border-b border-border pb-4 sm:grid-cols-4">
      {tab('daily', <Shuffle size={16}/>, 'Profit harian')}
      {tab('packages', <SlidersHorizontal size={16}/>, 'Edit paket')}
      {tab('market', <LineChart size={16}/>, 'Price & chart')}
      {tab('skin', <Gem size={16}/>, 'Network design')}
    </div>
    {view === 'market' ? <AdminMarketTab onMessage={onMessage}/> : view === 'daily' ? <YieldControlPanel market={false}/> : view === 'skin' ? <AdminStakingSkin onMessage={onMessage}/> : <AdminDurationPackages onMessage={onMessage}/>}
  </section>;
}
