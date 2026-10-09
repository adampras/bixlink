import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { buyPresale, getPresaleStatus } from '@/lib/presale.functions';
import { presaleReleased } from '@/lib/presale';
import { number } from '@/lib/bixlink';
import { Lock, Pickaxe, ShieldCheck, Users, Volume2, VolumeX } from 'lucide-react';
import reactor from '@/assets/presale-rocket-dark.mp4.asset.json';
import reactorWebm from '@/assets/presale-rocket-dark.webm.asset.json';
import reactorPoster from '@/assets/presale-rocket-dark-poster.jpg.asset.json';

export const Route = createFileRoute('/presale')({ head: () => ({ meta: [{ title: 'BIX Presale Staking — BIXLINK' }, { name: 'description', content: 'Exclusive BIX presale staking packages with locked BIX released through mining.' }, { property: 'og:title', content: 'BIX Presale Staking — BIXLINK' }, { property: 'og:description', content: 'Four presale packages: $500, $1,000, $5,000 and $10,000 with mining-based BIX release.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: PresalePage });

function PresalePage() {
  const { user } = useMember();
  const load = useServerFn(getPresaleStatus); const buy = useServerFn(buyPresale);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['presale', user?.id], queryFn: () => load(), enabled: !!user });
  const [now, setNow] = useState(() => Date.now()); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState<number | null>(null);
  const [sound, setSound] = useState(false); const vidRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (vidRef.current) vidRef.current.muted = !sound; }, [sound]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = q.data; const cfg = s?.config;
  const orders = (s?.orders ?? []).filter(o => o.status === 'locked');
  const locked = orders.reduce((n, o) => n + Number(o.bix_amount), 0) + (s?.sponsorRewards ?? []).filter(r => r.status === 'locked').reduce((n, r) => n + Number(r.bix), 0);
  const released = orders.reduce((n, o) => n + presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now), 0)
    + (s?.sponsorRewards ?? []).filter(r => r.status === 'locked').reduce((n, r) => n + presaleReleased(Number(r.bix), r.release_days, r.created_at, now), 0);
  const onBuy = async (usd: number) => {
    if (!window.confirm(`Buy the $${number(usd)} presale package from your USDT balance?`)) return;
    setBusy(usd); setMsg('');
    try { const r = await buy({ data: { usd } }); setMsg(`Locked ${number(r.bix)} BIX. Release starts now.`); await qc.invalidateQueries({ queryKey: ['presale'] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Purchase failed'); } finally { setBusy(null); }
  };
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
    <div className="eyebrow"><Pickaxe size={14}/> EXCLUSIVE</div>
    <h1 className="section-title !mt-1">PRESALE <span>STAKING BIX</span></h1>
    <div className="presale-reactor-stage">
      <video ref={vidRef} autoPlay muted loop playsInline preload="metadata" poster={reactorPoster.url} className="presale-reactor-video" aria-label="BIXLINK presale rocket launch">
        <source src={reactorWebm.url} type="video/webm"/>
        <source src={reactor.url} type="video/mp4"/>
      </video>
      <button type="button" className="presale-sound-toggle" aria-label={sound ? 'Mute reactor sound' : 'Unmute reactor sound'} onClick={() => setSound(v => !v)}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}</button>
    </div>
    <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
      <div><dd className="numeric font-display text-lg font-bold text-primary">{number(locked, { maximumFractionDigits: 2 })}</dd><dt className="text-[10px] text-muted-foreground">Locked BIX</dt></div>
      <div><dd className="numeric font-display text-lg font-bold text-chart-2">{number(released, { maximumFractionDigits: 4 })}</dd><dt className="text-[10px] text-muted-foreground">Mined out</dt></div>
      <div><dd className="numeric font-display text-lg font-bold text-chart-3">{cfg?.sponsorPct ?? 10}%</dd><dt className="text-[10px] text-muted-foreground">Sponsor</dt></div>
    </dl>
    {!user ? <p className="mt-6 text-sm text-muted-foreground">Sign in to view presale packages.</p> : !cfg ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> : <>
      {!cfg.enabled && <p className="mt-6 rounded-lg border border-chart-3 p-3 text-sm text-chart-3">Presale is currently closed by the owner.</p>}
      <p className="mt-4 text-xs text-muted-foreground">USDT balance: <b className="numeric">${number(Number(s?.balanceUsd ?? 0), { maximumFractionDigits: 2 })}</b> · Pool used {number(Number(s?.poolUsed ?? 0))} / {number(cfg.poolCap)} BIX</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cfg.packages.map(p => <article key={p.usd} className="rounded-2xl border border-border bg-card/60 p-5">
        <span className="text-[10px] font-bold text-muted-foreground">PRESALE PACKAGE</span>
        <h3 className="numeric font-display text-3xl font-black">${number(p.usd)}</h3>
        <p className="mt-2 text-sm"><Lock size={13} className="inline"/> <b className="numeric text-primary">{number(p.bix)} BIX</b> instantly locked</p>
        <p className="text-xs text-muted-foreground">Released by mining over {p.releaseDays} days</p>
        <Button className="mt-4 w-full rounded-full" disabled={!cfg.enabled || busy !== null} onClick={() => onBuy(p.usd)}>{busy === p.usd ? 'Processing…' : 'Buy package'}</Button>
      </article>)}</div>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      {orders.length > 0 && <section className="mt-8"><h2 className="font-display text-lg font-black">My presale positions</h2><div className="mt-3 grid gap-2">{orders.map(o => { const r = presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now); return <div key={o.id} className="rounded-lg border border-border p-3 text-xs"><div className="flex justify-between"><b>${number(Number(o.package_usd))}</b><span className="numeric">{number(r, { maximumFractionDigits: 4 })} / {number(Number(o.bix_amount))} BIX</span></div><div className="apy-meter mt-2"><i style={{ width: `${Math.min(100, r / Number(o.bix_amount) * 100)}%` }}/></div></div>; })}</div></section>}
      {(s?.sponsorRewards.length ?? 0) > 0 && <p className="mt-6 text-xs text-muted-foreground"><Users size={13} className="inline"/> Sponsor rewards: {s!.sponsorRewards.length} referral purchases, released on the same mining schedule.</p>}
    </>}
    <p className="terminal-disclosure mt-8"><ShieldCheck size={14}/> No guarantee of profit. Presale BIX is an internal ledger allocation, not an on-chain token. Mined-out BIX is shown for tracking and is not spendable until the owner opens settlement. Sponsor bonus goes only to your direct referrer.</p>
  </main></BixShell>;
}
