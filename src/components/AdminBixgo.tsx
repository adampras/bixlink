import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { BIXGO_SERVICES, readBixgo, type BixgoService, type BixgoSettings } from '@/lib/bixgo';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminFold } from '@/components/AdminNavigation';
import { AdminFranchise, AdminPpob } from '@/components/AdminBixgoExtras';

export function AdminBixgo({ initial, onMessage, onSaved }: { initial?: unknown; onMessage: (m: string) => void; onSaved?: () => void }) {
  const [s, setS] = useState<BixgoSettings>(() => readBixgo(initial));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(updateSetting);
  useEffect(() => { setS(readBixgo(initial)); }, [initial]);
  const submit = async (v: BixgoSettings) => { setBusy(true); setS(v); try { await save({ data: { key: 'bixgo', value: v } }); onMessage('BIXGO settings saved.'); onSaved?.(); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save BIXGO'); } finally { setBusy(false); } };
  const svc = (k: BixgoService, f: 'baseIdr' | 'perKmIdr', v: number) => setS({ ...s, services: { ...s.services, [k]: { ...s.services[k], [f]: v } } });
  const num = (k: 'commissionPct' | 'bixDiscountPct' | 'usdtIdr', label: string) => <label className="text-xs">{label}<input className="form-input mt-1" type="number" value={s[k]} onChange={e => setS({ ...s, [k]: Number(e.target.value) })}/></label>;
  return <AdminFold title="BIXGO Super-App" badge={s.enabled ? 'Terbuka' : 'Under reconstruction'}>
    <div className="space-y-3 text-sm">
      <label className="flex items-center justify-between"><b>Open BIXGO page</b><Switch checked={s.enabled} disabled={busy} onCheckedChange={v => submit({ ...s, enabled: v })}/></label>
      <label className="block text-xs">Message when closed<input className="form-input mt-1" value={s.notice} maxLength={240} onChange={e => setS({ ...s, notice: e.target.value })}/></label>
      <div className="grid grid-cols-3 gap-2">{num('commissionPct', 'Komisi (%)')}{num('bixDiscountPct', 'Diskon BIX (%)')}{num('usdtIdr', 'Kurs 1 USDT (Rp)')}</div>
      {BIXGO_SERVICES.map(x => <div key={x.key} className="rounded-xl border border-border p-2">
        <label className="flex items-center justify-between"><b>{x.name}</b><Switch checked={s.services[x.key].enabled} disabled={busy} onCheckedChange={v => submit({ ...s, services: { ...s.services, [x.key]: { ...s.services[x.key], enabled: v } } })}/></label>
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs"><label>Tarif dasar (Rp)<input className="form-input mt-1" type="number" value={s.services[x.key].baseIdr} onChange={e => svc(x.key, 'baseIdr', Number(e.target.value))}/></label><label>Per km (Rp)<input className="form-input mt-1" type="number" value={s.services[x.key].perKmIdr} onChange={e => svc(x.key, 'perKmIdr', Number(e.target.value))}/></label></div>
      </div>)}
      <AdminFranchise s={s} setS={setS}/>
      <AdminPpob s={s} setS={setS}/>
      <Button className="w-full" disabled={busy} onClick={() => submit(s)}>Save BIXGO</Button>
    </div>
  </AdminFold>;
}
