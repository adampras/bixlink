import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Activity, ChevronDown, MessageCircle, Radar, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { getMemberGrowth, getPublicGrowth, getRadar } from '@/lib/growth.functions';
import { flashActive, radarFlags, type RadarMember } from '@/lib/growth';
import { money } from '@/lib/bixlink';

export function RecordedActivity() {
  const { user, ready } = useMember();
  const member = useServerFn(getMemberGrowth);
  const { data } = useQuery({ queryKey: ['growth-snapshot', user?.id ?? 'public'], queryFn: () => user ? member() : getPublicGrowth(), enabled: ready, refetchInterval: 30000 });
  const [now, setNow] = useState(0), [closed, setClosed] = useState(false);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); }, []);
  if (!data?.eligible || !data.control) return null;
  const flash = flashActive(data.control, now);
  const left = Math.max(0, Date.parse(data.control.flash_ends_at ?? '') - now);
  const events = data.events ?? [], latest = events[0];
  return <>
    {flash && <section aria-label="Flash event" className="border-y border-chart-3/40 bg-chart-3/10"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><span className="eyebrow text-chart-3"><Timer size={13}/> COMMUNITY EVENT</span><h2 className="break-words text-lg font-bold">{data.control.flash_title}</h2><p className="text-xs text-muted-foreground">Existing contract rates remain unchanged.</p></div><div className="numeric flex flex-wrap items-center gap-3"><b className="text-lg text-chart-3">{Math.floor(left/3600000)}h {Math.floor(left/60000)%60}m {Math.floor(left/1000)%60}s</b><Button asChild size="sm"><Link to={user ? '/stake' : '/register'}>View packages</Link></Button></div></div></section>}
    {events.length > 0 && <section aria-label="Recorded activity" className="border-b border-border"><div className="mx-auto max-w-7xl px-5 py-3"><div className="flex flex-wrap items-center gap-2 text-xs text-chart-2"><Activity size={14}/><b>RECORDED ACTIVITY</b><span className="text-muted-foreground">Verified deposits · not payout proof</span></div><div className="mt-2 flex gap-6 overflow-x-auto pb-1">{events.map(event => <div key={event.id} className="shrink-0 text-xs"><b>{event.member}</b> · {event.kind} <strong className="text-chart-2">{money(Number(event.amount))}</strong><span className="ml-2 text-muted-foreground">{new Date(event.at).toLocaleDateString('en-GB')}</span></div>)}</div></div></section>}
    {latest && !closed && <div role="status" className="fixed bottom-20 left-3 z-40 flex max-w-[290px] gap-2 rounded-lg border border-chart-2/40 bg-card p-3 text-xs shadow-lg md:bottom-6"><Activity className="shrink-0 text-chart-2" size={18}/><div><b>{latest.member}</b><p>{latest.kind} · {money(Number(latest.amount))}</p><small className="text-muted-foreground">Verified deposit record · not a payout</small></div><Button variant="ghost" size="icon" aria-label="Close recorded activity" className="size-6 shrink-0" onClick={()=>setClosed(true)}><X size={13}/></Button></div>}
  </>;
}

export function DownlineRadar() {
  const { user } = useMember();
  const fetch = useServerFn(getRadar), snapshot = useServerFn(getMemberGrowth);
  const { data: scope } = useQuery({queryKey:['growth-snapshot',user?.id ?? 'public'],queryFn:()=>snapshot(),enabled:!!user,refetchInterval:30000});
  const { data: rows, error } = useQuery({ queryKey:['growth-radar',user?.id], queryFn:()=>fetch(),enabled:!!user && scope?.eligible === true && scope.control?.radar_enabled === true,refetchInterval:60000 });
  const [filter,setFilter] = useState<'potential'|'near'|'dormant'>('potential'), [open,setOpen] = useState(false), [now,setNow] = useState(0);
  useEffect(()=>{setNow(Date.now());},[]);
  if (!scope?.eligible || !scope.control?.radar_enabled) return null;
  const list = rows ?? [], visible = list.filter(row=>radarFlags(row,now)[filter]);
  const followup = (row: RadarMember) => {
    const remaining = Math.max(0,row.target-row.turnover);
    const text = filter==='near' ? `Hello ${row.name || row.code}, your recorded qualification progress is ${Math.round(radarFlags(row,now).progress*100)}%. Remaining turnover: ${money(remaining)}. Would you like to review your options? Returns are not guaranteed.` : `Hello ${row.name || row.code}, checking in from your BIXLINK sponsor. Would you like to discuss the available packages and risks? No obligation to deposit.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
  };
  return <section className="mt-6 border-y border-border py-4" aria-label="Direct member radar"><Button variant="ghost" className="w-full justify-between px-0" onClick={()=>setOpen(!open)} aria-expanded={open}><span className="flex items-center gap-2"><Radar size={18} className="text-chart-2"/> Direct member radar <span className="text-muted-foreground">{list.length}</span></span><ChevronDown size={16} className={open?'rotate-180':''}/></Button>{open && <><div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Radar filter">{([['potential','Potential'],['near','Near target'],['dormant','Dormant']] as const).map(([key,label])=><Button key={key} size="sm" variant={filter===key?'default':'outline'} className="h-auto min-h-10 whitespace-normal" onClick={()=>setFilter(key)}>{label} · {list.filter(row=>radarFlags(row,now)[key]).length}</Button>)}</div><p className="mt-3 text-xs text-muted-foreground">Direct L1 only · Dormant = no recorded wallet activity for over 3 days.</p>{error ? <p role="alert" className="mt-3 text-sm text-destructive">Radar unavailable. Please refresh.</p> : rows === undefined ? <p className="mt-3 text-sm text-muted-foreground">Loading direct members…</p> : !visible.length ? <p className="py-5 text-sm text-muted-foreground">No members in this category.</p> : <div className="mt-3 divide-y divide-border">{visible.map(row=><div key={row.code} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm">{row.name || row.code}</b><span className="block text-xs text-muted-foreground">{row.code} · {row.kind==='loan'?'Loan · 5×':row.kind==='virtual'?'Virtual support · 3×':'Member'}</span><span className="text-xs text-chart-2">{row.target>0 ? `${money(Number(row.turnover))} / ${money(Number(row.target))}` : `Verified deposits ${money(Number(row.deposit_usd))}`}</span></div><Button size="icon" variant="outline" title="Choose a WhatsApp contact" aria-label={`Follow up ${row.code} on WhatsApp`} onClick={()=>followup(row)}><MessageCircle size={17}/></Button></div>)}</div>}<p className="text-xs text-muted-foreground">WhatsApp asks you to choose the contact; no phone number is stored.</p></>}</section>;
}
