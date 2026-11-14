import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { DeveloperCovenant } from '@/components/DeveloperCovenant';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { buyPresaleFlex, getPresaleStatus } from '@/lib/presale.functions';
import { getPresaleWallets, payPresaleTx } from '@/lib/presale-pay.functions';
import { QRCodeSVG } from 'qrcode.react';
import { presaleReleased } from '@/lib/presale';
import { supabase } from '@/integrations/supabase/client';
import { PHASE1, bixFor, clampUsd, countdown } from '@/lib/presale-phase';
import { number } from '@/lib/bixlink';
import coin from '@/assets/bixcoin-cutout.webp';
import { CalendarClock, Coins, Copy, Lock, ShieldCheck, Unlock, Wallet } from 'lucide-react';

export const Route = createFileRoute('/presale')({ head: () => ({ meta: [
  { title: 'BIX Presale Phase 1 — $0.25 per BIX | BIXLINK' },
  { name: 'description', content: 'BIX Presale Phase 1: $0.25 per BIX, $100–$1,000 allocation, 1% daily vesting over 100 days.' },
  { property: 'og:title', content: 'BIX Presale Phase 1 — BIXLINK' },
  { property: 'og:description', content: 'Acquire BIX at $0.25, released 1% daily over 100 days. Open for 2 months.' },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: PresalePage });

const QUICK = [100, 250, 500, 1000];

function PresalePage() {
  const { user } = useMember();
  const load = useServerFn(getPresaleStatus); const buy = useServerFn(buyPresaleFlex); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['presale', user?.id], queryFn: () => load(), enabled: !!user });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [usd, setUsd] = useState(500); const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const loadW = useServerFn(getPresaleWallets); const pay = useServerFn(payPresaleTx);
  const wq = useQuery({ queryKey: ['presale-wallets', user?.id], queryFn: () => loadW(), enabled: !!user });
  const wallets = wq.data ?? []; const [wi, setWi] = useState(0); const w = wallets[Math.min(wi, Math.max(0, wallets.length - 1))];
  const [receipt, setReceipt] = useState<null | { usd: number; bix: number; serial?: number; via: string; extra?: number; test?: boolean }>(null);
  const [tx, setTx] = useState(''); const [copied, setCopied] = useState(false);
  const doPay = async () => {
    if (!w) return; setBusy(true); setErr(''); setMsg(''); setReceipt(null);
    try { const r = await pay({ data: { walletCode: w.code, txHash: tx.trim() } }); setReceipt({ usd: r.usd, bix: Number(r.bix), serial: (r as any).serial, via: 'On-chain USDT (BEP-20)', extra: r.extra }); setMsg(`Verified! $${r.usd} → ${number(Number(r.bix))} BIX locked${r.extra > 0 ? ` · $${number(r.extra, { maximumFractionDigits: 2 })} extra added to your USDT balance` : ''}.`); setTx(''); qc.invalidateQueries({ queryKey: ['presale'] }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Verification failed'); } finally { setBusy(false); }
  };
  const s = q.data; const cfg = s?.config;
  const stage = cfg?.stages?.[cfg.activeStage ?? 0];
  const price = stage?.price ?? PHASE1.price;
  const startsAt = stage?.startsAt ?? PHASE1.startsAt; const endsAt = stage?.endsAt ?? PHASE1.endsAt;
  const phase = now < Date.parse(startsAt) ? 'upcoming' : now >= Date.parse(endsAt) ? 'ended' : 'live';
  const cd = countdown(phase === 'upcoming' ? startsAt : endsAt, now);
  const bix = bixFor(usd, price); const daily = bix * PHASE1.dailyPct / 100;
  const orders = (s?.orders ?? []).filter(o => o.status === 'locked');
  const totalBix = orders.reduce((n, o) => n + Number(o.bix_amount), 0);
  const unlocked = orders.reduce((n, o) => n + presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now), 0);
  const balance = Number(s?.balanceUsd ?? 0);
  const canBuy = !!cfg?.enabled && phase === 'live' && !busy;

  const tq = useQuery({ queryKey: ['presale-test', user?.id], enabled: !!user, queryFn: async () => (await supabase.rpc('bix_presale_test_state' as never)).data as { enabled?: boolean; allowed?: boolean } | null });
  const doTest = async () => {
    setBusy(true); setErr(''); setMsg(''); setReceipt(null);
    const { data, error } = await supabase.rpc('bix_presale_test_buy' as never, { p_usd: usd } as never);
    setBusy(false);
    if (error) return setErr(error.message);
    setReceipt({ usd, bix: Number((data as { bix?: number }).bix ?? 0), via: 'Virtual test wallet', test: true }); setMsg(`TEST: ${number(Number((data as { bix?: number }).bix ?? 0))} BIX virtual order recorded — no balance moved.`); qc.invalidateQueries({ queryKey: ['presale'] });
  };
  const doBuy = async () => {
    setBusy(true); setErr(''); setMsg(''); setReceipt(null);
    try { const r = await buy({ data: { usd } }); setReceipt({ usd, bix: Number(r.bix), serial: r.serial, via: 'USDT balance' }); setMsg(`Success! ${number(Number(r.bix))} BIX locked · ${PHASE1.dailyPct}% released daily.`); setConfirm(false); qc.invalidateQueries({ queryKey: ['presale'] }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Purchase failed'); } finally { setBusy(false); }
  };

  return <BixShell><main className="presale-lux mx-auto max-w-2xl px-4 py-6">
    <section className="relative overflow-hidden rounded-3xl border border-chart-3/40 bg-card/70 p-5 backdrop-blur">
      <p className="text-[10px] font-bold tracking-[0.3em] text-chart-3">BIX PRESALE · PHASE 1</p>
      <div className="mt-2 flex items-center gap-4"><img src={coin} alt="BIXCOIN logo" className="presale-coin" width={76} height={76}/><div className="min-w-0"><h1 className="font-display text-3xl font-black">Acquire BIX at <span className="text-chart-3">${price.toFixed(2)}</span></h1>
      <p className="mt-1 text-xs text-muted-foreground">Equal to the developer buyback floor. Every $1 = {number(bixFor(1, price))} BIX.</p></div></div>
      <div className="mt-4 flex items-center gap-3">
        <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-bold text-primary">{phase === 'upcoming' ? 'OPENS IN' : phase === 'live' ? 'ENDS IN' : 'PHASE 1 ENDED'}</span>
        {phase !== 'ended' && <div className="grid flex-1 grid-cols-4 gap-1.5">{cd.map((v, i) => <div key={i} className="rounded-xl border border-border bg-background/60 py-1 text-center"><b className="numeric block font-display">{String(v).padStart(2, '0')}</b><span className="text-[9px] text-muted-foreground">{['DAYS', 'HRS', 'MIN', 'SEC'][i]}</span></div>)}</div>}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">14 Nov 2026 00:00 WIB – 14 Jan 2027 00:00 WIB</p>
    </section>

    <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
      {[[Coins, '1. Choose amount', '$100 – $1,000'], [Lock, '2. BIX locked', `${number(bixFor(1000, price))} BIX max`], [Unlock, '3. Daily release', `${PHASE1.dailyPct}% × ${PHASE1.vestingDays} days`]].map(([I, t, d]: any) => <li key={t} className="rounded-2xl border border-border bg-card/50 p-3"><I size={18} className="mx-auto text-primary"/><b className="mt-1 block">{t}</b><span className="text-muted-foreground">{d}</span></li>)}
    </ol>

    {!user ? <div className="mt-6 rounded-2xl border border-border p-5 text-center"><p className="text-sm">Sign in to join the presale.</p><Button asChild className="mt-3 rounded-full"><Link to="/auth">Sign in / Register</Link></Button></div> : <>
      <section className="mt-6 rounded-3xl border border-primary/40 bg-card/70 p-5">
        <h2 className="font-display text-lg font-black">Presale Allocation</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">{QUICK.map(v => <button key={v} type="button" onClick={() => setUsd(v)} className={`rounded-xl border py-2 text-sm font-bold ${usd === v ? 'border-chart-3 bg-chart-3/15 text-chart-3' : 'border-border'}`}>${v}</button>)}</div>
        <input type="range" min={PHASE1.min} max={PHASE1.max} step={10} value={usd} onChange={e => setUsd(Number(e.target.value))} className="mt-4 w-full accent-[var(--primary)]" aria-label="USDT amount"/>
        <label className="mt-2 flex items-center gap-2 text-xs">Amount (USDT)<input type="number" min={PHASE1.min} max={PHASE1.max} value={usd} onChange={e => setUsd(Number(e.target.value))} onBlur={() => setUsd(clampUsd(usd))} className="numeric w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"/></label>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-background/60 p-3"><dt className="text-[10px] text-muted-foreground">You receive</dt><dd className="numeric font-display text-2xl font-black text-chart-3">{number(bix)} BIX</dd></div>
          <div className="rounded-2xl bg-background/60 p-3"><dt className="text-[10px] text-muted-foreground">Released per day</dt><dd className="numeric font-display text-2xl font-black text-primary">{number(daily, { maximumFractionDigits: 2 })} BIX</dd></div>
        </dl>
        {tq.data?.allowed && tq.data?.enabled && <button type="button" disabled={busy} onClick={doTest} className="mt-3 w-full rounded-full border border-dashed border-primary py-2 text-xs font-black text-primary">TEST BUY · virtual wallet ${usd}</button>}
        <p className="mt-3 text-[11px] text-muted-foreground">USDT balance: <b className="numeric">${number(balance, { maximumFractionDigits: 2 })}</b></p>
        {!confirm ? <Button className="mt-4 h-12 w-full rounded-full text-base font-black presale-solid-btn" disabled={!canBuy || usd < PHASE1.min || usd > PHASE1.max} onClick={() => { setErr(''); setConfirm(true); }}>{phase === 'upcoming' ? 'Not open yet' : phase === 'ended' ? 'Phase 1 ended' : !cfg?.enabled ? 'Presale closed' : `Buy ${number(bix)} BIX`}</Button>
          : <div className="mt-4 rounded-2xl border border-chart-3/50 p-3 text-sm"><p>Confirm: pay <b>${usd} USDT</b> for <b>{number(bix)} BIX</b>, locked and released {PHASE1.dailyPct}% per day over {PHASE1.vestingDays} days.</p>
            <div className="mt-3 flex gap-2"><Button variant="outline" className="flex-1 rounded-full" onClick={() => setConfirm(false)} disabled={busy}>Cancel</Button><Button className="flex-1 rounded-full presale-solid-btn" onClick={doBuy} disabled={busy}>{busy ? 'Processing…' : 'Confirm'}</Button></div></div>}
        <div className="mt-5 rounded-2xl border border-chart-3/40 bg-background/50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black"><Wallet size={16} className="text-chart-3"/> Pay directly with USDT (BEP-20)</h3>
          {wq.isLoading ? <p className="mt-2 text-xs text-muted-foreground">Loading official wallets…</p> : !wallets.length ? <p className="mt-2 text-xs text-muted-foreground">No official presale wallet is active for your network yet.</p> : <>
            {wallets.length > 1 && <div className="mt-3 grid grid-cols-5 gap-1.5">{wallets.map((x, i) => <button key={x.code} type="button" onClick={() => setWi(i)} aria-label={`Official wallet ending ${x.address.slice(-4)}`} className={`numeric rounded-xl border py-2 font-mono text-[10px] font-bold ${i === wi ? 'border-chart-3 bg-chart-3/15 text-chart-3' : 'border-border'}`}>…{x.address.slice(-4)}</button>)}</div>}
            {w && <>
              <p className="mt-3 text-center text-xs font-bold">Official BIXLINK wallet · BEP-20</p>
              <div className="mx-auto mt-3 w-fit rounded-2xl bg-[var(--color-foreground,#fff)] p-3"><QRCodeSVG value={w.address} size={150}/></div>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(w.address); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mt-3 flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left"><span className="min-w-0 flex-1 break-all font-mono text-[11px]">{w.address}</span><Copy size={14} className="shrink-0 text-chart-3"/><span className="text-[10px] font-bold">{copied ? 'Copied' : 'Copy'}</span></button>
              <ol className="mt-3 grid gap-1 text-[11px] text-muted-foreground"><li>1. Send exactly <b className="text-foreground">${usd} USDT</b> on <b className="text-foreground">BNB Smart Chain (BEP-20)</b> to this address.</li><li>2. Paste the transaction hash (TxID) below.</li><li>3. Tap Verify — your BIX is locked and vesting starts.</li></ol>
              <input value={tx} onChange={e => setTx(e.target.value)} placeholder="TxID 0x…" className="numeric mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs" aria-label="Transaction hash"/>
              <Button className="mt-3 h-11 w-full rounded-full font-black presale-solid-btn" disabled={!canBuy || !/^0x[0-9a-fA-F]{64}$/.test(tx.trim())} onClick={doPay}>{busy ? 'Verifying on-chain…' : 'Verify payment & buy BIX'}</Button>
              <p className="mt-2 text-[10px] text-muted-foreground">Max $1,000 per purchase; any extra is added to your USDT balance. Each TxID can be used once.</p>
            </>}
          </>}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">— or pay from your USDT balance above —</p>
        </div>
        {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        {msg && !receipt && <p role="status" className="mt-3 text-sm text-chart-2">{msg}</p>}
        {receipt && <div role="status" className="presale-receipt mt-4">
          <div className="presale-receipt-check" aria-hidden>✓</div>
          <p className="lux-kicker text-center">{receipt.test ? 'TEST PURCHASE RECORDED' : 'PURCHASE SUCCESSFUL'}</p>
          <h3 className="lux-gold-text text-center font-display text-2xl font-black numeric">{number(receipt.bix)} BIX</h3>
          <p className="text-center text-[11px] text-foreground/80">Your BIX is locked in your presale vault and starts releasing tomorrow.</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            {[['Paid', `$${number(receipt.usd)} USDT`], ['Price', `$${price.toFixed(2)} / BIX`], ['Daily release', `${number(receipt.bix * PHASE1.dailyPct / 100, { maximumFractionDigits: 2 })} BIX (${PHASE1.dailyPct}%)`], ['Fully released', new Date(Date.now() + PHASE1.vestingDays * 864e5).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })], ['Payment', receipt.via], ['Certificate', receipt.serial ? `#${receipt.serial}` : '—']].map(([k, v]) => <div key={k} className="presale-receipt-row"><dt>{k}</dt><dd className="numeric">{v}</dd></div>)}
          </dl>
          {!!receipt.extra && receipt.extra > 0 && <p className="mt-2 text-center text-[10px] text-chart-2">${number(receipt.extra, { maximumFractionDigits: 2 })} extra was added to your USDT balance.</p>}
          {receipt.test && <p className="mt-2 text-center text-[10px] text-primary">Test only — no balance moved, cannot be claimed as real BIX.</p>}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">Track and claim released BIX in My Presale Portfolio below.</p>
          <button type="button" onClick={() => { setReceipt(null); setMsg(''); }} className="mt-3 w-full rounded-full border border-chart-3/50 py-2 text-xs font-black text-chart-3">Done</button>
        </div>}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/60 p-5">
        <h2 className="font-display text-lg font-black">My Presale Portfolio</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-background/60 p-3"><Lock size={14} className="mx-auto text-muted-foreground"/><b className="numeric block font-display text-xl">{number(totalBix - unlocked, { maximumFractionDigits: 2 })}</b><span className="text-[10px] text-muted-foreground">Locked BIX</span></div>
          <div className="rounded-2xl bg-background/60 p-3"><Unlock size={14} className="mx-auto text-chart-2"/><b className="numeric block font-display text-xl text-chart-2">{number(unlocked, { maximumFractionDigits: 2 })}</b><span className="text-[10px] text-muted-foreground">Released BIX</span></div>
        </div>
        {orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No presale purchases yet.</p> : <ul className="mt-4 grid gap-2">{orders.map(o => { const r = presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now); const pct = Math.min(100, r / Number(o.bix_amount) * 100); const day = Math.min(o.release_days, Math.floor((now - Date.parse(o.created_at)) / 864e5)); return <li key={o.id} className="rounded-2xl border border-border p-3 text-xs">
          <div className="flex justify-between"><b>${number(Number(o.package_usd))} → {number(Number(o.bix_amount))} BIX</b><span className="text-muted-foreground"><CalendarClock size={11} className="inline"/> Day {day}/{o.release_days}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }}/></div>
          <p className="mt-1 text-muted-foreground">{number(r, { maximumFractionDigits: 2 })} BIX released · {pct.toFixed(1)}%</p></li>; })}</ul>}
      </section>
    </>}
    <DeveloperCovenant/>
    <p className="mt-5 flex gap-2 text-[10px] text-muted-foreground"><ShieldCheck size={14} className="shrink-0"/>The presale price is a BIXLINK internal reference, not a market price. BIX is locked and released gradually; future value is not guaranteed.</p>
  </main></BixShell>;
}
