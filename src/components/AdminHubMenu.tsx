import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateDockHub } from '@/lib/bixlink.functions';
import { usePublicConfig } from '@/lib/useMember';
import { HUB_GROUPS, HUB_ITEMS, hubVisible } from '@/lib/dock-hub';

/** Owner control: add/remove menus shown inside the mobile BIX HUB sheet. */
export function AdminHubMenu() {
  const { data } = usePublicConfig(); const save = useServerFn(updateDockHub); const qc = useQueryClient();
  const [cfg, setCfg] = useState<Record<string, boolean>>({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { setCfg(data?.readiness.dockHub ?? {}); }, [data?.readiness.dockHub]);
  const shown = HUB_ITEMS.filter(i => hubVisible(cfg, i.id)).length;
  const setAll = (v: boolean) => setCfg(Object.fromEntries(HUB_ITEMS.map(i => [i.id, v])));
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">Menu tampil di HUB: <b className="text-foreground">{shown}/{HUB_ITEMS.length}</b>. Admin selalu melihat semua menu.</p>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setAll(true)}>Tampilkan semua</Button><Button size="sm" variant="outline" onClick={() => setAll(false)}>Sembunyikan semua</Button></div>
    </div>
    {HUB_GROUPS.map(g => <div key={g}>
      <h4 className="mb-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{g}</h4>
      <div className="grid gap-2 sm:grid-cols-2">{HUB_ITEMS.filter(i => i.group === g).map(it => <label key={it.id} className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2 text-sm"><span>{it.label} <small className="text-muted-foreground">{it.note}</small></span><Switch checked={hubVisible(cfg, it.id)} onCheckedChange={v => setCfg(c => ({ ...c, [it.id]: v }))}/></label>)}</div>
    </div>)}
    {msg && <p className="text-xs text-primary">{msg}</p>}
    <Button disabled={busy} onClick={async () => { setMsg(''); setBusy(true); try { await save({ data: { dockHub: cfg } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); setMsg('Menu HUB tersimpan.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); } finally { setBusy(false); } }}>Save HUB menu</Button>
  </div>;
}
