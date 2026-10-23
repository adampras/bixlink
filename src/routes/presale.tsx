import { createFileRoute, Link } from '@tanstack/react-router';
import heroLux from '@/assets/presale-hero-lux.jpg';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { buyPresale, getPresaleStatus } from '@/lib/presale.functions';
import { presaleReleased, presalePrice } from '@/lib/presale';
import { ProfitSimulator } from '@/components/ProfitSimulator';
import { PresaleCommission } from '@/components/PresaleCommission';
import { GenesisCertificate, PresaleStrategies } from '@/components/PresaleStrategies';
import { SovereignAllocation } from '@/components/SovereignAllocation';
import { WhaleDesk } from '@/components/InstitutionalSuite';
import { DEFAULT_STRATEGIES, dividendSettled, type PresaleStrategy } from '@/lib/presale-strategy';
import { number } from '@/lib/bixlink';
import { Eye, Lock, Pickaxe, ShieldCheck, Users, Volume2, VolumeX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { txFeedback } from '@/components/TxFeedback';
import { BadgeCheck } from 'lucide-react';
import { NFT_ART, NFT_NAME, type NftTier } from '@/lib/nft';
import { PresalePurchaseDialog, type PresaleSelection } from '@/components/PresalePurchaseDialog';
import { strategyQuote } from '@/lib/presale-strategy';
import { poolAvailability } from '@/lib/marketing';
import { maxCapLabel } from '@/lib/max-cap';
import { valueCard } from '@/lib/value-cards';
const presaleArtTier = (usd: number): NftTier => usd >= 30000 ? 'MYTHIC' : usd >= 10000 ? 'LEGENDARY' : usd >= 5000 ? 'EPIC' : usd >= 1000 ? 'RARE' : 'COMMON';

export const Route = createFileRoute('/presale')({ head: () => ({ meta: [{ title: 'BIX Presale Staking — BIXLINK' }, { name: 'description', content: 'Exclusive BIX presale staking packages with locked BIX released through mining.' }, { property: 'og:title', content: 'BIX Presale Staking — BIXLINK' }, { property: 'og:description', content: 'Genesis presale with Hybrid, Dividend and Founder strategies plus the 21-slot $100,000 Sovereign allocation.' }, { property: 'og:type', content: 'website' }, { property: 'og:image', content: 'https://bixlink.lovable.app/__l5e/assets-v1/29bee76b-8e1c-4141-8057-8a3048d46598/presale-rocket-dark-poster.jpg' }, { name: 'twitter:card', content: 'summary_large_image' }, { name: 'twitter:image', content: 'https://bixlink.lovable.app/__l5e/assets-v1/29bee76b-8e1c-4141-8057-8a3048d46598/presale-rocket-dark-poster.jpg' }] }), component: PresalePage });

const TAB_LABEL = { packages: 'Packages', strategies: 'Strategies', calculator: 'Calculator', portfolio: 'My Portfolio' } as const;
const GROUPS = [{ name: 'ENTRY', range: '$500 – $5,000', min: 0, max: 7000 }, { name: 'PREMIUM', range: '$7,000 – $30,000', min: 7000, max: 50000 }, { name: 'PRIVATE ALLOCATION', range: '$50,000 – $70,000', min: 50000, max: 100000 }];

function PresalePage() {
  const { user, data: me } = useMember();
  const load = useServerFn(getPresaleStatus); const buy = useServerFn(buyPresale);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['presale', user?.id], queryFn: () => load(), enabled: !!user });
  const [now, setNow] = useState(() => Date.now()); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<'packages' | 'strategies' | 'calculator' | 'portfolio'>('packages');

  const [selection, setSelection] = useState<PresaleSelection | null>(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [receipt, setReceipt] = useState<{ usd: number; bix: number; serial: number; dailyUsd: number } | null>(null);
  const [nftPreview, setNftPreview] = useState<NftTier | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = q.data; const cfg = s?.config;
  const pool = poolAvailability(cfg?.poolCap ?? 0, s?.poolUsed ?? 0);
  const orders = (s?.orders ?? []).filter(o => o.status === 'locked');
  const locked = orders.reduce((n, o) => n + Number(o.bix_amount), 0) + (s?.sponsorRewards ?? []).filter(r => r.status === 'locked').reduce((n, r) => n + Number(r.bix), 0);
  const released = orders.reduce((n, o) => n + presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now), 0)
    + (s?.sponsorRewards ?? []).filter(r => r.status === 'locked').reduce((n, r) => n + presaleReleased(Number(r.bix), r.release_days, r.created_at, now), 0);
  const onBuy = (usd: number, strategy: 'standard' | PresaleStrategy = 'standard') => {
    const pkg = cfg?.sovereign?.usd === usd ? cfg.sovereign : cfg?.packages.find(p => p.usd === usd);
    if (!pkg) return;
    const quote = strategy === 'standard' ? { bix: pkg.bix, dailyUsd: 0 } : strategyQuote(strategy, usd, pkg.bix, pkg.releaseDays, cfg?.strategies ?? DEFAULT_STRATEGIES);
    setPurchaseError('');
    setSelection({ usd, strategy, bix: quote.bix, dailyUsd: quote.dailyUsd, days: pkg.releaseDays, artwork: valueCard(usd)?.url ?? NFT_ART[presaleArtTier(usd)] });
  };
  const confirmBuy = async () => {
    if (!selection || busy !== null) return;
    const { usd, strategy } = selection;
    setBusy(usd); setMsg('');
    try { const r = await buy({ data: { usd, strategy: strategy as 'standard' | PresaleStrategy } }); setMsg(`Locked ${number(r.bix)} BIX · Genesis certificate #GEN-${String(r.serial ?? 0).padStart(4, '0')}${r.dailyUsd > 0 ? ` · $${number(r.dailyUsd, { maximumFractionDigits: 2 })}/day USDT` : ''}.`); setReceipt({ usd, bix: Number(r.bix), serial: Number(r.serial ?? 0), dailyUsd: Number(r.dailyUsd ?? 0) }); txFeedback.success('Presale purchase successful', `${number(r.bix)} BIX locked.`); setSelection(null); await Promise.all([qc.invalidateQueries({ queryKey: ['presale'] }), qc.invalidateQueries({ queryKey: ['my-wallet'] }), qc.invalidateQueries({ queryKey: ['my-bixlink'] })]); }
    catch (e) { setPurchaseError(e instanceof Error ? e.message : 'Purchase failed'); } finally { setBusy(null); }
  };
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
    <div className="eyebrow"><Pickaxe size={14}/> EXCLUSIVE</div>
    <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">BIX <span className="text-chart-3">PRESALE</span></h1>
    <p className="mt-1 text-sm text-muted-foreground">Genesis allocation with locked BIX released over time.</p>
    <section className="relative mt-4 overflow-hidden rounded-2xl border border-chart-3/40 bg-card">
      <img src={heroLux} alt="BIXLINK Genesis Presale gold fox coin" width={1280} height={768} className="h-56 w-full object-cover sm:h-80"/>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"/>
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <p className="text-[10px] font-bold tracking-[0.3em] text-chart-3">GENESIS ROUND 1</p>
        <h2 className="font-display text-xl font-black text-foreground sm:text-3xl">Exclusive Presale · $0.50 / BIX</h2>
        <div className="mt-3 flex gap-2">
          <Button className="flex-1 rounded-lg" onClick={() => setTab('packages')}>Presale packages</Button>
          <Button asChild variant="outline" className="flex-1 rounded-lg border-chart-3 text-chart-3"><Link to="/boost">BOOST APY</Link></Button>
        </div>
      </div>
    </section>
    <dl className="pro-only mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
      <div><dd className="numeric font-display text-lg font-bold text-primary">{number(locked, { maximumFractionDigits: 2 })}</dd><dt className="text-[10px] text-muted-foreground">Locked BIX</dt></div>
      <div><dd className="numeric font-display text-lg font-bold text-chart-2">{number(released, { maximumFractionDigits: 4 })}</dd><dt className="text-[10px] text-muted-foreground">Mined out</dt></div>
      <div><dd className="numeric font-display text-lg font-bold text-chart-3">{cfg?.sponsorPct ?? 10}%</dd><dt className="text-[10px] text-muted-foreground">Sponsor</dt></div>
    </dl>
    <p className="mt-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary">Round 1 Presale · 1 BIX = $0.50 USDT · Pool cap 3,150,000 BIX</p>
    {!user ? <p className="mt-6 text-sm text-muted-foreground">Sign in to view presale packages.</p> : !cfg ? <p className="mt-6 text-sm text-muted-foreground">Loading…</p> : <>
      {!cfg.enabled && <p className="mt-6 rounded-lg border border-chart-3 p-3 text-sm text-chart-3">Presale is currently closed by the owner.</p>}
      <section aria-label="Presale pool availability" className="mt-5 border-y border-border py-4"><div className="flex flex-wrap justify-between gap-2 text-xs"><b>Shared presale allocation</b><span className="numeric">{number(pool.remaining)} BIX remaining</span></div><progress className="allocation-progress mt-3" max={100} value={pool.percent}/><p className="mt-2 text-[10px] text-muted-foreground">Recorded pool usage · shared across all packages · not a guaranteed reservation.</p></section>
      <nav className="presale-tabs mt-6" role="tablist">{(['packages','strategies','calculator','portfolio'] as const).map(t => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={tab === t ? 'is-active' : ''}>{TAB_LABEL[t]}</button>)}</nav>
      {tab === 'packages' && <>
        {GROUPS.map(g => { const list = cfg.packages.filter(p => p.usd >= g.min && p.usd < g.max); if (!list.length) return null; return <section key={g.name} className="mt-6">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-base font-black tracking-wide">{g.name}</h2><span className="text-[11px] text-muted-foreground">{g.range}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">{list.map(p => { const tier = presaleArtTier(p.usd); return <article key={p.usd} className="presale-lux-card presale-card-uniform">
            <div className="presale-lux-inner flex h-full flex-col">
              {valueCard(p.usd) && <img src={valueCard(p.usd)!.url} alt={`${valueCard(p.usd)!.name} NFT $${number(p.usd)}`} loading="lazy" className="value-nft mb-3"/>}
              <div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-bold text-muted-foreground">{valueCard(p.usd) ? `${valueCard(p.usd)!.name.toUpperCase()} NFT` : `${NFT_NAME[tier].toUpperCase()} · ${tier}`}</span>{!valueCard(p.usd) && <button type="button" className="nft-preview-chip" onClick={() => setNftPreview(tier)}><Eye size={12}/> NFT</button>}</div>
              <h3 className="presale-lux-price numeric font-display text-[clamp(1.25rem,5.5vw,1.875rem)] font-black">${number(p.usd)}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Total BIX</dt><dd className="numeric font-bold text-primary"><Lock size={11} className="inline"/> {number(p.bix)}</dd></div><div><dt className="text-muted-foreground">Release</dt><dd className="numeric font-bold">{p.releaseDays} days</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Earnings limit</dt><dd className="numeric font-bold text-chart-3">{maxCapLabel(p.usd)}</dd></div></dl>
              <Button className="mt-auto w-full rounded-lg" disabled={!cfg.enabled || busy !== null} onClick={() => onBuy(p.usd)}>{busy === p.usd ? 'Processing…' : 'Buy package'}</Button>
            </div>
          </article>; })}</div>
        </section>; })}
        {cfg.sovereign && <SovereignAllocation cfg={cfg.sovereign} claimed={Number(s?.sovereignClaimed ?? 0)} settings={cfg.strategies} open={cfg.enabled} busy={busy !== null} onBuy={onBuy}/>}
        <WhaleDesk/>
      </>}
      {tab === 'strategies' && <PresaleStrategies packages={cfg.packages} settings={cfg.strategies} open={cfg.enabled} busy={busy !== null} onBuy={onBuy}/>}
      {tab === 'calculator' && <ProfitSimulator price={presalePrice(cfg.packages)} days={cfg.packages[0]?.releaseDays ?? 180} settings={cfg.strategies ?? DEFAULT_STRATEGIES}/>}
      {tab === 'portfolio' && <>
        <PresaleCommission rewards={s?.sponsorRewards ?? []} code={(me as any)?.referral?.code} now={now}/>
        {Number(s?.dividendEarned ?? 0) > 0 && <p className="mt-3 text-xs text-chart-2">USDT dividends credited so far: <b className="numeric">${number(Number(s?.dividendEarned), { maximumFractionDigits: 2 })}</b></p>}
        {orders.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No presale positions yet.</p>}
      </>}
      <p className="mt-4 text-xs text-muted-foreground">USDT balance: <b className="numeric">${number(Number(s?.balanceUsd ?? 0), { maximumFractionDigits: 2 })}</b> · Pool used {number(Number(s?.poolUsed ?? 0))} / {number(cfg.poolCap)} BIX</p>
      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
      {tab === 'portfolio' && orders.length > 0 && <section className="mt-8"><h2 className="font-display text-lg font-black">My presale positions</h2><div className="mt-3 grid gap-2">{orders.map(o => { const r = presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now); return <div key={o.id} className="rounded-lg border border-border p-3 text-xs"><div className="flex justify-between"><b>${number(Number(o.package_usd))} · {o.strategy ?? 'standard'}</b><span className="numeric">{number(r, { maximumFractionDigits: 4 })} / {number(Number(o.bix_amount))} BIX</span></div><div className="apy-meter mt-2"><i style={{ width: `${Math.min(100, r / Number(o.bix_amount) * 100)}%` }}/></div>{Number(o.dividend_daily_usd ?? 0) > 0 && <p className="mt-1 text-muted-foreground">USDT dividend: ${number(dividendSettled(Number(o.dividend_daily_usd), o.release_days, o.created_at, now), { maximumFractionDigits: 2 })} credited</p>}</div>; })}</div>
        <h2 className="mt-8 font-display text-lg font-black">My Genesis certificates</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{orders.map(o => <GenesisCertificate key={o.id} usd={Number(o.package_usd)} serial={o.serial} strategy={o.strategy} bix={Number(o.bix_amount)}/>)}</div>
      </section>}
      {(s?.sponsorRewards?.length ?? 0) > 0 && <p className="mt-6 text-xs text-muted-foreground"><Users size={13} className="inline"/> Sponsor rewards: {s?.sponsorRewards?.length} referral purchases, released on the same mining schedule.</p>}
    </>}
    <p className="terminal-disclosure mt-8"><ShieldCheck size={14}/> No guarantee of profit. Presale BIX is an internal ledger allocation, not an on-chain token. Mined-out BIX is shown for tracking and is not spendable until the owner opens settlement. Sponsor bonus goes only to your direct referrer.</p>
    <PresalePurchaseDialog selection={selection} balance={Number(s?.balanceUsd ?? 0)} busy={busy !== null} error={purchaseError} onClose={() => setSelection(null)} onConfirm={confirmBuy}/>
    <Dialog open={receipt !== null} onOpenChange={open => { if (!open) setReceipt(null); }}>
      <DialogContent className="max-w-sm border-chart-3 text-center">
        {receipt && <>
          <BadgeCheck size={44} className="mx-auto text-chart-3"/>
          <DialogTitle className="font-display text-xl font-black text-chart-3">Purchase successful</DialogTitle>
          <DialogDescription className="text-xs">Your Genesis allocation is confirmed and recorded.</DialogDescription>
          <dl className="mt-2 text-left text-sm">
            <div className="flex justify-between border-t border-border py-2"><dt className="text-muted-foreground">Certificate</dt><dd className="numeric font-bold">#GEN-{String(receipt.serial).padStart(4, '0')}</dd></div>
            <div className="flex justify-between border-t border-border py-2"><dt className="text-muted-foreground">Paid</dt><dd className="numeric font-bold">{number(receipt.usd)} USDT</dd></div>
            <div className="flex justify-between border-t border-border py-2"><dt className="text-muted-foreground">Locked BIX</dt><dd className="numeric font-bold text-primary">{number(receipt.bix)} BIX</dd></div>
            {receipt.dailyUsd > 0 && <div className="flex justify-between border-y border-border py-2"><dt className="text-muted-foreground">USDT daily terms</dt><dd className="numeric">{number(receipt.dailyUsd, { maximumFractionDigits: 2 })} USDT</dd></div>}
          </dl>
          <Button className="mt-3 w-full" onClick={() => { setReceipt(null); setTab('portfolio'); }}>View my portfolio</Button>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={nftPreview !== null} onOpenChange={open => { if (!open) setNftPreview(null); }}>
      <DialogContent className="nft-preview-dialog">
        {nftPreview && <><img src={NFT_ART[nftPreview]} alt={`${NFT_NAME[nftPreview]} certificate artwork`}/><div className="p-4"><DialogTitle className="font-display text-base">{NFT_NAME[nftPreview]} · {nftPreview}</DialogTitle><DialogDescription className="mt-1 text-xs">In-app certificate artwork issued with this allocation. Not an on-chain NFT.</DialogDescription></div></>}
      </DialogContent>
    </Dialog>
  </main></BixShell>;
}
