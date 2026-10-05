import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { PackageGrid } from '@/components/PackageGrid';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { requestStake } from '@/lib/bixlink.functions';
import { money, type Package } from '@/lib/bixlink';
import { X } from 'lucide-react';

export const Route = createFileRoute('/stake')({ head: () => ({ meta: [{ title: 'Stake — BIXLINK' }, { name: 'description', content: 'Choose a BIXLINK staking package and submit a request.' }, { property: 'og:title', content: 'Stake — BIXLINK' }, { property: 'og:description', content: 'Eight BIXLINK staking packages from $10 to $10,000.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: StakePage });

function StakePage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const [chosen, setChosen] = useState<Package | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = useServerFn(requestStake);
  const qc = useQueryClient();
  const daily = (p: Package) => (p.price_usd * p.apy / 100 / 365);
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="STAKE">
      <div className="eyebrow">CHOOSE PACKAGE</div><h1 className="section-title">STAKE <span>BIXCOIN</span></h1>
      {cfg?.booster.enabled && <p className="mt-3 text-sm text-chart-2">APY Booster active — up to {cfg.booster.rate}%</p>}
      <div className="mt-8"><PackageGrid packages={cfg?.packages ?? []} onStake={setChosen}/></div>
      <h2 className="mt-12 font-display text-xl font-black">My requests</h2>
      <div className="mt-4 space-y-2">{(data?.stakes ?? []).map(s => <div key={s.id} className="flex justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm"><span><b>{s.package_id}</b> · {s.apy}% · {s.lock_days}d</span><span className="capitalize">{s.status}</span></div>)}{!data?.stakes.length && <p className="text-sm text-muted-foreground">No requests yet.</p>}</div>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
      {chosen && <div className="modal-backdrop" onClick={() => setChosen(null)}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black">{chosen.id}</h3><Button variant="ghost" size="icon" onClick={() => setChosen(null)}><X/></Button></div>
        <p className="mt-4 text-4xl font-black text-chart-3">{money(chosen.price_usd)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div>APY <b className="block text-chart-2">{chosen.apy}%</b></div><div>Lock <b className="block">{chosen.lock_days} days</b></div><div>Est. daily <b className="block">${daily(chosen).toFixed(4)}</b></div><div>Daily profit <b className="block">{chosen.daily_profit_enabled === false ? 'Off' : '1x / 24h'}</b></div></div>
        <p className="mt-4 text-xs text-muted-foreground">Request goes to admin for review. No funds are charged or transferred.</p>
        <Button disabled={busy} className="mt-6 w-full rounded-full bg-chart-3 text-background" onClick={async () => { setBusy(true); try { await submit({ data: { packageId: chosen.id } }); setNotice('Stake request submitted for admin review.'); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch (e) { setNotice(e instanceof Error ? e.message : 'Request failed.'); } setBusy(false); setChosen(null); }}>Submit stake request</Button>
      </div></div>}
    </MemberGate>
  </main></BixShell>;
}
