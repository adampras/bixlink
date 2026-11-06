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

export const Route = createFileRoute('/gold')({
  head: () => ({ meta: [
    { title: 'BIX GOLD — Digital 24K Gold Savings | BIXLINK' },
    { name: 'description', content: 'Save 999.9 gold by the gram with USD, IDR and MYR references and a transparent BIX GOLD marketing plan.' },
    { property: 'og:title', content: 'BIX GOLD — Digital Gold Savings' },
    { property: 'og:description', content: 'Gram packages, gold yield plans, physical minting and rank rewards on BIXLINK.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
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
  return <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 pb-28 pt-5">
    <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4"/>Back</Link>
    {owner && <button onClick={() => setEdit(true)} className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-primary bg-card px-4 py-2 text-sm font-semibold text-primary shadow-lg"><Settings2 className="size-4"/>Edit BIX GOLD</button>}
    {owner && edit && <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 p-4" style={{ maxHeight: '100dvh' }}>
      <div className="mx-auto max-w-4xl"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{msg}</span><button aria-label="Close editor" onClick={() => setEdit(false)} className="rounded-full border border-border p-2"><X className="size-4"/></button></div>
      <AdminBixGold initial={raw} onMessage={setMsg} onSaved={load}/></div>
    </div>}
    <section className="relative overflow-hidden rounded-3xl border border-primary/40 bg-card p-6 shadow-lg">
      <img src={heroImg} alt="Stacked 999.9 fine gold bars" width={1536} height={768} className="absolute inset-0 h-full w-full object-cover opacity-45"/>
      <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-transparent"/>
      <div className="relative">
      <p className="text-xs tracking-[0.3em] text-primary">BIXLINK · 999.9 FINE GOLD</p>
      <h1 className="mt-2 font-display text-3xl font-bold">BIX GOLD</h1>
      <p className="mt-2 text-sm text-muted-foreground">Save gold by the gram, lock it for passive plans and mint physical bars when you are ready.</p>
      {!s.enabled && <p className="mt-3 inline-block rounded-full border border-border px-3 py-1 text-xs">Under construction · preview</p>}
      <div className="mt-5 grid grid-cols-3 gap-2 text-center tabular-nums">
        {[['USD/g', fmt(s.priceUsdPerGram, 'USD')], ['IDR/g', fmt(s.priceUsdPerGram * s.usdIdr, 'IDR', 0)], ['MYR/g', fmt(s.priceUsdPerGram * s.usdMyr, 'MYR')]].map(([k, v]) => <div key={k} className="rounded-2xl border border-border p-3"><span className="block text-[10px] text-muted-foreground">{k}</span><strong className="text-sm">{s.priceUsdPerGram ? v : '—'}</strong></div>)}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">{live ? `Live spot 24K · auto-updated daily · ${new Date(live.updatedAt).toLocaleString()}` : 'Owner reference price'}</p>
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-bold"><Coins className="size-4 text-primary"/>Gram calculator</h2>
      <input type="number" min={0.1} step={0.1} className="form-input mt-3" aria-label="Grams" value={grams} onChange={e => setGrams(Math.max(0, Number(e.target.value)))}/>
      <p className="mt-2 text-sm tabular-nums">{grams} g ≈ <strong>{fmt(usd, 'USD')}</strong> · {fmt(usd * s.usdIdr, 'IDR', 0)} · {fmt(usd * s.usdMyr, 'MYR')}</p>
    </section>

    <section><h2 className="mb-3 font-bold">Gold packages</h2><div className="grid grid-cols-2 gap-3">
      {s.packages.filter(p => p.enabled).map(p => <div key={p.name} className="overflow-hidden rounded-2xl border border-primary/30 bg-card"><img src={p.grams >= 20 ? vaultImg : p.grams >= 5 ? heroImg : microImg} alt="" loading="lazy" width={992} height={672} className="h-20 w-full object-cover"/><div className="p-4"><span className="text-xs text-muted-foreground">{p.name}</span><strong className="mt-1 block text-xl tabular-nums">{p.grams} g</strong><span className="text-sm tabular-nums text-primary">{s.priceUsdPerGram ? fmt(goldPackageUsd(p.grams, s), 'USD') : '—'}</span></div></div>)}
    </div></section>

    <section className="rounded-3xl border border-border bg-card p-5 space-y-4">
      <img src={netImg} alt="Gold rewards network" loading="lazy" width={992} height={672} className="-mx-5 -mt-5 h-32 w-[calc(100%+2.5rem)] max-w-none object-cover"/>
      <h2 className="font-bold">Marketing plan</h2>
      <div><h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-primary"/>Sponsor & generation</h3>
        <p className="mt-1 text-sm">Direct sponsor: <strong>{s.sponsorPct}%</strong></p>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-xs tabular-nums">{s.levels.map((l, i) => <div key={i} className="rounded-lg border border-border p-1.5"><span className="block text-muted-foreground">L{i + 1}</span>{l}%</div>)}</div></div>
      <div><h3 className="flex items-center gap-2 text-sm font-semibold"><Lock className="size-4 text-primary"/>Passive gold yield</h3>
        <ul className="mt-2 space-y-1 text-sm tabular-nums">{s.yieldPlans.filter(y => y.enabled).map(y => <li key={y.days} className="flex justify-between border-b border-border py-1"><span>{y.days} days lock</span><span>{y.monthlyPct}% / month (projection)</span></li>)}{!s.yieldPlans.some(y => y.enabled) && <li className="text-muted-foreground">Coming soon</li>}</ul></div>
      <div><img src={vaultImg} alt="Secure gold vault" loading="lazy" width={992} height={672} className="mb-2 h-24 w-full rounded-xl object-cover"/><h3 className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4 text-primary"/>Physical minting</h3>
        <p className="mt-1 text-sm tabular-nums">Minting fee {fmt(s.mintFeeUsd, 'USD')} · insurance {s.insurancePct}%</p></div>
      <div><h3 className="flex items-center gap-2 text-sm font-semibold"><Award className="size-4 text-primary"/>Rank rewards</h3>
        <ul className="mt-2 space-y-1 text-sm tabular-nums">{s.ranks.map(r => <li key={r.name} className="flex justify-between border-b border-border py-1"><span>{r.name} · {r.teamGrams} g team</span><span className="text-primary">{r.reward || '—'}</span></li>)}</ul></div>
      {s.notes && <p className="whitespace-pre-line text-xs text-muted-foreground">{s.notes}</p>}
    </section>
    <p className="text-[11px] text-muted-foreground">Live prices come from public spot gold and FX feeds (refreshed daily) and may differ from dealer buy/sell prices. All bonus percentages are owner-set reference values. Yields are projections, not guaranteed returns; bonuses are reviewed and never paid automatically.</p>
  </main>;
}
