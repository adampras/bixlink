import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { PackageGrid } from '@/components/PackageGrid';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { requestStake } from '@/lib/bixlink.functions';
import { money, type Package } from '@/lib/bixlink';
import { CheckCircle2, Clock3, ShieldCheck, X, XCircle } from 'lucide-react';

export const Route = createFileRoute('/stake')({ head: () => ({ meta: [{ title: 'Stake — BIXLINK' }, { name: 'description', content: 'Choose a BIXLINK staking package and submit a request.' }, { property: 'og:title', content: 'Stake — BIXLINK' }, { property: 'og:description', content: 'Eight BIXLINK staking packages from $10 to $10,000.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: StakePage });

function StakePage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const [chosen, setChosen] = useState<Package | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const submit = useServerFn(requestStake);
  const qc = useQueryClient();
  const daily = (p: Package) => (p.price_usd * p.apy / 100 / 365);
  useEffect(() => { setNow(Date.now()); }, []);
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="STAKE">
      <div className="eyebrow">CHOOSE PACKAGE</div><h1 className="section-title">STAKE <span>BIXCOIN</span></h1>
      {cfg?.booster.enabled && <p className="mt-3 text-sm text-chart-2">APY Booster active — up to {cfg.booster.rate}%</p>}
      <div className="mt-8"><PackageGrid packages={cfg?.packages ?? []} onStake={setChosen}/></div>
      <div className="mt-12 flex items-end justify-between gap-4"><div><div className="eyebrow">ACTIVITY</div><h2 className="mt-2 font-display text-2xl font-black">My requests</h2></div><span className="numeric text-xs text-muted-foreground">{data?.stakes.length ?? 0} total</span></div>
      <div className="mt-4 space-y-3">{(data?.stakes ?? []).map(s => {
        const started = s.activated_at ? new Date(s.activated_at).getTime() : null;
        const end = started ? started + s.lock_days * 86400000 : null;
        const progress = now && started && end ? Math.max(0, Math.min(100, ((now - started) / (end - started)) * 100)) : 0;
        const statusStyle = s.status === 'active' ? 'border-chart-2/40 bg-chart-2/10 text-chart-2' : s.status === 'rejected' ? 'border-destructive/40 bg-destructive/10 text-destructive' : s.status === 'completed' ? 'border-chart-3/40 bg-chart-3/10 text-chart-3' : 'border-primary/40 bg-primary/10 text-primary';
        const StatusIcon = s.status === 'active' || s.status === 'completed' ? CheckCircle2 : s.status === 'rejected' ? XCircle : Clock3;
        return <article key={s.id} className="stake-request p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><strong className="text-lg">{s.package_id}</strong><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle}`}><StatusIcon size={11}/>{s.status}</span></div><p className="numeric mt-1 text-xs text-muted-foreground">Requested {new Date(s.created_at).toLocaleDateString('en-GB')}</p></div><div className="text-right"><strong className="numeric block text-xl text-chart-3">{money(Number(s.amount_usd))}</strong><span className="numeric text-xs text-muted-foreground">{s.apy}% APY · {s.lock_days} days</span></div></div>{s.status === 'active' && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>Lock progress</span><span className="numeric">{Math.round(progress)}%</span></div><div className="stake-progress"><i style={{ width: `${progress}%` }}/></div>{end && <p className="numeric mt-2 text-[11px] text-muted-foreground">Unlock estimate: {new Date(end).toLocaleDateString('en-GB')}</p>}</div>}</article>;
      })}{!data?.stakes.length && <div className="stake-request p-8 text-center"><ShieldCheck className="mx-auto text-primary"/><p className="mt-3 text-sm font-bold">No stake requests yet</p><p className="mt-1 text-xs text-muted-foreground">Choose a package above to submit your first admin-reviewed request.</p></div>}</div>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
      {chosen && <div className="modal-backdrop" onClick={() => setChosen(null)}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black">{chosen.id}</h3><Button variant="ghost" size="icon" onClick={() => setChosen(null)}><X/></Button></div>
        <p className="numeric mt-4 text-4xl font-black text-chart-3">{money(chosen.price_usd)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div>APY <b className="numeric block text-chart-2">{chosen.apy}%</b></div><div>Lock <b className="numeric block">{chosen.lock_days} days</b></div><div>Est. daily <b className="numeric block">${daily(chosen).toFixed(4)}</b></div><div>Est. lock return <b className="numeric block">{money(daily(chosen) * chosen.lock_days)}</b></div></div>
        <div className="mt-4 rounded-xl border border-border p-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Estimated annual profit</span><b className="numeric">{money(chosen.price_usd * chosen.apy / 100)}</b></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">70% USDT allocation</span><b className="numeric text-chart-2">{money(chosen.price_usd * chosen.apy / 100 * .7)}</b></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">30% BIX allocation</span><b className="numeric text-chart-3">{(chosen.price_usd * chosen.apy / 100 * .3 / .1).toLocaleString()} BIX</b></div></div>
        <p className="mt-4 text-xs text-muted-foreground">Request goes to admin for review. No funds are charged or transferred, and displayed profit remains an estimate until recorded.</p>
        <Button disabled={busy} className="mt-6 w-full rounded-full bg-chart-3 text-background" onClick={async () => { setBusy(true); try { await submit({ data: { packageId: chosen.id } }); setNotice('Stake request submitted for admin review.'); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch (e) { setNotice(e instanceof Error ? e.message : 'Request failed.'); } setBusy(false); setChosen(null); }}>Submit stake request</Button>
      </div></div>}
    </MemberGate>
  </main></BixShell>;
}
