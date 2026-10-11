import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { getReviewerQueue, getReviewerSettings, reviewerDecide } from '@/lib/reviewer.functions';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { Check, X, Percent, Wallet, TrendingUp, Users } from 'lucide-react';
import { dateTime, money } from '@/lib/bixlink';
import { AdminDurationPackages } from '@/components/AdminDurationPackages';
import { YieldControlPanel } from '@/components/YieldControlPanel';
import { AdminBixMarket } from '@/components/AdminBixMarket';
import { AdminReferrals } from '@/components/AdminReferrals';
import { ReviewerDepositWallet } from '@/components/ReviewerDepositWallet';

export const Route = createFileRoute('/review')({
  head: () => ({ meta: [{ title: 'ADMIN PANEL BIX — BIXLINK' }, { name: 'description', content: 'Limited BIXLINK review console.' }, { property: 'og:title', content: 'ADMIN PANEL BIX — BIXLINK' }, { property: 'og:description', content: 'Limited review console.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: Review,
});

type Item = Awaited<ReturnType<typeof getReviewerQueue>>['items'][number];

function Review() {
  const load = useServerFn(getReviewerQueue); const decide = useServerFn(reviewerDecide); const loadSettings = useServerFn(getReviewerSettings);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getReviewerSettings>> | null>(null);
  const [tab, setTab] = useState('APY');
  const refreshSettings = async () => { setSettings(await loadSettings()); };
  const [state, setState] = useState<'loading' | 'signin' | 'denied' | 'ready'>('loading');
  const [items, setItems] = useState<Item[]>([]); const [filter, setFilter] = useState('pending'); const [msg, setMsg] = useState('');
  const refresh = async () => { const r = await load(); if (!r.reviewer) { setState('denied'); return; } setItems(r.items); await refreshSettings(); setState('ready'); };
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (!data.user) setState('signin'); else refresh().catch(() => setState('denied')); }); }, []);
  const list = items.filter(t => filter === 'all' || t.status === filter);
  return <BixShell><main className="mx-auto min-h-[75vh] max-w-7xl px-5 py-8 md:px-8">
    <div className="eyebrow">BIXLINK</div><h1 className="mt-2 font-display text-3xl font-bold">ADMIIN PANEL</h1>
    {state === 'loading' ? <p className="mt-8 text-muted-foreground">Checking access…</p>
      : state === 'signin' ? <Button asChild className="mt-8 rounded-full"><Link to="/auth">Sign in</Link></Button>
      : state === 'denied' ? <p className="mt-8 text-destructive">This account is not an ADMIN PANEL BIX account.</p>
      : <>
        <nav aria-label="Owner 2 sections" className="mt-6 grid grid-cols-2 gap-2 border-b border-border pb-4 sm:grid-cols-4">{[{ label: 'APY', icon: Percent }, { label: 'DOMPET', icon: Wallet }, { label: 'Market', icon: TrendingUp }, { label: 'Referral', icon: Users }].map(({ label, icon: Icon }) => <Button key={label} variant={tab === label ? 'default' : 'outline'} aria-pressed={tab === label} className="h-11 min-w-0 gap-2" onClick={() => { setTab(label); setMsg(''); }}><Icon size={16}/>{label}</Button>)}</nav>
        {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
        {tab === 'DOMPET' && <><ReviewerDepositWallet wallet={settings?.wallet ?? null} onSaved={refreshSettings} onMessage={setMsg}/><h2 className="mt-10 font-display text-lg font-bold">Review deposit & withdrawal</h2><div className="mt-4 flex flex-wrap gap-2">{['pending', 'approved', 'rejected', 'all'].map(s => <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} className="rounded-full capitalize" onClick={() => setFilter(s)}>{s}</Button>)}</div>
        <div className="mt-5 space-y-2">{list.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-xs">
          <div className="min-w-0"><b className="text-sm capitalize">{t.type}</b> · {dateTime(t.created_at)}<div className="break-all font-mono text-muted-foreground">{t.tx_hash ?? t.address}</div></div>
          <div className="flex items-center gap-3"><div className="text-right"><div className="text-chart-3">{money(Number(t.amount_usd))}</div>{Number(t.fee_usd) > 0 && <div className="text-muted-foreground">send {money(Number(t.net_usd))}</div>}<div className="capitalize">{t.status}</div></div>
            {t.status === 'pending' && (['approved', 'rejected'] as const).map(s => <Button key={s} size="icon" variant={s === 'approved' ? 'default' : 'destructive'} className="rounded-full" title={s} onClick={async () => { try { await decide({ data: { id: t.id, status: s } }); await refresh(); setMsg(`Marked ${s}.`); } catch { setMsg('Could not update.'); } }}>{s === 'approved' ? <Check /> : <X />}</Button>)}</div>
        </div>)}{!list.length && <p className="text-sm text-muted-foreground">No transactions.</p>}</div></>}
        {tab === 'APY' && <><YieldControlPanel market={false}/><AdminDurationPackages onMessage={setMsg}/></>}
        {tab === 'Market' && <AdminBixMarket initialPrice={Number(settings?.market?.priceUsd ?? 0.84291)} initialMovement={settings?.market?.movement} onMessage={setMsg} onSaved={refreshSettings}/>}
        {tab === 'Referral' && <AdminReferrals key={JSON.stringify(settings?.referrals)} initial={settings?.referrals} onMessage={setMsg} onSaved={refreshSettings} settingsOnly/>}
      </>}
  </main></BixShell>;
}
