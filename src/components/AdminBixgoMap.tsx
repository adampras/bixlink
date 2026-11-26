import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, ExternalLink, MapPin, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminFold } from '@/components/AdminNavigation';
import { supabase } from '@/integrations/supabase/client';
import { getBixgoMap, reviewBixgoMap, saveBixgoMap } from '@/lib/bixgo-map.functions';
import { mapSettingsSchema } from '@/lib/bixgo-map';
import { useMember } from '@/lib/useMember';

export function AdminBixgoMap() {
  const {user}=useMember(),fetchMap=useServerFn(getBixgoMap),save=useServerFn(saveBixgoMap),review=useServerFn(reviewBixgoMap),qc=useQueryClient();
  const query=useQuery({queryKey:['bixgo-map',user?.id,true],queryFn:()=>fetchMap({data:{admin:true}}),enabled:!!user,staleTime:15000});
  const [settings,setSettings]=useState({enabled:false,reward:0,limit:5,budget:0}),[filter,setFilter]=useState('pending'),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[photos,setPhotos]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({});
  useEffect(()=>{if(query.data){const c=query.data.config;setSettings({enabled:c.enabled,reward:c.reward_bix,limit:c.daily_limit,budget:c.budget_bix});}},[query.data]);
  useEffect(()=>{let alive=true;const paths=query.data?.points.filter(p=>p.photo_path).map(p=>p.photo_path).filter((p):p is string=>!!p)??[];if(!paths.length){setPhotos({});return;}void supabase.storage.from('bixgo-map').createSignedUrls(paths,1800).then(({data})=>{if(!alive)return;const signed:Record<string,string>={};for(const p of data??[]){if(p.path&&p.signedUrl)signed[p.path]=p.signedUrl;}setPhotos(signed);});return()=>{alive=false;};},[query.data]);
  const refresh=()=>qc.invalidateQueries({queryKey:['bixgo-map']});
  return <AdminFold title="Peta Komunitas · BIXGO Rewards" badge="Owner 1"><div className="space-y-4 text-sm" data-no-translate>
    {query.isPending?<p>Memuat peta komunitas…</p>:query.isError?<><p className="text-destructive">{query.error.message}</p><Button variant="outline" onClick={()=>void query.refetch()}>Coba lagi</Button></>:query.data&&<>
      <label className="flex items-center justify-between gap-2"><b>Buka kontribusi peta</b><Switch checked={settings.enabled} disabled={!!busy} onCheckedChange={v=>setSettings(s=>({...s,enabled:v}))}/></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{([['reward','Hadiah per titik (BIX)',1000],['limit','Usulan per hari (UTC)',20],['budget','Anggaran peta (BIX)',1000000]] as const).map(([k,label,max])=><label key={k} className="text-xs">{label}<input type="number" className="form-input mt-1" min={k==='limit'?1:0} max={max} step={k==='limit'?1:'0.000001'} value={settings[k]} onChange={e=>setSettings(s=>({...s,[k]:Number(e.target.value)}))}/></label>)}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">Marketing & Community · maksimum bersama mining 1.000.000 BIX. Hadiah disimpan saat usulan dikirim dan dicadangkan saat disetujui; tidak mengambil cadangan Owner 1.</p>
      <div className="grid grid-cols-2 gap-3 border-y border-border py-3 text-xs"><span>Hadiah peta dicadangkan<b className="mt-1 block">{query.data.summary.map_used.toLocaleString()} BIX</b></span><span>Sisa pool bersama<b className="mt-1 block">{Math.max(0,1000000-query.data.summary.pool_used).toLocaleString()} BIX</b></span></div>
      <Button disabled={!!busy} onClick={async()=>{const parsed=mapSettingsSchema.safeParse(settings);if(!parsed.success){setMessage('Periksa nilai hadiah, kuota dan anggaran.');return;}setBusy('save');setMessage('');try{await save({data:parsed.data});await refresh();setMessage('Pengaturan peta tersimpan.');}catch(e){setMessage(e instanceof Error?e.message:'Gagal menyimpan');}finally{setBusy('');}}}><Save className="h-4 w-4"/>Simpan pengaturan peta</Button>
      <div className="flex flex-wrap gap-1">{[['pending','Menunggu'],['approved','Aktif'],['rejected','Ditolak'],['archived','Diarsipkan']].map(([key,label])=><Button key={key} size="sm" variant={filter===key?'default':'outline'} onClick={()=>setFilter(key??'pending')}>{label}</Button>)}</div>
      <p className="text-[11px] text-muted-foreground">200 usulan terbaru · {query.data.points.filter(p=>p.status===filter).length} dalam daftar ini</p>
      {!query.data.points.some(p=>p.status===filter)&&<p className="py-4 text-xs text-muted-foreground">Belum ada titik pada status ini.</p>}
      {query.data.points.filter(p=>p.status===filter).map(p=><article key={p.id} className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2"><b className="min-w-0 break-words">{p.name}</b><strong className="shrink-0 text-primary">{p.reward_bix} BIX</strong></div>
        <p className="mt-1 break-all text-[10px] text-muted-foreground">ID akun: {p.user_id}</p><p className="mt-1 text-xs">{p.detail}</p><p className="mt-1 text-xs text-muted-foreground">{p.driver_note}</p>
        <p className="mt-2 text-[11px]">{p.is_public?'Publik setelah disetujui':'Privat · tidak muncul di pencarian'}</p>
        {p.photo_path&&photos[p.photo_path]&&<img src={photos[p.photo_path]} alt="Foto patokan" className="mt-2 h-36 w-full rounded-lg object-contain"/>}
        <Button asChild size="sm" variant="ghost" className="mt-2"><a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4"/>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}<ExternalLink className="h-3 w-3"/></a></Button>
        {p.status==='pending'&&<input aria-label={`Catatan ${p.name}`} placeholder="Catatan peninjauan" maxLength={240} className="form-input mt-2" value={notes[p.id]??''} onChange={e=>setNotes(n=>({...n,[p.id]:e.target.value}))}/>}
        <div className="mt-2 flex flex-wrap gap-2">{(p.status==='pending'?['approved','rejected']:p.status==='approved'?['archived']:[]).map(action=><Button key={action} disabled={!!busy} variant={action==='approved'?'default':'outline'} size="sm" onClick={async()=>{if(action!=='approved'&&action!=='rejected'&&action!=='archived')return;if(action==='rejected'&&!(notes[p.id]??'').trim()){setMessage('Tambahkan alasan penolakan terlebih dahulu.');return;}setBusy(p.id);setMessage('');try{await review({data:{id:p.id,action,note:notes[p.id]??''}});await refresh();setMessage('Peninjauan tersimpan.');}catch(e){setMessage(e instanceof Error?e.message:'Peninjauan gagal');}finally{setBusy('');}}}>{action==='approved'?<Check className="h-4 w-4"/>:<X className="h-4 w-4"/>}{action==='approved'?'Setujui & catat hadiah':action==='rejected'?'Tolak':'Arsipkan titik'}</Button>)}</div>
      </article>)}
    </>}
    {message&&<p role="status" className="text-xs text-primary">{message}</p>}
  </div></AdminFold>;
}