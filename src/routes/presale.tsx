import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { buyPresaleFlex, getPresaleStatus } from '@/lib/presale.functions';
import { presaleReleased } from '@/lib/presale';
import { PHASE1, bixFor, clampUsd, countdown } from '@/lib/presale-phase';
import { number } from '@/lib/bixlink';
import { CalendarClock, Coins, Lock, ShieldCheck, Unlock } from 'lucide-react';

export const Route = createFileRoute('/presale')({ head: () => ({ meta: [
  { title: 'BIX Presale Fase 1 — $0.25 per BIX | BIXLINK' },
  { name: 'description', content: 'Presale BIX Fase 1: $0.25 per BIX, paket $100–$1.000, vesting 1% per hari selama 100 hari.' },
  { property: 'og:title', content: 'BIX Presale Fase 1 — BIXLINK' },
  { property: 'og:description', content: 'Beli BIX di $0.25, terbuka 1% per hari selama 100 hari. Berlaku 2 bulan.' },
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

  const doBuy = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await buy({ data: { usd } }); setMsg(`Berhasil! ${number(Number(r.bix))} BIX terkunci · terbuka ${PHASE1.dailyPct}% per hari.`); setConfirm(false); qc.invalidateQueries({ queryKey: ['presale'] }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Pembelian gagal'); } finally { setBusy(false); }
  };

  return <BixShell><main className="mx-auto max-w-2xl px-4 py-6">
    <section className="relative overflow-hidden rounded-3xl border border-chart-3/40 bg-card/70 p-5 backdrop-blur">
      <p className="text-[10px] font-bold tracking-[0.3em] text-chart-3">BIX PRESALE · FASE 1</p>
      <h1 className="mt-1 font-display text-3xl font-black">Beli BIX di harga <span className="text-chart-3">${price.toFixed(2)}</span></h1>
      <p className="mt-1 text-xs text-muted-foreground">Setara harga buyback developer. Setiap $1 = {number(bixFor(1, price))} BIX.</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-bold text-primary">{phase === 'upcoming' ? 'DIBUKA DALAM' : phase === 'live' ? 'BERAKHIR DALAM' : 'FASE 1 SELESAI'}</span>
        {phase !== 'ended' && <div className="grid flex-1 grid-cols-4 gap-1.5">{cd.map((v, i) => <div key={i} className="rounded-xl border border-border bg-background/60 py-1 text-center"><b className="numeric block font-display">{String(v).padStart(2, '0')}</b><span className="text-[9px] text-muted-foreground">{['HARI', 'JAM', 'MNT', 'DTK'][i]}</span></div>)}</div>}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">14 Nov 2026 00:00 WIB – 14 Jan 2027 00:00 WIB</p>
    </section>

    <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
      {[[Coins, '1. Pilih nominal', '$100 – $1.000'], [Lock, '2. BIX terkunci', `${number(bixFor(1000, price))} BIX maks`], [Unlock, '3. Terbuka harian', `${PHASE1.dailyPct}% × ${PHASE1.vestingDays} hari`]].map(([I, t, d]: any) => <li key={t} className="rounded-2xl border border-border bg-card/50 p-3"><I size={18} className="mx-auto text-primary"/><b className="mt-1 block">{t}</b><span className="text-muted-foreground">{d}</span></li>)}
    </ol>

    {!user ? <div className="mt-6 rounded-2xl border border-border p-5 text-center"><p className="text-sm">Masuk untuk ikut presale.</p><Button asChild className="mt-3 rounded-full"><Link to="/auth">Masuk / Daftar</Link></Button></div> : <>
      <section className="mt-6 rounded-3xl border border-primary/40 bg-card/70 p-5">
        <h2 className="font-display text-lg font-black">Paket Presale</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">{QUICK.map(v => <button key={v} type="button" onClick={() => setUsd(v)} className={`rounded-xl border py-2 text-sm font-bold ${usd === v ? 'border-chart-3 bg-chart-3/15 text-chart-3' : 'border-border'}`}>${v}</button>)}</div>
        <input type="range" min={PHASE1.min} max={PHASE1.max} step={10} value={usd} onChange={e => setUsd(Number(e.target.value))} className="mt-4 w-full accent-[var(--primary)]" aria-label="Nominal USDT"/>
        <label className="mt-2 flex items-center gap-2 text-xs">Nominal (USDT)<input type="number" min={PHASE1.min} max={PHASE1.max} value={usd} onChange={e => setUsd(Number(e.target.value))} onBlur={() => setUsd(clampUsd(usd))} className="numeric w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"/></label>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-background/60 p-3"><dt className="text-[10px] text-muted-foreground">Anda menerima</dt><dd className="numeric font-display text-2xl font-black text-chart-3">{number(bix)} BIX</dd></div>
          <div className="rounded-2xl bg-background/60 p-3"><dt className="text-[10px] text-muted-foreground">Terbuka per hari</dt><dd className="numeric font-display text-2xl font-black text-primary">{number(daily, { maximumFractionDigits: 2 })} BIX</dd></div>
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground">Saldo USDT: <b className="numeric">${number(balance, { maximumFractionDigits: 2 })}</b></p>
        {!confirm ? <Button className="mt-4 h-12 w-full rounded-full text-base font-black" disabled={!canBuy || usd < PHASE1.min || usd > PHASE1.max} onClick={() => { setErr(''); setConfirm(true); }}>{phase === 'upcoming' ? 'Belum dibuka' : phase === 'ended' ? 'Fase 1 selesai' : !cfg?.enabled ? 'Presale ditutup' : `Beli ${number(bix)} BIX`}</Button>
          : <div className="mt-4 rounded-2xl border border-chart-3/50 p-3 text-sm"><p>Konfirmasi: bayar <b>${usd} USDT</b> untuk <b>{number(bix)} BIX</b>, terkunci dan terbuka {PHASE1.dailyPct}% per hari selama {PHASE1.vestingDays} hari.</p>
            <div className="mt-3 flex gap-2"><Button variant="outline" className="flex-1 rounded-full" onClick={() => setConfirm(false)} disabled={busy}>Batal</Button><Button className="flex-1 rounded-full" onClick={doBuy} disabled={busy}>{busy ? 'Memproses…' : 'Konfirmasi'}</Button></div></div>}
        {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
        {msg && <p role="status" className="mt-3 text-sm text-chart-2">{msg}</p>}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card/60 p-5">
        <h2 className="font-display text-lg font-black">Portofolio Presale Saya</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-background/60 p-3"><Lock size={14} className="mx-auto text-muted-foreground"/><b className="numeric block font-display text-xl">{number(totalBix - unlocked, { maximumFractionDigits: 2 })}</b><span className="text-[10px] text-muted-foreground">BIX terkunci</span></div>
          <div className="rounded-2xl bg-background/60 p-3"><Unlock size={14} className="mx-auto text-chart-2"/><b className="numeric block font-display text-xl text-chart-2">{number(unlocked, { maximumFractionDigits: 2 })}</b><span className="text-[10px] text-muted-foreground">BIX sudah terbuka</span></div>
        </div>
        {orders.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Belum ada pembelian presale.</p> : <ul className="mt-4 grid gap-2">{orders.map(o => { const r = presaleReleased(Number(o.bix_amount), o.release_days, o.created_at, now); const pct = Math.min(100, r / Number(o.bix_amount) * 100); const day = Math.min(o.release_days, Math.floor((now - Date.parse(o.created_at)) / 864e5)); return <li key={o.id} className="rounded-2xl border border-border p-3 text-xs">
          <div className="flex justify-between"><b>${number(Number(o.package_usd))} → {number(Number(o.bix_amount))} BIX</b><span className="text-muted-foreground"><CalendarClock size={11} className="inline"/> Hari {day}/{o.release_days}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }}/></div>
          <p className="mt-1 text-muted-foreground">{number(r, { maximumFractionDigits: 2 })} BIX terbuka · {pct.toFixed(1)}%</p></li>; })}</ul>}
      </section>
    </>}
    <p className="mt-5 flex gap-2 text-[10px] text-muted-foreground"><ShieldCheck size={14} className="shrink-0"/>Harga presale adalah acuan internal BIXLINK, bukan harga pasar. BIX terkunci dan terbuka bertahap; nilai ke depan tidak dijamin.</p>
  </main></BixShell>;
}
