import { lazy, Suspense, useEffect, useState } from 'react';
import { ClientOnly, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Camera, Check, Crosshair, Gift, Loader2, MapPin, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useMember } from '@/lib/useMember';
import { useBixgoText } from '@/lib/useBixgoText';
import { getDevicePosition } from '@/lib/geo';
import { categoryLabel, contributorRank, MAP_CATEGORIES, mapPointSchema } from '@/lib/bixgo-map';
import { claimBixgoMap, getBixgoMap, submitBixgoMap } from '@/lib/bixgo-map.functions';
import { BixgoProfilePhoto } from '@/components/BixgoProfilePhoto';

const Map = lazy(() => import('@/components/BixgoLiveMap'));
export const mapStatus: Record<string,string> = { pending:'Pending review', approved:'Approved', rejected:'Rejected', archived:'Archived' };
export function BixgoCommunityMap() {
  const { user } = useMember();
  const text = useBixgoText();
  const fetchMap = useServerFn(getBixgoMap), claim = useServerFn(claimBixgoMap);
  const qc = useQueryClient();
  const query = useQuery({ queryKey:['bixgo-map',user?.id,false],queryFn:()=>fetchMap({data:{admin:false}}), enabled:!!user, staleTime:15000,refetchInterval:30000 });
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false);
  if (!user) return <div className="px-4 py-5"><Button asChild variant="outline"><Link to="/auth"><MapPin/>{text('Sign in to contribute')}</Link></Button></div>;
  if (query.isPending) return <p className="px-4 py-5 text-sm text-muted-foreground">{text('Loading rewards…')}</p>;
  if (!query.data || query.isError) return <div className="px-4 py-5"><p className="text-sm text-destructive">{text('Mapping data unavailable. Retry.')}</p><Button variant="outline" onClick={()=>void query.refetch()}><RefreshCw/>{text('Retry')}</Button></div>;
  const {config,summary,points,claims} = query.data;
  return <div className="px-4 pt-4" data-no-translate>
    <BixgoProfilePhoto userId={user.id}/>
    <section className="mt-5 border-y border-border py-4">
      <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-base font-bold"><Gift className="h-5 w-5 text-primary"/>BIXGO Rewards</h3><Button size="icon" variant="ghost" title={text('Refresh')} aria-label={text('Refresh')} onClick={()=>void query.refetch()}><RefreshCw className="h-4 w-4"/></Button></div>
      <div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">{text('Available')}</p><p className="mt-1 text-2xl font-bold tabular-nums">{summary.available.toLocaleString()} <small className="text-sm text-primary">BIX</small></p></div><div><p className="text-xs text-muted-foreground">{text('Pending estimate')}</p><p className="mt-1 text-xl font-semibold tabular-nums text-muted-foreground">{summary.pending.toLocaleString()} <small className="text-xs">BIX</small></p></div></div>
      <Button className="mt-4 h-auto min-h-10 w-full whitespace-normal" disabled={busy||summary.available<=0} onClick={async()=>{setBusy(true);try{const r=await claim();toast.success(`${r.claimed} BIX · ${text('Transferred to Wallet')}`);await Promise.all([qc.invalidateQueries({queryKey:['bixgo-map']}),qc.invalidateQueries({queryKey:['my-bixlink']}),qc.invalidateQueries({queryKey:['bix-mining-conversion']})]);}catch(e){toast.error(e instanceof Error?e.message:text('Transfer failed'));}finally{setBusy(false);}}}><Wallet className="h-4 w-4"/>{text(busy?'Transferring…':'Transfer to main Wallet')}</Button>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{text('Map rewards only. Pending estimates cannot be spent. Trip and store payments keep their existing settlement.')}</p>
    </section>
    <Button variant="ghost" className="mt-3 h-auto w-full justify-between gap-3 rounded-none px-0 py-3 text-left" onClick={()=>setOpen(true)}><span className="flex min-w-0 items-center gap-3"><MapPin className="h-6 w-6 shrink-0 text-primary"/><span className="whitespace-normal"><b className="block text-sm">{text('Community Map')}</b><small className="text-muted-foreground">{text('Contribute a place · Earn BIX')}</small></span></span><span className="shrink-0 text-xs text-primary">{config.reward_bix} BIX</span></Button>
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4"/>{text(contributorRank(summary.approved))} · {summary.approved} {text('approved points')}</p>
    <details className="mt-4 border-t border-border py-3"><summary className="cursor-pointer text-sm font-semibold">{text('My contributions')} ({summary.submitted})</summary><div className="mt-3 space-y-2">{!points.length&&<p className="text-xs text-muted-foreground">{text('No contributions yet.')}</p>}{points.map(p=><div key={p.id} className="rounded-lg border border-border bg-card p-3"><div className="flex items-start justify-between gap-2"><b className="min-w-0 break-words text-sm">{p.name}</b><span className="shrink-0 text-[10px] text-primary">{text(mapStatus[p.status]??p.status)}</span></div><p className="mt-1 text-xs text-muted-foreground">{p.reward_bix} BIX · {text(p.claimed_at?'Transferred':p.status==='pending'?'Estimate':'Reward')} · {text(p.is_public?'Public point':'Private point')}</p>{p.review_note&&<p className="mt-1 text-xs">{p.review_note}</p>}</div>)}</div></details>
    <details className="border-t border-border py-3"><summary className="cursor-pointer text-sm font-semibold">{text('Transfer history')} · {summary.transferred} BIX</summary>{claims.map(c=><p key={c.id} className="mt-2 flex justify-between gap-2 text-xs"><span>{new Date(c.created_at).toLocaleDateString()}</span><b>{c.amount_bix} BIX</b></p>)}</details>
    <MapContribution open={open} onOpenChange={setOpen} uid={user.id} enabled={config.enabled} reward={config.reward_bix} limit={config.daily_limit} onSaved={()=>void qc.invalidateQueries({queryKey:['bixgo-map']})}/>
  </div>;
}

function MapContribution({open,onOpenChange,uid,enabled,reward,limit,onSaved}:{open:boolean;onOpenChange:(v:boolean)=>void;uid:string;enabled:boolean;reward:number;limit:number;onSaved:()=>void}) {
  const text=useBixgoText(),submit=useServerFn(submitBixgoMap);
  const [point,setPoint]=useState<{lat:number;lng:number}|null>(null),[name,setName]=useState(''),[category,setCategory]=useState<typeof MAP_CATEGORIES[number]>('entrance'),[detail,setDetail]=useState(''),[note,setNote]=useState(''),[publish,setPublish]=useState(false),[file,setFile]=useState<File|null>(null),[photoUrl,setPhotoUrl]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState('');
  useEffect(()=>{if(!file){setPhotoUrl('');return;}const url=URL.createObjectURL(file);setPhotoUrl(url);return()=>URL.revokeObjectURL(url);},[file]);
  const locate=async()=>{setBusy('gps');setError('');try{const p=await getDevicePosition();setPoint({lat:p.lat,lng:p.lng});}catch(e){setError(e instanceof Error?e.message:'GPS unavailable');}finally{setBusy('');}};
  return <Dialog open={open} onOpenChange={v=>{if(!busy)onOpenChange(v);}}><DialogContent className="!z-[1500] !max-h-[90dvh] !overflow-y-auto !bg-background" data-no-translate><DialogTitle>{text('Community Map')}</DialogTitle><DialogDescription>{enabled?`${reward} BIX · ${text('per approved point')} · ${limit} ${text('submissions per day (UTC)')}`:text('Community mapping is closed')}</DialogDescription>
    <form className="min-w-0 space-y-3 [&_input]:min-w-0 [&_select]:min-w-0 [&_textarea]:min-w-0 [&_label]:min-w-0 [&_label]:break-words" onSubmit={async e=>{e.preventDefault();setError('');if(!point){setError(text('Choose a map position first'));return;}const parsed=mapPointSchema.safeParse({name,category,...point,detail,note,photo:null,public:publish});if(!parsed.success){setError(text('Complete the location details'));return;}setBusy('submit');let path:string|null=null;let submitted=false;try{if(file){const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';path=`${uid}/${crypto.randomUUID()}.${ext}`;const upload=await supabase.storage.from('bixgo-map').upload(path,file,{contentType:file.type});if(upload.error)throw new Error(text('Photo upload failed. Retry.'));}await submit({data:{...parsed.data,photo:path}});submitted=true;onSaved();toast.success(text('Point sent for review'));setName('');setDetail('');setNote('');setFile(null);setPublish(false);onOpenChange(false);}catch(er){setError(er instanceof Error?er.message:text('Submission failed'));if(path&&!submitted)await supabase.storage.from('bixgo-map').remove([path]);}finally{setBusy('');}}}>
      <Button type="button" variant="outline" disabled={!!busy||!enabled} className="w-full" onClick={()=>void locate()}>{busy==='gps'?<Loader2 className="h-4 w-4 animate-spin"/>:<Crosshair className="h-4 w-4"/>}{text('Use my GPS position')}</Button>
      <div className="relative h-48 overflow-hidden rounded-lg border border-border"><ClientOnly fallback={<p className="p-4 text-xs">{text('Loading map…')}</p>}><Suspense fallback={<p className="p-4 text-xs">{text('Loading map…')}</p>}><Map from={point} to={null} active="from" onPick={p=>{if(!busy&&enabled)setPoint(p);}}/></Suspense></ClientOnly></div>
      {point&&<p className="text-[11px] text-muted-foreground">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>}
      <label className="block text-xs font-semibold">{text('Place name')}<input className="form-input mt-1" required minLength={3} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="block text-xs font-semibold">{text('Category')}<select className="form-input mt-1" value={category} onChange={e=>{const parsed=mapPointSchema.shape.category.safeParse(e.target.value);if(parsed.success)setCategory(parsed.data);}}>{MAP_CATEGORIES.map(c=><option key={c} value={c}>{text(categoryLabel[c])}</option>)}</select></label>
      <label className="block text-xs font-semibold">{text('Detailed address')}<input className="form-input mt-1" maxLength={200} value={detail} onChange={e=>setDetail(e.target.value)}/></label>
      <label className="block text-xs font-semibold">{text('Driver directions')}<textarea className="form-input mt-1" rows={2} maxLength={120} value={note} onChange={e=>setNote(e.target.value)}/></label>
      <label className="flex cursor-pointer items-center gap-2 text-xs"><Camera className="h-4 w-4"/>{text('Landmark photo (optional)')}<input aria-label={text('Landmark photo')} type="file" accept="image/jpeg,image/png,image/webp" className="min-w-0 max-w-[55%] text-[10px]" onChange={e=>{const f=e.target.files?.[0];if(!f){setFile(null);return;}if(f.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type)){setError(text('Use JPG, PNG or WebP up to 3 MB'));e.target.value='';return;}setFile(f);setError('');}}/></label>
      {photoUrl&&<img src={photoUrl} alt={text('Landmark photo')} className="h-28 w-full rounded-lg object-contain"/>}
      <label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)} className="mt-1 shrink-0"/>{text('I have permission to publish this location and directions for everyone. Photos remain private to me and Admin 1.')}</label>
      <p className="text-[11px] text-muted-foreground">{text('Unchecked locations stay private and do not appear in public search. Rewards require Admin 1 approval; duplicates may be rejected.')}</p>
      {error&&<p role="alert" className="text-xs text-destructive">{text(error)}</p>}
      <Button disabled={!enabled||!!busy||!point} type="submit" className="w-full">{busy==='submit'?<Loader2 className="h-4 w-4 animate-spin"/>:<Check className="h-4 w-4"/>}{text('Submit location')}</Button>
    </form>
  </DialogContent></Dialog>;
}