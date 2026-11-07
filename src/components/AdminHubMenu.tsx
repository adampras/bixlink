import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ChevronDown, Shuffle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { updateDockHub } from '@/lib/bixlink.functions';
import { usePublicConfig } from '@/lib/useMember';
import { HUB_GROUPS, HUB_ITEMS, hubVisible, hubOrdered } from '@/lib/dock-hub';

const DEFAULT_ORDER = HUB_ITEMS.map(i => i.id as string);

/** Owner control: show/hide and position menus inside the mobile BIX HUB sheet. */
export function AdminHubMenu() {
  const { data } = usePublicConfig(); const save = useServerFn(updateDockHub); const qc = useQueryClient();
  const [cfg, setCfg] = useState<Record<string, boolean>>({}); const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { setCfg(data?.readiness.dockHub ?? {}); }, [data?.readiness.dockHub]);
  useEffect(() => { setOrder(hubOrdered(HUB_ITEMS, data?.readiness.dockOrder).map(i => i.id)); }, [data?.readiness.dockOrder]);
  const ordered = hubOrdered(HUB_ITEMS, order);
  const shown = HUB_ITEMS.filter(i => hubVisible(cfg, i.id)).length;
  const setAll = (v: boolean) => setCfg(Object.fromEntries(HUB_ITEMS.map(i => [i.id, v])));
  const move = (g: string, id: string, dir: -1 | 1) => {
    const ids = ordered.filter(i => i.group === g).map(i => i.id as string); const k = ids.indexOf(id); const j = k + dir;
    if (j < 0 || j >= ids.length) return; [ids[k], ids[j]] = [ids[j]!, ids[k]!];
    let n = 0; setOrder(ordered.map(i => i.group === g ? ids[n++]! : i.id));
  };
  const shuffleGroup = (g?: string) => {
    const byGroup: Record<string, string[]> = {};
    ordered.forEach(i => { (byGroup[i.group] ??= []).push(i.id); });
    Object.keys(byGroup).forEach(k => { if (g && k !== g) return; const a = byGroup[k]!; for (let i = a.length - 1; i > 0; i--) { const r = Math.floor(Math.random() * (i + 1)); [a[i], a[r]] = [a[r]!, a[i]!]; } });
    const idx: Record<string, number> = {}; setOrder(ordered.map(i => byGroup[i.group]![idx[i.group] = (idx[i.group] ?? -1) + 1]!));
  };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">Menu tampil di HUB: <b className="text-foreground">{shown}/{HUB_ITEMS.length}</b>. Admin selalu melihat semua menu.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setAll(true)}>Tampilkan semua</Button>
        <Button size="sm" variant="outline" onClick={() => setAll(false)}>Sembunyikan semua</Button>
        <Button size="sm" variant="outline" onClick={() => shuffleGroup()}><Shuffle size={14}/> Acak semua</Button>
        <Button size="sm" variant="outline" onClick={() => setOrder(DEFAULT_ORDER)}><RotateCcw size={14}/> Urutan bawaan</Button>
      </div>
    </div>
    {HUB_GROUPS.map(g => { const list = ordered.filter(i => i.group === g); return <div key={g}>
      <div className="mb-1 flex items-center justify-between"><h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{g}</h4><button type="button" onClick={() => shuffleGroup(g)} className="flex items-center gap-1 text-[11px] text-primary"><Shuffle size={12}/> Acak</button></div>
      <div className="grid gap-2 sm:grid-cols-2">{list.map((it, n) => <div key={it.id} className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-2 py-2 text-sm">
        <span className="w-5 text-center text-xs font-black text-muted-foreground tabular-nums">{n + 1}</span>
        <div className="flex flex-col"><button type="button" aria-label="Naik" disabled={n === 0} onClick={() => move(g, it.id, -1)} className="disabled:opacity-30"><ChevronUp size={14}/></button><button type="button" aria-label="Turun" disabled={n === list.length - 1} onClick={() => move(g, it.id, 1)} className="disabled:opacity-30"><ChevronDown size={14}/></button></div>
        <span className="min-w-0 flex-1 truncate">{it.label} <small className="text-muted-foreground">{it.note}</small></span>
        <Switch checked={hubVisible(cfg, it.id)} onCheckedChange={v => setCfg(c => ({ ...c, [it.id]: v }))}/>
      </div>)}</div>
    </div>; })}
    {msg && <p className="text-xs text-primary">{msg}</p>}
    <Button disabled={busy} onClick={async () => { setMsg(''); setBusy(true); try { await save({ data: { dockHub: cfg, dockOrder: order } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); setMsg('Menu & posisi HUB tersimpan.'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); } finally { setBusy(false); } }}>Save HUB menu</Button>
  </div>;
}
