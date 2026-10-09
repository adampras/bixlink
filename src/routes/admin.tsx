import type { DepositWallet } from '@/lib/deposit.functions';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { bootstrapOwner, getAdminData, updateStake, updateSetting, addIncomeSource, manageMember } from '@/lib/bixlink.functions';
import { money } from '@/lib/bixlink';
import { BixShell } from '@/components/BixShell';
import { useMember, useReviewerAccess } from '@/lib/useMember';
import { Button } from '@/components/ui/button';
import { Check, X, Search } from 'lucide-react';
import { AdminWallet } from '@/components/AdminWallet';
import { AdminBixPay } from '@/components/AdminBixPay';
import { AdminClones } from '@/components/AdminClones';
import { AdminTransferToggle } from '@/components/AdminTransferToggle';
import { AdminUnstake } from '@/components/AdminUnstake';
import { AdminBoosterVisual, type BoosterVisual } from '@/components/AdminBoosterVisual';
import { AdminBixMarket } from '@/components/AdminBixMarket';
import { AdminLandingContent } from '@/components/AdminLandingContent';
import { AdminBixVault } from '@/components/AdminBixVault';
import { AdminBixToken } from '@/components/AdminBixToken';
import { AdminReadiness } from '@/components/AdminReadiness';
import { AdminReviewers } from '@/components/AdminReviewers';
import { AdminAppearance } from '@/components/AdminAppearance';
import { AdminReferrals } from '@/components/AdminReferrals';
import { AdminDurationPackages } from '@/components/AdminDurationPackages';
import { AdminTeams } from '@/components/AdminTeams';
import { AdminReports } from '@/components/AdminReports';
import { AdminMining, type MiningSettings } from '@/components/AdminMining';
import type { Readiness } from '@/lib/readiness';
import { AdminSiteControl } from '@/components/AdminSiteControl';
import type { SiteControl } from '@/lib/site-control';
import type { LandingContent } from '@/components/LandingExperience';

export const Route = createFileRoute('/admin')({ head: () => ({ meta: [{ title: 'Owner Panel — BIXLINK' }, { name: 'description', content: 'Private BIXLINK owner operations.' }, { property: 'og:title', content: 'Owner Panel — BIXLINK' }, { property: 'og:description', content: 'BIXLINK owner operations.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }), component: Admin });
type AdminData = Awaited<ReturnType<typeof getAdminData>>;
function Admin() {
  const { user } = useMember();
  const reviewer = useReviewerAccess(user?.id);
  const [state,setState] = useState<'loading'|'signin'|'denied'|'ready'>('loading'); const [data,setData] = useState<AdminData | null>(null); const [message,setMessage] = useState(''); const [search,setSearch] = useState(''); const [tab,setTab] = useState('Overview');
   const boot = useServerFn(bootstrapOwner); const fetchData = useServerFn(getAdminData); const changeStake = useServerFn(updateStake); const saveSetting = useServerFn(updateSetting); const createSource = useServerFn(addIncomeSource); const changeMember = useServerFn(manageMember);
  async function refresh() { const result = await fetchData(); setData(result); }
  useEffect(() => { supabase.auth.getUser().then(async ({data:auth}) => { if (!auth.user) {setState('signin');return;} try { const result = await boot(); if (!result.owner) {setState('denied');return;} await refresh();setState('ready'); } catch {setState('denied');} }); }, []);
   const stakes = data?.stakes ?? []; const active = stakes.filter(s => s.status === 'active'); const total = active.reduce((n,s) => n + Number(s.amount_usd),0);
  if (reviewer.data) return <BixShell><main className="mx-auto min-h-[75vh] max-w-4xl px-5 py-12"><div className="eyebrow">ADMIN PANEL BIX</div><h1 className="section-title">REVIEW <span>CONSOLE</span></h1><Button asChild className="mt-8"><Link to="/review">Open Owner 2 panel</Link></Button></main></BixShell>;
  return <BixShell><main className="mx-auto min-h-[75vh] max-w-7xl px-5 py-12 md:px-8"><div className="eyebrow">PRIVATE ACCESS</div><h1 className="section-title">OWNER <span>CONSOLE</span></h1>{state === 'loading' ? <p className="mt-10 text-muted-foreground">Checking access…</p> : state === 'signin' ? <div className="mt-10"><p className="text-muted-foreground">Sign in with the verified owner account to continue.</p><Button asChild className="mt-5 rounded-full"><Link to="/auth">Sign in</Link></Button></div> : state === 'denied' ? <div className="mt-10">{reviewer.data ? <Button asChild><Link to="/review">Open Owner 2 panel</Link></Button> : <p className="text-destructive">Owner access is unavailable for this account. Sign in with the verified owner email.</p>}</div> : <>
    <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-3">{['Overview','Reports','Users','Stakes','Wallet','Market','Mining','Updates','Appearance','APY','Packages','Referrals','RWA','Landing','Booster','Clones','Teams','Token'].map(x => <Button key={x} size="sm" variant={tab === x ? 'default' : 'ghost'} className="shrink-0 rounded-full" onClick={() => setTab(x)}>{x}</Button>)}</nav>
    {message && <p role="status" className="mt-5 text-sm text-chart-2">{message}</p>}
    {tab === 'Overview' && <><AdminSiteControl initial={data?.settings.find(s => s.key === 'site_control')?.value as SiteControl | undefined} onMessage={setMessage} onSaved={refresh}/><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Total Users',String(data?.members.length ?? 0)],['Active staking value',money(total)],['Active positions',String(active.length)],['USDT max / month','30%']].map(([label,value],i) => <div className={`stat-card accent-${i%3}`} key={label}><span className="text-xs text-muted-foreground">{label}</span><strong className="mt-4 block text-2xl">{value}</strong></div>)}</div><AdminBixVault onMessage={setMessage}/></>}
     {tab === 'Users' && <div className="mt-8">
       <div className="flex max-w-md items-center gap-2 rounded-full border border-border bg-card px-4"><Search size={16}/><input className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Search email or member ID" value={search} onChange={e => setSearch(e.target.value)}/></div>
       <div className="mt-4 flex flex-wrap gap-2 text-xs">{(['active','inactive','banned'] as const).map(k => <span key={k} className="rounded-full border border-border bg-card px-3 py-1">{k === 'active' ? 'Aktif' : k === 'inactive' ? 'Nonaktif' : 'Ban'}: <b>{data?.members.filter(m => m.access === k).length ?? 0}</b></span>)}</div>
       <div className="mt-4 grid gap-2">{data?.members.filter(member => member.id.includes(search) || member.email.toLowerCase().includes(search.toLowerCase())).map(member => {
         const label = { active: 'Aktif', inactive: 'Nonaktif', banned: 'Ban' } as const;
         const tone = member.access === 'active' ? 'border-chart-2 text-chart-2' : member.access === 'inactive' ? 'border-chart-3 text-chart-3' : 'border-destructive text-destructive';
         const run = async (action: 'unban' | 'deactivate' | 'ban', next: keyof typeof label) => { if (member.access === next) return; if (!window.confirm(`Ubah ${member.email} menjadi ${label[next]}?`)) return; try { await changeMember({ data: { id: member.id, action } }); await refresh(); setMessage(`${member.email} → ${label[next]}.`); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update member.'); } };
         return <div key={member.id} className="grid gap-3 rounded-[16px] border border-border bg-card p-4 text-xs sm:grid-cols-[1fr_auto] sm:items-center">
           <div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-sm">{member.email}</strong><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{label[member.access]}</span></div><span className="mt-1 block truncate font-mono text-muted-foreground">{member.id.slice(0, 8)}… · {stakes.filter(s => s.user_id === member.id).length} requests</span></div>
           <div role="group" aria-label={`Status ${member.email}`} className="grid grid-cols-3 gap-1 rounded-full border border-border p-1">
             <Button size="sm" variant={member.access === 'active' ? 'default' : 'ghost'} className="h-8 rounded-full px-3" onClick={() => run('unban', 'active')}>Aktif</Button>
             <Button size="sm" variant={member.access === 'inactive' ? 'secondary' : 'ghost'} className="h-8 rounded-full px-3" onClick={() => run('deactivate', 'inactive')}>Nonaktif</Button>
             <Button size="sm" variant={member.access === 'banned' ? 'destructive' : 'ghost'} className="h-8 rounded-full px-3" onClick={() => run('ban', 'banned')}>Ban</Button>
           </div>
         </div>; })}</div>
       <p className="mt-6 text-xs text-muted-foreground">Nonaktif dan Ban sama-sama memblokir login; Aktif membuka kembali akses. Data stake dan referral tetap tersimpan.</p></div>}
    {tab === 'Stakes' && <AdminUnstake initial={(data?.settings.find(s=>s.key==='unstake')?.value as {tiers?: {days:number;pct:number}[]} | undefined)?.tiers} onMessage={setMessage}/>}
    {tab === 'Stakes' && <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr>{['Member','Package','Amount','Status','Action'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{stakes.map(s => <tr key={s.id} className="border-t border-border"><td className="p-3 font-mono text-xs">{s.user_id.slice(0,8)}…</td><td className="p-3">{s.package_id}</td><td className="p-3 text-chart-3">{money(Number(s.amount_usd))}</td><td className="p-3 capitalize">{s.status}</td><td className="flex gap-2 p-3">{s.status === 'pending' && <><Button title="Approve request" size="icon" className="rounded-full" onClick={async () => {try {await changeStake({data:{id:s.id,status:'active'}});await refresh();} catch {setMessage('Could not approve request.');}}}><Check/></Button><Button title="Reject request" size="icon" variant="destructive" className="rounded-full" onClick={async () => {try {await changeStake({data:{id:s.id,status:'rejected'}});await refresh();} catch {setMessage('Could not reject request.');}}}><X/></Button></>}</td></tr>)}</tbody></table>{!stakes.length && <p className="py-10 text-muted-foreground">No stake requests yet.</p>}</div>}
    {tab === 'Token' && <AdminBixToken saved={data?.settings.find(s=>s.key==='bix_token')?.value as { chainId?: number; address?: string; supply?: number } | undefined} onMessage={setMessage}/>}
    {tab === 'Wallet' && <AdminWallet members={data?.members ?? []} depositWallets={(data?.settings.find(s=>s.key==='deposit_wallets')?.value as {wallets?: DepositWallet[]} | undefined)?.wallets} swapEnabled={Boolean((data?.settings.find(s=>s.key==='swap')?.value as {enabled?: boolean} | undefined)?.enabled)} onMessage={setMessage}/>} 
    {tab === 'Wallet' && <AdminBixPay enabled={Boolean((data?.settings.find(s=>s.key==='bix_pay')?.value as {enabled?: boolean} | undefined)?.enabled)} onMessage={setMessage}/>}
    {tab === 'Wallet' && <AdminTransferToggle enabled={Boolean((data?.settings.find(s=>s.key==='usdt_transfer')?.value as {enabled?: boolean} | undefined)?.enabled)} onMessage={setMessage}/>}
    {tab === 'Clones' && <AdminClones onMessage={setMessage}/>}
    {tab === 'Teams' && <AdminTeams onMessage={setMessage}/>}
    {tab === 'Users' && <AdminReviewers members={data?.members ?? []} onMessage={setMessage}/>}
    {tab === 'Updates' && <AdminReadiness initial={data?.settings.find(s => s.key === 'readiness')?.value as Readiness | undefined} onMessage={setMessage} onSaved={refresh}/>}
     {tab === 'Appearance' && <AdminAppearance initialTheme={(data?.settings.find(s => s.key === 'readiness')?.value as Readiness | undefined)?.presentationTheme} onMessage={setMessage} onSaved={refresh}/>}
    {tab === 'Market' && <AdminBixMarket initialMovement={(data?.settings.find(s=>s.key==='bix_market')?.value as { movement?: unknown } | undefined)?.movement} initialPrice={Number((data?.settings.find(s=>s.key==='bix_market')?.value as {priceUsd?: number} | undefined)?.priceUsd ?? 0.84291)} onMessage={setMessage} onSaved={refresh}/>} 
    {(tab === 'Packages' || tab === 'APY') && <AdminDurationPackages onMessage={setMessage}/>}
     {tab === 'Referrals' && <AdminReferrals initial={data?.settings.find(s => s.key === 'referrals')?.value as Record<string, unknown> | undefined} onSaved={refresh} onMessage={setMessage}/>}
     {tab === 'Reports' && <AdminReports onMessage={setMessage}/>}
     {tab === 'Mining' && <AdminMining initial={data?.settings.find(s => s.key === 'mining')?.value as MiningSettings | undefined} onMessage={setMessage} onSaved={refresh}/>}
    {tab === 'RWA' && <div className="mt-8"><form className="grid max-w-2xl gap-3 sm:grid-cols-3" onSubmit={async e => {e.preventDefault();const f=new FormData(e.currentTarget);try {await createSource({data:{category:String(f.get('category')) as 'FOREX'|'CRYPTO'|'RWA'|'ADVERTISING',name:String(f.get('name')),amount_usd:Number(f.get('amount'))}});await refresh();setMessage('Income source added.');e.currentTarget.reset();} catch {setMessage('Could not add source.');}}}><select className="form-input" name="category">{['FOREX','CRYPTO','RWA','ADVERTISING'].map(x=><option key={x}>{x}</option>)}</select><input className="form-input" name="name" placeholder="Source name" required/><input className="form-input" name="amount" type="number" min="0" step="0.01" placeholder="Amount USD" required/><Button className="rounded-full">Add source</Button></form><div className="mt-8 space-y-2">{data?.sources.map(s => <div key={s.id} className="flex justify-between rounded-[20px] border border-border bg-card p-4 text-sm"><span>{s.category} · {s.name}</span><span className="text-chart-3">{money(Number(s.amount_usd))}</span></div>)}</div></div>}
     {tab === 'Landing' && <AdminLandingContent {...((data?.settings.find(s=>s.key==='landing_content')?.value as LandingContent | undefined) ? { initialContent: data?.settings.find(s=>s.key==='landing_content')?.value as LandingContent } : {})} onMessage={setMessage} onSaved={refresh}/>} 
     {tab === 'Booster' && <AdminBoosterVisual initialVisual={((data?.settings.find(s=>s.key==='booster_visual')?.value as {visual?: BoosterVisual} | undefined)?.visual ?? 'video')} enabled={Boolean((data?.settings.find(s=>s.key==='booster')?.value as {enabled?: boolean})?.enabled)} onMessage={setMessage} onSaved={refresh}/>} 
  </>}</main></BixShell>;
}
