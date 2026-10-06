import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { requestStake } from '@/lib/bixlink.functions';
import { date, money, number, type Package } from '@/lib/bixlink';
import { ArrowUpRight, CheckCircle2, Clock3, LockKeyhole, ShieldCheck, X, XCircle, Zap } from 'lucide-react';

export const Route = createFileRoute('/stake')({ head: () => ({ meta: [{ title: 'Stake — BIXLINK' }, { name: 'description', content: 'Choose a BIXLINK staking package and submit a request.' }, { property: 'og:title', content: 'Stake — BIXLINK' }, { property: 'og:description', content: 'Eight BIXLINK staking packages from $10 to $10,000.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: StakePage });

function StakePage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const [chosen, setChosenRaw] = useState<Package | null>(null);
  const [agree, setAgree] = useState(false);
  const [congrats, setCongrats] = useState<Package | null>(null);
  const setChosen = (p: Package | null) => { setAgree(false); setChosenRaw(p); };
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const submit = useServerFn(requestStake);
  const qc = useQueryClient();
  const daily = (p: Package) => (p.price_usd * p.apy / 100 / 365);
  useEffect(() => { setNow(Date.now()); }, []);
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="STAKE">
      <div className="stake-lux-head">
        <div className="stake-lux-headrow">
          <div className="eyebrow">CHOOSE PACKAGE</div>
          <span className="stake-lux-chip">Admin-reviewed</span>
        </div>
        <h1 className="section-title stake-lux-title">STAKE <span>BIXCOIN</span></h1>
        {cfg?.booster.enabled && <p className="stake-lux-boost"><i aria-hidden />APY Booster active — up to {cfg.booster.rate}%</p>}
      </div>
      <div className="stake-pool">
        <div><span className="stake-pool-label">BIX supply</span><p className="stake-pool-value">21 JUTA BIX TOKEN</p></div>
        <span className="stake-pool-ico" aria-hidden><Zap size={15} /></span>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(cfg?.packages ?? []).map((p, i) => {
          const popular = p.id === 'BUILDER';
          const maxYield = p.id === 'LEGEND';
          return <article key={p.id} className={`stake-lux-card${popular ? ' stake-lux-card--pop' : ''}${maxYield ? ' stake-lux-card--gold' : ''}`}>
            {popular && <span className="stake-lux-notch">Popular</span>}
            {maxYield && <span className="stake-lux-notch stake-lux-notch--gold">Max yield</span>}
            <div className="stake-lux-cardrow">
              <div><p className="stake-lux-kicker">Package {String(i + 1).padStart(2, '0')}</p><h3 className="stake-lux-name">{p.id}</h3></div>
              <strong className="stake-lux-price numeric">{money(p.price_usd)}</strong>
            </div>
            <div className="stake-lux-stats">
              <div className="stake-lux-stat"><span>Annual yield</span><b className="numeric text-chart-2">{p.apy}% <small>APY</small></b></div>
              <div className="stake-lux-stat stake-lux-stat--end"><span>Lock period</span><b className="numeric flex items-center justify-end gap-1.5 text-sm"><LockKeyhole size={12} />{p.lock_days} days</b></div>
            </div>
            <Button className="stake-lux-btn w-full rounded-xl" onClick={() => setChosen(p)}>Stake Now <ArrowUpRight /></Button>
          </article>;
        })}
      </div>
      <div className="mt-12 flex items-end justify-between gap-4"><div><div className="eyebrow">ACTIVITY</div><h2 className="mt-2 font-display text-2xl font-black">My requests</h2></div><span className="numeric text-xs text-muted-foreground">{data?.stakes.length ?? 0} total</span></div>
      <div className="mt-4 space-y-3">{(data?.stakes ?? []).map(s => {
        const started = s.activated_at ? new Date(s.activated_at).getTime() : null;
        const end = started ? started + s.lock_days * 86400000 : null;
        const progress = now && started && end ? Math.max(0, Math.min(100, ((now - started) / (end - started)) * 100)) : 0;
        const statusStyle = s.status === 'active' ? 'border-chart-2/40 bg-chart-2/10 text-chart-2' : s.status === 'rejected' ? 'border-destructive/40 bg-destructive/10 text-destructive' : s.status === 'completed' ? 'border-chart-3/40 bg-chart-3/10 text-chart-3' : 'border-primary/40 bg-primary/10 text-primary';
        const StatusIcon = s.status === 'active' || s.status === 'completed' ? CheckCircle2 : s.status === 'rejected' ? XCircle : Clock3;
        return <article key={s.id} className="stake-request p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><strong className="text-lg">{s.package_id}</strong><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle}`}><StatusIcon size={11}/>{s.status}</span></div><p className="numeric mt-1 text-xs text-muted-foreground">Requested {date(s.created_at)}</p></div><div className="text-right"><strong className="numeric block text-xl text-chart-3">{money(Number(s.amount_usd))}</strong><span className="numeric text-xs text-muted-foreground">{s.apy}% APY · {s.lock_days} days</span></div></div>{s.status === 'active' && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>Lock progress</span><span className="numeric">{Math.round(progress)}%</span></div><div className="stake-progress"><i style={{ width: `${progress}%` }}/></div>{end && <p className="numeric mt-2 text-[11px] text-muted-foreground">Unlock estimate: {date(end)}</p>}</div>}</article>;
      })}{!data?.stakes.length && <div className="stake-request p-8 text-center"><ShieldCheck className="mx-auto text-primary"/><p className="mt-3 text-sm font-bold">No stake requests yet</p><p className="mt-1 text-xs text-muted-foreground">Choose a package above to submit your first admin-reviewed request.</p></div>}</div>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
      {chosen && <div className="modal-backdrop" onClick={() => setChosen(null)}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black">{chosen.id}</h3><Button variant="ghost" size="icon" onClick={() => setChosen(null)}><X/></Button></div>
        <p className="numeric mt-4 text-4xl font-black text-chart-3">{money(chosen.price_usd)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div>APY <b className="numeric block text-chart-2">{chosen.apy}%</b></div><div>Lock <b className="numeric block">{chosen.lock_days} days</b></div><div>Est. daily <b className="numeric block">${daily(chosen).toFixed(4)}</b></div><div>Est. lock return <b className="numeric block">{money(daily(chosen) * chosen.lock_days)}</b></div></div>
        <div className="mt-4 rounded-xl border border-border p-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Estimated annual profit</span><b className="numeric">{money(chosen.price_usd * chosen.apy / 100)}</b></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">70% USDT allocation</span><b className="numeric text-chart-2">{money(chosen.price_usd * chosen.apy / 100 * .7)}</b></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">30% BIX allocation</span><b className="numeric text-chart-3">{number(chosen.price_usd * chosen.apy / 100 * .3 / .1, { maximumFractionDigits: 8 })} BIX</b></div></div>
        <p className="mt-4 text-xs text-muted-foreground">Request goes to admin for review. No funds are charged or transferred, and displayed profit remains an estimate until recorded.</p>
        <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={agree} onChange={e => setAgree(e.target.checked)}/> I agree to the staking terms: lock period, APY estimate and admin review.</label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => { setChosen(null); setNotice('Stake cancelled — you did not agree.'); }}>Disagree</Button>
          <Button disabled={busy || !agree} className="rounded-full bg-chart-3 text-background" onClick={async () => { setBusy(true); try { await submit({ data: { packageId: chosen.id } }); setCongrats(chosen); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch (e) { setNotice(e instanceof Error ? e.message : 'Request failed.'); } setBusy(false); setChosen(null); }}>Agree & stake</Button>
        </div>
      </div></div>}
      {congrats && <div className="modal-backdrop" onClick={() => setCongrats(null)}><div role="dialog" aria-modal="true" className="modal-panel deposit-success text-center" onClick={e => e.stopPropagation()}>
        <CheckCircle2 size={56} className="mx-auto text-chart-2"/>
        <h3 className="mt-4 font-display text-3xl font-black text-chart-2">CONGRATULATION!</h3>
        <p className="mt-2 text-sm">Your <b className="text-chart-3">{congrats.id}</b> stake of <b className="numeric text-chart-3">{money(congrats.price_usd)}</b> was submitted successfully.</p>
        <p className="mt-2 text-xs text-muted-foreground">It becomes active after admin review.</p>
        <Button className="mt-6 w-full rounded-full bg-chart-2 text-background" onClick={() => setCongrats(null)}>Done</Button>
      </div></div>}
    </MemberGate>
  </main></BixShell>;
}
