import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Wrench, Eye, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSiteControl } from '@/lib/site-control.functions';
import { defaultSiteControl, type SiteControl } from '@/lib/site-control';

export function AdminSiteControl({ initial, onMessage, onSaved }: { initial?: SiteControl | undefined; onMessage: (s: string) => void; onSaved: () => Promise<void> }) {
  const [ctl, setCtl] = useState<SiteControl>({ ...defaultSiteControl, ...initial });
  const [message, setMessage] = useState(initial?.message ?? '');
  const [landingMessage, setLandingMessage] = useState(initial?.landingMessage ?? '');
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveSiteControl);
  const qc = useQueryClient();
  async function apply(next: SiteControl, note: string) {
    setBusy(true);
    try { await save({ data: { maintenance: next.maintenance, staging: next.staging, message, landingClosed: !!next.landingClosed, landingMessage } }); setCtl(next); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage(note); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setBusy(false); }
  }
  const row = (icon: React.ReactNode, title: string, detail: string, on: boolean, toggle: () => void) => <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card p-4">
    <div className="min-w-0"><b className="flex items-center gap-2 text-sm">{icon}{title}</b><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
    <Button size="sm" variant={on ? 'default' : 'outline'} className="shrink-0 rounded-full" aria-pressed={on} disabled={busy} onClick={toggle}>{on ? 'ON' : 'OFF'}</Button>
  </div>;
  return <section className="mt-8 grid max-w-3xl gap-3">
    <h2 className="font-display text-xl font-bold">Kontrol Sistem</h2>
    {row(<Eye size={15}/>, 'Pratinjau khusus admin', 'ON: all setting changes are visible only to admins; members continue to see the latest version. OFF: all changes are published immediately.', ctl.staging,
      () => { if (ctl.staging && !window.confirm('Publish all changes to members now?')) return; apply({ ...ctl, staging: !ctl.staging }, ctl.staging ? 'Changes published to all members.' : 'Admin preview active — changes are only visible to admins.'); })}
    {row(<Wrench size={15}/>, 'Mode maintenance', 'ON: members and visitors see the maintenance page. Admins can still log in.', ctl.maintenance,
      () => { if (!window.confirm(ctl.maintenance ? 'Matikan maintenance?' : 'Enable maintenance for all members?')) return; apply({ ...ctl, maintenance: !ctl.maintenance }, ctl.maintenance ? 'Maintenance dimatikan.' : 'Maintenance active.'); })}
    <label className="text-xs text-muted-foreground">Maintenance message<input className="form-input mt-2" maxLength={240} value={message} placeholder="BIXLINK system is under maintenance…" onChange={e => setMessage(e.target.value)} onBlur={() => apply(ctl, 'Maintenance message saved.')}/></label>
    {row(<LayoutTemplate size={15}/>, 'Landing page ditutup', 'ON: visitors see the Under Reconstruction screen on the front page (login button remains). Admins can still view the original landing page via the preview button.', !!ctl.landingClosed,
      () => apply({ ...ctl, landingClosed: !ctl.landingClosed }, ctl.landingClosed ? 'Landing page opened to the public.' : 'Landing page closed — visible to admins only.'))}
    <label className="text-xs text-muted-foreground">Landing closed message<input className="form-input mt-2" maxLength={240} value={landingMessage} placeholder="BIXLINK landing page is being updated…" onChange={e => setLandingMessage(e.target.value)} onBlur={() => apply(ctl, 'Landing message saved.')}/></label>
    <a href="/?landing=1" target="_blank" rel="noopener" className="w-fit rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-card">Pratinjau landing (admin)</a>
    <p className="text-xs text-muted-foreground">Note: changes to staking packages and image content take effect immediately; preview covers display, landing, market, mining, booster, and wallet settings.</p>
  </section>;
}
