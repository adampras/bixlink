import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Coins, Lock, Users, Award, Truck, Settings2, X } from 'lucide-react';
import { getGoldSpot, type GoldSpot } from '@/lib/gold-price.functions';
import { AdminBixGold } from '@/components/AdminBixGold';
import heroImg from '@/assets/gold-hero.jpg';
import microImg from '@/assets/gold-micro.jpg';
import vaultImg from '@/assets/gold-vault.jpg';
import netImg from '@/assets/gold-network.jpg';
import { supabase } from '@/integrations/supabase/client';
import { readBixGold, goldPackageUsd, type BixGoldSettings } from '@/lib/bix-gold';
import { ecosystemHead } from '@/lib/ecosystem-seo';

export const Route = createFileRoute('/gold')({
  head: () => ecosystemHead('/gold', 'BIX GOLD — Referensi Harga Emas & Rencana Layanan | BIXLINK', 'Lihat referensi harga emas per gram dalam USD, IDR dan MYR, kalkulator serta pratinjau BIX GOLD. Bukan bukti kepemilikan atau penitipan emas.'),
  component: GoldPage,
});

const fmt = (n: number, c: string, d = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: d }).format(n);

function GoldPage() {
  const [st, setS] = useState<BixGoldSettings | null>(null);
  let s = st;
  const [grams, setGrams] = useState(1);
  const [spot, setSpot] = useState<GoldSpot>(null);
  const [owner, setOwner] = useState(false);
  const [edit, setEdit] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => void supabase.from('app_settings').select('value').eq('key', 'bix_gold').maybeSingle().then(({ data }) => setS(readBixGold(data?.value)));
  useEffect(() => {
    load();
    void getGoldSpot().then(setSpot).catch(() => setSpot(null));
    void supabase.auth.getSession().then(({ data }) => { if (data.session) void supabase.rpc('bix_is_owner1').then(({ data: o }) => setOwner(o === true)); });
  }, []);
  if (!s) return <main className="min-h-screen p-6 text-muted-foreground">Loading…</main>;
  const raw = s;
  const live = raw.autoPrice && spot ? spot : null;
  s = live ? { ...raw, priceUsdPerGram: live.usdPerGram, usdIdr: live.usdIdr, usdMyr: live.usdMyr } : raw;
  const usd = goldPackageUsd(grams, s);
  const chips = [0.1, 0.5, 1, 5, 10, 50, 100];
  const pkgs = s.packages.filter(p => p.enabled);
  const glass = 'rounded-3xl border border-primary/25 bg-card/70 backdrop-blur-xl shadow-[0_20px_50px_-25px_color-mix(in_oklab,var(--primary)_45%,transparent)]';
  return <main className="relative min-h-screen overflow-hidden bg-background">
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_10%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent),radial-gradient(50%_35%_at_100%_30%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent)]"/>
    <div className="relative mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-4">
    <header className={`sticky top-2 z-30 flex items-center justify-between px-3 py-2 ${glass} rounded-full`}>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4"/>Back</Link>
      <span className="text-[10px] font-semibold tracking-[0.25em] text-primary">24K · 999.9</span>
      {owner ? <button onClick={() => setEdit(true)} className="inline-flex items-center gap-1 rounded-full border border-primary/50 px-3 py-1 text-xs font-semibold text-primary"><Settings2 className="size-3.5"/>Edit</button> : <span className="w-12"/>}
    </header>
    {owner && edit && <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4" style={{ maxHeight: '100dvh' }}>
      <div className="mx-auto max-w-4xl"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{msg}</span><button aria-label="Close editor" onClick={() => setEdit(false)} className="rounded-full border border-border p-2"><X className="size-4"/></button></div>
      <AdminBixGold initial={raw} onMessage={setMsg} onSaved={load}/></div>
    </div>}

    <section className={`relative overflow-hidden ${glass}`}>
      <img src={heroImg} alt="Stacked 999.9 fine gold bars" width={1536} height={768} className="h-44 w-full object-cover"/>
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-transparent via-transparent to-card"/>
      <div className="relative -mt-10 p-5">
        <p className="text-[10px] tracking-[0.3em] text-primary">BIXLINK · FINE GOLD</p>
        <h1 className="mt-1 font-display text-3xl font-bold">BIX <span className="text-primary">GOLD</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Save gold by the gram, lock it for passive plans and mint physical bars when you are ready.</p>
        {!s.enabled && <p className="mt-3 inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] text-primary">Under construction · preview</p>}
        <div className="mt-4 grid grid-cols-3 gap-2 tabular-nums">
          {[['USD / g', fmt(s.priceUsdPerGram, 'USD')], ['IDR / g', fmt(s.priceUsdPerGram * s.usdIdr, 'IDR', 0)], ['MYR / g', fmt(s.priceUsdPerGram * s.usdMyr, 'MYR')]].map(([k, v]) => <div key={k} className="rounded-2xl border border-primary/20 bg-background/60 px-2 py-3 text-center"><span className="block text-[9px] tracking-widest text-muted-foreground">{k}</span><strong className="mt-1 block text-[13px] leading-tight text-primary">{s.priceUsdPerGram ? v : '—'}</strong></div>)}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-primary' : 'bg-muted-foreground'}`}/>{live ? `Live spot 24K · daily · ${new Date(live.updatedAt).toLocaleString()}` : 'Owner reference price'}</p>
      </div>
    </section>

    <section className={`${glass} p-5`}>
      <h2 className="flex items-center gap-2 font-bold"><Coins className="size-4 text-primary"/>Gram calculator</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">{chips.map(c => <button key={c} onClick={() => setGrams(c)} className={`rounded-full border px-3 py-1 text-xs tabular-nums ${grams === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{c} g</button>)}</div>
      <input type="number" min={0.1} step={0.1} className="form-input mt-3" aria-label="Grams" value={grams} onChange={e => setGrams(Math.max(0, Number(e.target.value)))}/>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center tabular-nums">{[['USD', fmt(usd, 'USD')], ['IDR', fmt(usd * s.usdIdr, 'IDR', 0)], ['MYR', fmt(usd * s.usdMyr, 'MYR')]].map(([k, v]) => <div key={k} className="rounded-xl bg-background/60 p-2"><span className="block text-[9px] text-muted-foreground">{k}</span><strong className="text-[12px]">{v}</strong></div>)}</div>
    </section>

    <section><h2 className="mb-3 flex items-center justify-between font-bold">Gold packages<span className="text-[10px] font-normal tracking-widest text-muted-foreground">CERTIFIED 999.9</span></h2><div className="grid grid-cols-2 gap-3">
      {pkgs.map((p, i) => <div key={p.name} className={`overflow-hidden ${glass} rounded-2xl ${pkgs.length % 2 && i === pkgs.length - 1 ? 'col-span-2' : ''}`}><div className="relative"><img src={p.grams >= 20 ? vaultImg : p.grams >= 5 ? heroImg : microImg} alt="" loading="lazy" width={992} height={672} className="h-24 w-full object-cover"/><span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[9px] font-semibold text-primary">24K</span></div><div className="p-3"><span className="text-[11px] text-muted-foreground">{p.name}</span><strong className="block text-xl tabular-nums">{p.grams} g</strong><span className="text-sm font-semibold tabular-nums text-primary">{s.priceUsdPerGram ? fmt(goldPackageUsd(p.grams, s), 'USD') : '—'}</span><span className="block text-[10px] tabular-nums text-muted-foreground">{fmt(goldPackageUsd(p.grams, s) * s.usdIdr, 'IDR', 0)}</span></div></div>)}
    </div></section>

    <section className={`overflow-hidden ${glass}`}>
      <div className="relative"><img src={netImg} alt="Gold rewards network" loading="lazy" width={992} height={672} className="h-36 w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-b from-transparent to-card"/><h2 className="absolute bottom-3 left-5 font-display text-2xl font-bold">Marketing <span className="text-primary">plan</span></h2></div>
      <div className="space-y-4 p-5 pt-2">
      <div className="rounded-2xl border border-border bg-background/50 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-primary"/>Sponsor & generation</h3>
        <p className="mt-2 flex items-baseline justify-between text-sm">Direct sponsor<strong className="text-xl tabular-nums text-primary">{s.sponsorPct}%</strong></p>
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center tabular-nums">{s.levels.map((l, i) => <div key={i} className="rounded-xl border border-primary/15 bg-card py-1.5"><span className="block text-[9px] text-muted-foreground">L{i + 1}</span><span className="text-xs font-semibold">{l}%</span></div>)}</div></div>
      <div className="rounded-2xl border border-border bg-background/50 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Lock className="size-4 text-primary"/>Passive gold yield</h3>
        <ul className="mt-2 space-y-1 text-sm tabular-nums">{s.yieldPlans.filter(y => y.enabled).map(y => <li key={y.days} className="flex justify-between border-b border-border/60 py-1.5"><span>{y.days} days lock</span><span className="text-primary">{y.monthlyPct}% / mo*</span></li>)}{!s.yieldPlans.some(y => y.enabled) && <li className="text-xs text-muted-foreground">Coming soon</li>}</ul></div>
      <div className="flex gap-3 rounded-2xl border border-border bg-background/50 p-3"><img src={vaultImg} alt="Secure gold vault" loading="lazy" width={992} height={672} className="size-20 shrink-0 rounded-xl object-cover"/><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4 text-primary"/>Physical minting</h3>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">Minting fee <strong className="text-foreground">{fmt(s.mintFeeUsd, 'USD')}</strong> · insurance <strong className="text-foreground">{s.insurancePct}%</strong></p></div></div>
      <div className="rounded-2xl border border-border bg-background/50 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Award className="size-4 text-primary"/>Rank rewards</h3>
        <ul className="mt-2 space-y-1 text-sm tabular-nums">{s.ranks.map(r => <li key={r.name} className="flex items-center justify-between border-b border-border/60 py-1.5"><span>{r.name}<span className="block text-[10px] text-muted-foreground">{r.teamGrams} g team</span></span><span className="text-primary">{r.reward || '—'}</span></li>)}</ul></div>
      {s.notes && <p className="whitespace-pre-line text-xs text-muted-foreground">{s.notes}</p>}
      </div>
    </section>
    <p className="text-[11px] text-muted-foreground">Live prices come from public spot gold and FX feeds (refreshed daily) and may differ from dealer buy/sell prices. All bonus percentages are owner-set reference values. *Yields are projections, not guaranteed returns; bonuses are reviewed and never paid automatically.</p>
    </div>
  </main>;
}
