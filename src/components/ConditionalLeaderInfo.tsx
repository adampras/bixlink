import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { usePublicConfig } from '@/lib/useMember';
import { Crown, Sparkles, X, Copy, Users, Video, Megaphone, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { claimConditionalLeader, getConditionalLeaderAccess, getMyLeader } from '@/lib/bixlink.functions';

const PACKAGES = [
  { id: 'EXPLORER', usd: 100 }, { id: 'PIONEER', usd: 500 }, { id: 'BUILDER', usd: 1000 },
];
const DAYS = 360;
type Result = { package: string; value_usd: number; target_usd: number };

// Visible to Owner 1 and Owner 1's network only (server-gated). One self-claim per account.
export function ConditionalLeaderInfo() {
  const fetchAccess = useServerFn(getConditionalLeaderAccess);
  const fetchLeader = useServerFn(getMyLeader);
  const claim = useServerFn(claimConditionalLeader);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['conditional-leader-access'], queryFn: () => fetchAccess() });
  const leader = useQuery({ queryKey: ['my-leader'], queryFn: () => fetchLeader(), enabled: !!data?.allowed });
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<{ id: string; usd: number }>({ id: 'BUILDER', usd: 1000 });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Result | null>(null);
  const [guide, setGuide] = useState(false);
  const [invited, setInvited] = useState(false);
  const { data: cfg } = usePublicConfig();
  useEffect(() => {
    const check = () => setInvited(new URLSearchParams(window.location.search).get('loan') === 'open');
    check(); window.addEventListener('bix-loan-open', check); return () => window.removeEventListener('bix-loan-open', check);
  }, []);
  useEffect(() => { if (invited) document.getElementById('loan-account')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [invited, data?.allowed]);
  const claimed = !!leader.data?.status;
  const programOpen = cfg?.readiness?.loanEnabled !== false;
  // Auto-shown for leaders who hold a loan account; otherwise only when opened via FOX AI (?loan=open) while the program is open.
  if (!data?.allowed || (!claimed && !(invited && programOpen))) return null;
  const rows = [
    ['Account value', 'Up to a $1,000 package (existing conditional leaders keep their set value)'],
    ['Turnover target', '5× the joined package value'],
    ['After 5× reached', 'Special company rewards and challenges'],
    ['BIXCOIN distribution', '5–10% when your members/investors stake with the 70:30 split'],
    ['BIX allocation', 'Eligible when team turnover exceeds $100,000'],
  ];
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await claim({ data: { packageId: pick.id, days: DAYS } });
      setOpen(false); setDone(r);
      await Promise.all([leader.refetch(), qc.invalidateQueries({ queryKey: ['my-bixlink'] }), qc.invalidateQueries({ queryKey: ['my-wallet'] })]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not activate.'); }
    setBusy(false);
  };
  return <section id="loan-account" className="mt-6 rounded-2xl border border-chart-3/50 bg-card p-5">
    <div className="eyebrow flex items-center gap-2 text-chart-3"><Crown size={14}/> CONDITIONAL LEADER ACCOUNT · GLOBAL</div>
    <h2 className="mt-1 font-display text-lg font-black">Conditional loan account for leaders worldwide</h2>
    <dl className="mt-3 space-y-2 text-xs">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2 border-b border-border/60 pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl>
    {claimed
      ? <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-chart-3/40 bg-chart-3/10 p-3 text-xs"><span><b className="text-chart-3">Active leader account</b> · ${Number(leader.data?.virtual_usd ?? 0).toLocaleString()} · target ${Number(leader.data?.target ?? 0).toLocaleString()}</span><Button size="sm" variant="outline" className="rounded-full" onClick={() => setGuide(true)}>Growth guide</Button></div>
      : <Button className="mt-4 w-full rounded-full bg-chart-3 font-black text-background" onClick={() => { setAgree(false); setErr(''); setOpen(true); }}><Crown/> CLAIM & ACTIVATE LOAN PACKAGE</Button>}
    <p className="mt-3 text-[10px] text-muted-foreground">Conditional account is an internal locked credit, not withdrawable funds. Rewards and allocations are reviewed and approved by the owner. Terms apply.</p>

    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div role="dialog" aria-modal="true" aria-label="Choose loan package" className="modal-panel" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between"><h3 className="font-display text-xl font-black">Choose your leader package</h3><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}><X/></Button></div>
      <div role="radiogroup" className="mt-4 grid grid-cols-3 gap-2">{PACKAGES.map(p => <button key={p.id} type="button" role="radio" aria-checked={pick.id === p.id} onClick={() => setPick(p)} className={`rounded-xl border p-3 text-left text-xs ${pick.id === p.id ? 'border-chart-3 bg-chart-3/10' : 'border-border'}`}><b className="block">{p.id}</b><span className="numeric text-lg font-black text-chart-3">${p.usd.toLocaleString()}</span><span className="numeric block text-muted-foreground">Target ${(p.usd * 5).toLocaleString()}</span></button>)}</div>
      <ul className="mt-4 space-y-1 text-xs text-muted-foreground"><li>• Stake activates instantly for {DAYS} days from the loan credit.</li><li>• Principal stays locked until 5× turnover (${(pick.usd * 5).toLocaleString()}) is reached.</li><li>• One claim per account; the owner can review or revoke it.</li></ul>
      <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3 text-xs"><input type="checkbox" className="mt-0.5" checked={agree} onChange={e => setAgree(e.target.checked)}/> I accept the conditional leader terms.</label>
      {err && <p role="alert" className="mt-3 text-xs text-destructive">{err}</p>}
      <Button disabled={!agree || busy} className="mt-4 w-full rounded-full bg-chart-3 font-black text-background" onClick={submit}>{busy ? 'Activating…' : `Activate ${pick.id} · $${pick.usd.toLocaleString()}`}</Button>
    </div></div>}

    {done && <div className="modal-backdrop" onClick={() => setDone(null)}><div role="dialog" aria-modal="true" aria-label="Leader account activated" className="modal-panel text-center" onClick={e => e.stopPropagation()}>
      <div className="mx-auto grid size-20 place-items-center rounded-full border-2 border-chart-3 bg-chart-3/15 text-chart-3 shadow-[0_0_40px_var(--color-chart-3)]"><Crown size={38}/></div>
      <p className="eyebrow mt-4 text-chart-3"><Sparkles size={12} className="inline"/> OFFICIAL BIXLINK GLOBAL LEADER</p>
      <h3 className="mt-2 font-display text-2xl font-black">Congratulations, Leader!</h3>
      <p className="mt-3 text-sm text-muted-foreground">Thank you for your dedication. The company entrusts you with this conditional working capital as a sign of respect for your commitment to building BIXLINK worldwide. You are a pillar of this ecosystem.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-border p-3">Package<b className="block text-base">{done.package}</b></div><div className="rounded-xl border border-border p-3">Value<b className="numeric block text-base text-chart-3">${Number(done.value_usd).toLocaleString()}</b></div><div className="col-span-2 rounded-xl border border-border p-3">Turnover target 5×<b className="numeric block text-base">${Number(done.target_usd).toLocaleString()}</b></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="outline" className="rounded-full" asChild><Link to="/stake">View stake</Link></Button><Button className="rounded-full bg-chart-3 text-background" onClick={() => { setDone(null); setGuide(true); }}>Growth guide</Button></div>
    </div></div>}

    {guide && <div className="modal-backdrop" onClick={() => setGuide(false)}><div role="dialog" aria-modal="true" aria-label="Leader growth guide" className="modal-panel" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between"><h3 className="font-display text-xl font-black">Leader growth guide</h3><Button variant="ghost" size="icon" aria-label="Close" onClick={() => setGuide(false)}><X/></Button></div>
      <ol className="mt-4 space-y-3 text-xs">
        <li className="flex gap-3"><Copy className="shrink-0 text-chart-3" size={18}/><span><b className="block">1. Share your referral link</b>Invite partners and investors with your official BIXLINK link from Profile.</span></li>
        <li className="flex gap-3"><Megaphone className="shrink-0 text-chart-3" size={18}/><span><b className="block">2. Present with official materials</b>Use the 6 official posters and video on the Marketing page.</span></li>
        <li className="flex gap-3"><Video className="shrink-0 text-chart-3" size={18}/><span><b className="block">3. Educate in BIXZOOM</b>Hold regular group sessions in the official Zoom room.</span></li>
        <li className="flex gap-3"><Users className="shrink-0 text-chart-3" size={18}/><span><b className="block">4. Build team turnover</b>Help your team stake; every stake counts toward your 5× target.</span></li>
      </ol>
      <div className="mt-4 rounded-xl border border-chart-3/40 bg-chart-3/10 p-3 text-xs"><b className="flex items-center gap-1 text-chart-3"><TrendingUp size={14}/> Earning potential</b><ul className="mt-2 space-y-1 text-muted-foreground"><li>• Daily staking yield projection on your leader package</li><li>• Network bonuses from your team's stakes</li><li>• BIXCOIN distribution 5–10% on 70:30 stakes</li><li>• Special rewards & challenges after 5× turnover</li><li>• BIX allocation when team turnover exceeds $100,000</li></ul><p className="mt-2 text-[10px]">Projections are not guaranteed. Rewards are owner-reviewed.</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" className="rounded-full" asChild><Link to="/marketing">Marketing</Link></Button><Button className="rounded-full bg-chart-3 text-background" asChild><Link to="/network">My network</Link></Button></div>
    </div></div>}
  </section>;
}
