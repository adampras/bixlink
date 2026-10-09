import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Wrench, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveSiteControl } from '@/lib/site-control.functions';
import { defaultSiteControl, type SiteControl } from '@/lib/site-control';

export function AdminSiteControl({ initial, onMessage, onSaved }: { initial?: SiteControl | undefined; onMessage: (s: string) => void; onSaved: () => Promise<void> }) {
  const [ctl, setCtl] = useState<SiteControl>({ ...defaultSiteControl, ...initial });
  const [message, setMessage] = useState(initial?.message ?? '');
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveSiteControl);
  const qc = useQueryClient();
  async function apply(next: SiteControl, note: string) {
    setBusy(true);
    try { await save({ data: { maintenance: next.maintenance, staging: next.staging, message } }); setCtl(next); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage(note); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal menyimpan.'); }
    finally { setBusy(false); }
  }
  const row = (icon: React.ReactNode, title: string, detail: string, on: boolean, toggle: () => void) => <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card p-4">
    <div className="min-w-0"><b className="flex items-center gap-2 text-sm">{icon}{title}</b><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
    <Button size="sm" variant={on ? 'default' : 'outline'} className="shrink-0 rounded-full" aria-pressed={on} disabled={busy} onClick={toggle}>{on ? 'ON' : 'OFF'}</Button>
  </div>;
  return <section className="mt-8 grid max-w-3xl gap-3">
    <h2 className="font-display text-xl font-bold">Kontrol Sistem</h2>
    {row(<Eye size={15}/>, 'Pratinjau khusus admin', 'ON: semua perubahan pengaturan hanya terlihat oleh admin; member tetap melihat versi terakhir. OFF: semua perubahan langsung dipublikasikan.', ctl.staging,
      () => { if (ctl.staging && !window.confirm('Publikasikan semua perubahan ke member sekarang?')) return; apply({ ...ctl, staging: !ctl.staging }, ctl.staging ? 'Perubahan dipublikasikan ke semua member.' : 'Pratinjau admin aktif — perubahan hanya terlihat oleh admin.'); })}
    {row(<Wrench size={15}/>, 'Mode maintenance', 'ON: member dan pengunjung melihat halaman pemeliharaan. Admin tetap bisa masuk.', ctl.maintenance,
      () => { if (!window.confirm(ctl.maintenance ? 'Matikan maintenance?' : 'Aktifkan maintenance untuk semua member?')) return; apply({ ...ctl, maintenance: !ctl.maintenance }, ctl.maintenance ? 'Maintenance dimatikan.' : 'Maintenance aktif.'); })}
    <label className="text-xs text-muted-foreground">Pesan maintenance<input className="form-input mt-2" maxLength={240} value={message} placeholder="Sistem BIXLINK sedang dalam pemeliharaan…" onChange={e => setMessage(e.target.value)} onBlur={() => apply(ctl, 'Pesan maintenance disimpan.')}/></label>
    <p className="text-xs text-muted-foreground">Catatan: perubahan paket staking dan konten gambar langsung berlaku; pratinjau mencakup pengaturan tampilan, landing, market, mining, booster dan dompet.</p>
  </section>;
}
