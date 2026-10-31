import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { readBixtrade, type BixtradeSettings } from '@/lib/bixtrade';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminFold } from '@/components/AdminNavigation';

export function AdminBixtrade({ initial, onMessage, onSaved }: { initial?: unknown; onMessage: (m: string) => void; onSaved?: () => void }) {
  const [s, setS] = useState<BixtradeSettings>(() => readBixtrade(initial));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(updateSetting);
  useEffect(() => { setS(readBixtrade(initial)); }, [initial]);
  const num = (k: keyof BixtradeSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS(v => ({ ...v, [k]: Number(e.target.value) }));
  const submit = async (next = s) => {
    setBusy(true);
    try { await save({ data: { key: 'bixtrade', value: next } }); setS(next); onMessage(`BIXTrade disimpan · ${next.enabled ? 'AKTIF' : 'Under Reconstruction'}.`); onSaved?.(); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal menyimpan BIXTrade.'); } finally { setBusy(false); }
  };
  return <AdminFold title="BIXTrade Bot Arbitrase" tone="gold" badge={s.enabled ? 'AKTIF' : 'UNDER RECONSTRUCTION'}>
    <div className="mt-4 grid gap-4 text-xs">
      <label className="flex items-center justify-between gap-3"><span><b>Buka halaman BIXTrade</b><br/><span className="text-muted-foreground">Saat ditutup, member melihat “Under Reconstruction”.</span></span>
        <Switch checked={s.enabled} disabled={busy} onCheckedChange={v => submit({ ...s, enabled: v })}/></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Profit harian minimum (%)<input className="form-input mt-1" type="number" step="0.01" min={0} max={5} value={s.minDailyPct} onChange={num('minDailyPct')}/></label>
        <label>Profit harian maksimum (%)<input className="form-input mt-1" type="number" step="0.01" min={0} max={5} value={s.maxDailyPct} onChange={num('maxDailyPct')}/></label>
        <label>Win rate tampilan (%)<input className="form-input mt-1" type="number" min={50} max={99} value={s.winRate} onChange={num('winRate')}/></label>
        <label>Alokasi minimum (USDT)<input className="form-input mt-1" type="number" min={10} value={s.minAlloc} onChange={num('minAlloc')}/></label>
        <label>Alokasi maksimum (USDT)<input className="form-input mt-1" type="number" min={10} value={s.maxAlloc} onChange={num('maxAlloc')}/></label>
        <label>Pesan saat ditutup<input className="form-input mt-1" maxLength={200} value={s.notice ?? ''} onChange={e => setS(v => ({ ...v, notice: e.target.value }))}/></label>
      </div>
      <p className="text-muted-foreground">Angka profit hanya proyeksi tampilan; tidak menambah saldo member.</p>
      <Button disabled={busy} onClick={() => submit()}>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</Button>
    </div>
  </AdminFold>;
}
