import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check, Save, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type ZoomPublic = { enabled: boolean; title: string; url: string | null; schedule: string | null; rewardBix: number; terms: string; sessionKey: string; claimed: string | null };
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function BixZoomLogo({ size = 26 }: { size?: number }) {
  return <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
    <defs><linearGradient id="bzg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--zoom-hi)"/><stop offset=".5" stopColor="var(--zoom-mid)"/><stop offset="1" stopColor="var(--zoom-lo)"/></linearGradient></defs>
    <path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" fill="none" stroke="url(#bzg)" strokeWidth="2.2"/>
    <rect x="11" y="17" width="18" height="14" rx="3.5" fill="url(#bzg)"/>
    <path d="M30 21.5 37 17.5v13L30 26.5Z" fill="url(#bzg)"/>
    <circle cx="20" cy="24" r="3.2" fill="var(--background)"/>
  </svg>;
}

export function BixZoomButton({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['bix-zoom', signedIn], queryFn: async () => { const { data, error } = await rpc('bix_zoom_public'); if (error) throw new Error(error.message); return data as ZoomPublic; } });
  const z = q.data;
  if (z && !z.enabled) return null;
  return <>
    <button type="button" className="zoom-orb" onClick={() => setOpen(true)} aria-label="BIXZOOM Room" title="BIXZOOM Room">
      <BixZoomLogo/>{z && z.rewardBix > 0 && <i className="zoom-live" aria-hidden/>}<span>BIXZOOM</span>
    </button>
    {z && <ZoomDialog z={z} open={open} onClose={() => setOpen(false)} signedIn={signedIn}/>}
  </>;
}

function ZoomDialog({ z, open, onClose, signedIn }: { z: ZoomPublic; open: boolean; onClose: () => void; signedIn: boolean }) {
  const [code, setCode] = useState(''); const [msg, setMsg] = useState<string>(); const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const claim = async () => { setBusy(true); setMsg(undefined); const { error } = await rpc('bix_zoom_claim', { p_code: code }); setBusy(false); if (error) { setMsg(error.message); return; } setMsg('Claim sent. Waiting for owner review.'); setCode(''); await qc.invalidateQueries({ queryKey: ['bix-zoom'] }); };
  return <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
    <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"/><div className="zoom-center"><DialogPrimitive.Content className="zoom-panel zoom-dialog"><DialogPrimitive.Close className="zoom-close" aria-label="Close"><X size={16}/></DialogPrimitive.Close>
      <div className="site-popup__body text-center">
        <div className="zoom-crest"><BixZoomLogo size={40}/></div>
        <span className="site-popup__eyebrow mt-3">BIXZOOM ROOM</span>
        <DialogTitle className="font-display text-lg font-black">{z.title}</DialogTitle>
        <DialogDescription className="mt-1 text-xs">{z.schedule || 'Schedule will be announced by the owner.'}</DialogDescription>
        {z.rewardBix > 0 && <p className="zoom-reward mt-3">EARN {z.rewardBix} BIX · attendance reward</p>}
        {z.url ? <Button asChild className="mt-4 w-full"><a href={z.url} target="_blank" rel="noopener noreferrer">ENTER ZOOM ROOM</a></Button> : <p className="mt-4 text-xs text-muted-foreground">Room link not open yet.</p>}
        {z.rewardBix > 0 && (signedIn ? (z.claimed ? <p className="mt-3 text-xs font-bold text-chart-3">Claim status: {z.claimed}</p> : <div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><input className="form-input" maxLength={40} placeholder="Attendance code from host" value={code} onChange={e => setCode(e.target.value)}/><Button disabled={busy || !code.trim()} onClick={() => void claim()}>Claim</Button></div>) : <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/auth">Sign in to claim reward</Link></Button>)}
        {msg && <p className="mt-2 text-xs">{msg}</p>}
        {z.terms && <details className="mt-3 text-left text-[11px] text-muted-foreground"><summary className="cursor-pointer font-bold">Terms & conditions</summary><p className="mt-2 whitespace-pre-line">{z.terms}</p></details>}
        <Link to="/studio" className="mt-3 block text-[11px] font-bold text-primary underline">BIX Studio · Banner & presentation maker</Link>
        <p className="mt-3 text-[10px] text-muted-foreground">Rewards are reviewed by the owner before credit. Terms apply.</p>
      </div>
    </DialogPrimitive.Content></div></DialogPrimitive.Portal>
  </Dialog>;
}

type ZoomAdmin = { enabled: boolean; title: string; url: string | null; schedule: string | null; reward_bix: number; terms: string; passcode: string | null; session_key: string };
type Claim = { id: string; user_id: string; session_key: string; amount_bix: number; status: string; created_at: string };

export function AdminBixZoom({ onMessage }: { onMessage: (m: string) => void }) {
  const [f, setF] = useState<ZoomAdmin>(); const [busy, setBusy] = useState(false);
  const claims = useQuery({ queryKey: ['bix-zoom-claims'], queryFn: async () => { const { data, error } = await supabase.from('bix_zoom_claims' as never).select('*').eq('status', 'pending').order('created_at').limit(100); if (error) throw error; return (data ?? []) as unknown as Claim[]; } });
  useEffect(() => { void rpc('bix_zoom_admin').then(({ data }) => setF(data as ZoomAdmin)); }, []);
  if (!f) return null;
  const save = async () => { setBusy(true); const { error } = await rpc('bix_zoom_save', { p: { enabled: f.enabled, title: f.title, url: f.url ?? '', schedule: f.schedule ?? '', rewardBix: Number(f.reward_bix) || 0, terms: f.terms, passcode: f.passcode ?? '', sessionKey: f.session_key } }); setBusy(false); onMessage(error ? error.message : 'BIXZOOM saved.'); };
  const review = async (id: string, ok: boolean) => { const { error } = await rpc('bix_zoom_review', { p_claim: id, p_approve: ok }); onMessage(error ? error.message : ok ? 'Reward credited.' : 'Claim rejected.'); await claims.refetch(); };
  return <section className="mt-8 space-y-3 border-b border-border pb-6">
    <div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">BIXZOOM Room</h3><Button size="sm" variant={f.enabled ? 'default' : 'outline'} onClick={() => setF({ ...f, enabled: !f.enabled })}>{f.enabled ? 'ON' : 'OFF'}</Button></div>
    <p className="text-xs text-muted-foreground">Gold button in the middle of the social icons. Change the session code for every new meeting so members can claim again.</p>
    <input className="form-input" maxLength={80} placeholder="Room title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })}/>
    <input className="form-input" maxLength={300} placeholder="https://zoom.us/j/…" value={f.url ?? ''} onChange={e => setF({ ...f, url: e.target.value })}/>
    <input className="form-input" maxLength={120} placeholder="Schedule (e.g. Every Friday 20:00 WITA)" value={f.schedule ?? ''} onChange={e => setF({ ...f, schedule: e.target.value })}/>
    <div className="grid grid-cols-3 gap-2"><label className="text-[11px] text-muted-foreground">Reward BIX<input className="form-input mt-1" type="number" min={0} max={10000} value={f.reward_bix} onChange={e => setF({ ...f, reward_bix: Number(e.target.value) })}/></label><label className="text-[11px] text-muted-foreground">Attendance code<input className="form-input mt-1" maxLength={40} value={f.passcode ?? ''} onChange={e => setF({ ...f, passcode: e.target.value })}/></label><label className="text-[11px] text-muted-foreground">Session code<input className="form-input mt-1" maxLength={40} value={f.session_key} onChange={e => setF({ ...f, session_key: e.target.value })}/></label></div>
    <textarea className="form-input min-h-24" maxLength={2000} placeholder="Terms & conditions" value={f.terms} onChange={e => setF({ ...f, terms: e.target.value })}/>
    <Button disabled={busy} onClick={() => void save()}><Save/> Save BIXZOOM</Button>
    <h4 className="pt-2 text-sm font-bold">Pending reward claims ({claims.data?.length ?? 0})</h4>
    {claims.data?.map(c => <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs"><span className="min-w-0 truncate font-mono">{c.user_id.slice(0, 8)} · {c.session_key} · {c.amount_bix} BIX</span><span className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Approve" onClick={() => void review(c.id, true)}><Check/></Button><Button size="icon" variant="ghost" aria-label="Reject" onClick={() => void review(c.id, false)}><X/></Button></span></div>)}
  </section>;
}
