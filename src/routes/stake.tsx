import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DurationPackageCard } from '@/components/DurationPackageCard';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { confirmPin, txFeedback } from '@/components/TxFeedback';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { requestStake, unstakeStake, setStakeCompound } from '@/lib/bixlink.functions';
import { date, money, number, type Package } from '@/lib/bixlink';
import { ArrowUpRight, CheckCircle2, ChevronDown, ChevronUp, Clock3, LockKeyhole, ShieldCheck, X, XCircle, Zap } from 'lucide-react';

export const Route = createFileRoute('/stake')({ head: () => ({ meta: [{ title: 'Stake — BIXLINK' }, { name: 'description', content: 'Choose a BIXLINK staking package and submit a request.' }, { property: 'og:title', content: 'Stake — BIXLINK' }, { property: 'og:description', content: 'Eight BIXLINK staking packages from $10 to $10,000.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: StakePage });

function StakePage() {
  const { user, ready, data } = useMember();
  const { data: cfg } = usePublicConfig();
  const [chosen, setChosenRaw] = useState<(Package & { compound?: boolean }) | null>(null);
  const [agree, setAgree] = useState(false);
  const [congrats, setCongrats] = useState<Package | null>(null);
  const setChosen = (p: (Package & { compound?: boolean }) | null) => { setAgree(false); setChosenRaw(p); };
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestsVisible, setRequestsVisible] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const submit = useServerFn(requestStake);
  const doUnstake = useServerFn(unstakeStake); const toggleCompound = useServerFn(setStakeCompound);
  const [unstaking, setUnstaking] = useState<NonNullable<typeof data>['stakes'][number] | null>(null);
  const [unAgree, setUnAgree] = useState(false);
  const bal = useQuery({ queryKey: ['vusdt', user?.id], enabled: !!user, queryFn: async () => { if (!user) return 0; return Number((await supabase.rpc('bix_vusdt_balance', { p_user: user.id })).data ?? 0); } });
  const tiers = [...(cfg?.unstake.tiers ?? [])].sort((a, b) => a.days - b.days);
  const elapsedDays = (s: { activated_at: string | null; created_at: string }) => now ? (now - new Date(s.activated_at ?? s.created_at).getTime()) / 86400000 : 0;
  const penaltyFor = (s: { activated_at: string | null; created_at: string; lock_days: number }) => { const d = elapsedDays(s); if (d >= s.lock_days) return 0; return tiers.find(t => d < t.days)?.pct ?? 0; };
  const refreshAll = async () => { await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); await qc.invalidateQueries({ queryKey: ['my-wallet'] }); await bal.refetch(); };
  const qc = useQueryClient();
  const daily = (p: Package) => (p.price_usd * p.apy / 100 / 365);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const liveOf = (s: { amount_usd: number | string; apy: number | string; lock_days: number; activated_at: string | null; created_at: string; compound?: boolean }) => { const d = Math.max(0, Math.min(elapsedDays(s), s.lock_days)); const r = Number(s.apy) / 100 / 365; return s.compound ? Number(s.amount_usd) * (Math.pow(1 + r, d) - 1) : Number(s.amount_usd) * r * d; };
  const activeStakes = (data?.stakes ?? []).filter(s => s.status === 'active');
  const liveTotal = activeStakes.reduce((n, s) => n + liveOf(s), 0);
  const perSecond = activeStakes.reduce((n, s) => n + Number(s.amount_usd) * Number(s.apy) / 100 / 365 / 86400, 0);
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
    <MemberGate ready={ready} signedIn={!!user} title="STAKE">
      <div className="stake-lux-head auric-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="eyebrow">CHOOSE PACKAGE</div>
          <span className="stake-lux-chip">Instant · {data?.isAdmin ? 'Virtual USDT' : 'USDT'}</span>
        </div>
        <h1 className="section-title stake-lux-title !text-3xl !tracking-normal sm:!text-5xl">STAKING <span>CRYPTO</span></h1>
        
      </div>
      <dl aria-label="Staking summary" className="mt-5 grid grid-cols-[0.8fr_1.2fr_1fr] gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="min-w-0 rounded-lg border border-border bg-card/50 px-2 py-3 backdrop-blur-xl sm:px-4"><dt className="text-[9px] font-semibold uppercase text-muted-foreground sm:text-xs">BIX supply</dt><dd className="mt-1 font-display text-xs font-bold text-chart-3 sm:text-lg">21M BIX</dd></div>
        <div className="min-w-0 rounded-lg border border-border bg-card/50 px-2 py-3 backdrop-blur-xl sm:px-4"><dt className="text-[9px] font-semibold uppercase text-muted-foreground sm:text-xs">Balance</dt><dd title={money(bal.data ?? 0)} className="numeric mt-1 break-all font-display text-[11px] font-bold leading-4 sm:text-lg">{money(bal.data ?? 0)}</dd></div>
        <div className="min-w-0 rounded-lg border border-border bg-card/50 px-2 py-3 backdrop-blur-xl sm:px-4"><dt className="text-[9px] font-semibold uppercase text-muted-foreground sm:text-xs">Live profit</dt><dd title={`$${liveTotal.toFixed(6)}`} className="numeric mt-1 break-all font-display text-[11px] font-bold leading-4 text-chart-2 sm:text-lg">${liveTotal.toFixed(6)}</dd></div>
      </dl>
      {activeStakes.length > 0 && <p className="numeric mt-2 text-[10px] leading-4 text-muted-foreground">+${perSecond.toFixed(8)} / second · projection</p>}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {(cfg?.packages ?? []).map((p, i) => <DurationPackageCard key={p.id} pkg={p} index={i} onStake={setChosen}/>)}
      </div>
      <div className="mt-6 flex justify-end"><Button asChild variant="outline"><Link to="/nft-marketplace">NFT Marketplace &amp; My collection <ArrowUpRight size={16}/></Link></Button></div>
      <div className="mt-12 flex items-end justify-between gap-4"><div><div className="eyebrow">ACTIVITY</div><h2 className="mt-2 font-display text-2xl font-black">My requests</h2></div><div className="flex items-center gap-2"><span className="numeric text-xs text-muted-foreground">{data?.stakes.length ?? 0} total</span><Button variant="outline" size="icon" aria-label={requestsVisible ? "Hide my requests" : "Show my requests"} aria-expanded={requestsVisible} aria-controls="stake-requests" onClick={() => setRequestsVisible(current => !current)}>{requestsVisible ? <ChevronUp/> : <ChevronDown/>}</Button></div></div>
      <div id="stake-requests" hidden={!requestsVisible} className="mt-4 space-y-3">{(data?.stakes ?? []).map(s => {
        const started = s.activated_at ? new Date(s.activated_at).getTime() : null;
        const end = started ? started + s.lock_days * 86400000 : null;
        const progress = now && started && end ? Math.max(0, Math.min(100, ((now - started) / (end - started)) * 100)) : 0;
        const statusStyle = s.status === 'unstaked' ? 'border-border bg-muted/30 text-muted-foreground' : s.status === 'active' ? 'border-chart-2/40 bg-chart-2/10 text-chart-2' : s.status === 'rejected' ? 'border-destructive/40 bg-destructive/10 text-destructive' : s.status === 'completed' ? 'border-chart-3/40 bg-chart-3/10 text-chart-3' : 'border-primary/40 bg-primary/10 text-primary';
        const StatusIcon = s.status === 'active' || s.status === 'completed' ? CheckCircle2 : s.status === 'rejected' ? XCircle : Clock3;
        return <article key={s.id} className="stake-request p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><strong className="text-lg">{s.package_id}</strong><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle}`}><StatusIcon size={11}/>{s.status}</span></div><p className="numeric mt-1 text-xs text-muted-foreground">Requested {date(s.created_at)}</p></div><div className="text-right"><strong className="numeric block text-xl text-chart-3">{money(Number(s.amount_usd))}</strong><span className="numeric text-xs text-muted-foreground">{number(Number(s.apy) / 12, { maximumFractionDigits: 2 })}% / month · {s.lock_days} days</span></div></div>{s.status === 'active' && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>Lock progress</span><span className="numeric">{Math.round(progress)}%</span></div><div className="stake-progress"><i style={{ width: `${progress}%` }}/></div><div className="mt-2 flex items-center justify-between gap-2"><p className="numeric text-sm font-bold text-chart-2">Live profit ${liveOf(s).toFixed(6)}</p><Button size="sm" variant={s.compound ? 'default' : 'outline'} className="rounded-full text-[11px]" onClick={async () => { try { await toggleCompound({ data: { stakeId: s.id, on: !s.compound } }); txFeedback.success('Compound updated', `Daily compound ${!s.compound ? 'ON' : 'OFF'}`); await refreshAll(); } catch (e) { txFeedback.fail('Compound update failed', e); } }}>Compound {s.compound ? 'ON' : 'OFF'}</Button></div>{end && <p className="numeric mt-2 text-[11px] text-muted-foreground">Unlock estimate: {date(end)}</p>}</div>}{(s.status === 'active' || s.status === 'completed') && <Button variant="outline" size="sm" className="mt-4 w-full rounded-full border-destructive/50 text-destructive" onClick={() => { setUnAgree(false); setUnstaking(s); }}>Unstake {penaltyFor(s) > 0 ? `(−${penaltyFor(s)}% penalty)` : '(no penalty)'}</Button>}{s.status === 'unstaked' && <p className="numeric mt-3 text-[11px] text-muted-foreground">Unstaked {s.unstaked_at ? date(s.unstaked_at) : ''} · penalty {Number(s.penalty_pct)}% · returned {money(Number(s.refund_usd))}</p>}</article>;
      })}{!data?.stakes.length && <div className="stake-request p-8 text-center"><ShieldCheck className="mx-auto text-primary"/><p className="mt-3 text-sm font-bold">No stake requests yet</p><p className="mt-1 text-xs text-muted-foreground">Choose a package above — it activates instantly from your virtual USDT balance.</p></div>}</div>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
      {chosen && <div className="modal-backdrop" onClick={() => setChosen(null)}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black">{chosen.id}</h3><Button variant="ghost" size="icon" onClick={() => setChosen(null)}><X/></Button></div>
        <p className="numeric mt-4 text-4xl font-black text-chart-3">{money(chosen.price_usd)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div>Monthly APY <b className="numeric block text-chart-2">{number(chosen.apy / 12, { maximumFractionDigits: 2 })}% / month</b></div><div>Lock <b className="numeric block">{chosen.lock_days} days</b></div><div>Est. daily <b className="numeric block">${daily(chosen).toFixed(4)}</b></div><div>Est. lock return {chosen.compound ? '(compound)' : ''}<b className="numeric block">{money(chosen.compound ? chosen.price_usd * (Math.pow(1 + chosen.apy / 100 / 365, chosen.lock_days) - 1) : daily(chosen) * chosen.lock_days)}</b></div></div>
        <div className="mt-4 rounded-xl border border-border p-3 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Estimated annual profit</span><b className="numeric">{money(chosen.price_usd * chosen.apy / 100)}</b></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">70% USDT allocation</span><b className="numeric text-chart-2">{money(chosen.price_usd * chosen.apy / 100 * .7)}</b></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">30% BIX allocation</span><b className="numeric text-chart-3">{number(chosen.price_usd * chosen.apy / 100 * .3 / (cfg?.bixMarket.priceUsd ?? .84291), { maximumFractionDigits: 8 })} BIX</b></div></div>
        <p className="mt-4 text-xs text-muted-foreground">{money(chosen.price_usd)} {data?.isAdmin ? 'virtual USDT is deducted instantly and the stake activates immediately (testing balance).' : 'USDT is deducted instantly and the stake activates immediately.'} Displayed profit is an estimate. Your balance: <b className="numeric">{money(bal.data ?? 0)}</b></p>
        {Number(bal.data ?? 0) < Number(chosen.price_usd) && <div role="alert" className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive"><b>Insufficient balance.</b> You need {money(Number(chosen.price_usd) - Number(bal.data ?? 0))} more USDT to activate this package.</div>}
        <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={agree} onChange={e => setAgree(e.target.checked)}/> I agree to the staking terms: lock period, APY estimate and early-unstake penalties.</label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-full" onClick={() => { setChosen(null); setNotice('Stake cancelled — you did not agree.'); }}>Disagree</Button>
          <Button disabled={busy || !agree || Number(bal.data ?? 0) < Number(chosen.price_usd)} className="rounded-full bg-chart-3 text-background" onClick={async () => { if (!(await confirmPin())) return; setBusy(true); try { await submit({ data: { packageId: chosen.id, days: chosen.lock_days, compound: !!chosen.compound } }); setCongrats(chosen); await refreshAll(); } catch (e) { const message = e instanceof Error ? e.message : 'Request failed.'; const m2 = message.toLowerCase().includes('insufficient') ? `Insufficient balance. Add more USDT before staking ${chosen.id}.` : message; setNotice(m2); txFeedback.fail('Staking failed', m2); } setBusy(false); setChosen(null); }}>Agree & stake</Button>
        </div>
      </div></div>}
      {congrats && <div className="modal-backdrop" onClick={() => setCongrats(null)}><div role="dialog" aria-modal="true" className="modal-panel deposit-success text-center" onClick={e => e.stopPropagation()}>
        <CheckCircle2 size={56} className="mx-auto text-chart-2"/>
        <h3 className="mt-4 font-display text-3xl font-black text-chart-2">CONGRATULATION!</h3>
        <p className="mt-2 text-sm">Your <b className="text-chart-3">{congrats.id}</b> stake of <b className="numeric text-chart-3">{money(congrats.price_usd)}</b> was submitted successfully.</p>
        <p className="mt-2 text-xs text-muted-foreground">Your stake is now active.</p>
        <Button className="mt-6 w-full rounded-full bg-chart-2 text-background" onClick={() => setCongrats(null)}>Done</Button>
      </div></div>}
      {unstaking && (() => { const pct = penaltyFor(unstaking); const amt = Number(unstaking.amount_usd); const fee = amt * pct / 100; return <div className="modal-backdrop" onClick={() => setUnstaking(null)}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black text-destructive">Unstake {unstaking.package_id}</h3><Button variant="ghost" size="icon" onClick={() => setUnstaking(null)}><X/></Button></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div>Staked <b className="numeric block">{money(amt)}</b></div><div>Days elapsed <b className="numeric block">{Math.floor(elapsedDays(unstaking))} / {unstaking.lock_days}</b></div><div>Penalty <b className="numeric block text-destructive">{pct}% (−{money(fee)})</b></div><div>You receive <b className="numeric block text-chart-2">{money(amt - fee)}</b></div></div>
        <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs"><b className="text-destructive">Consequences of unstaking early</b><ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground"><li>The penalty is deducted from your principal and cannot be refunded.</li><li>Your stake stops immediately and all future estimated APY profit is forfeited.</li><li>Booster / referral qualification based on this stake may be lost.</li><li>This action is final — to stake again you must start a new lock period.</li></ul>
          <p className="mt-2 text-muted-foreground">Penalty schedule: {tiers.map(t => `<${t.days}d ${t.pct}%`).join(' · ')} · after lock ends 0%</p></div>
        <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={unAgree} onChange={e => setUnAgree(e.target.checked)}/> I understand the consequences and accept the {pct}% penalty.</label>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="outline" className="rounded-full" onClick={() => setUnstaking(null)}>Keep staking</Button><Button variant="destructive" disabled={busy || !unAgree} className="rounded-full" onClick={async () => { if (!(await confirmPin())) return; setBusy(true); try { const r = await doUnstake({ data: { stakeId: unstaking.id } }); if (r.nft) { setNotice('Contract completed — your principal is now held by your Reactor NFT card. Sell it to the owner for BIX in My NFT collection.'); txFeedback.success('Contract completed', 'Principal moved to your NFT card.'); await qc.invalidateQueries({ queryKey: ['my-nfts'] }); } else setNotice(`Unstaked — ${money(Number(r.refund_usd))} returned to your USDT balance (penalty ${r.penalty_pct}%).`); if (!r.nft) txFeedback.success('Unstake completed', `${money(Number(r.refund_usd))} returned (penalty ${r.penalty_pct}%).`); await refreshAll(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Unstake failed.'); txFeedback.fail('Unstake failed', e); } setBusy(false); setUnstaking(null); }}>Confirm unstake</Button></div>
      </div></div>; })()}
    </MemberGate>
  </main></BixShell>;
}
