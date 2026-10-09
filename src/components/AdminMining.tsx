import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';

export type MiningSettings = {
  enabled?: boolean;
  ratePerDay?: number;
  mode?: 'day' | 'second';
  stakeBoostPct?: number;
};

export function AdminMining({ initial, onMessage, onSaved }: { initial: MiningSettings | undefined; onMessage: (msg: string) => void; onSaved: () => Promise<void> }) {
  const save = useServerFn(updateSetting);
  const [enabled, setEnabled] = useState(Boolean(initial?.enabled));
  const [ratePerDay, setRatePerDay] = useState(String(initial?.ratePerDay ?? ''));
  const [mode, setMode] = useState<'day' | 'second'>(initial?.mode === 'second' ? 'second' : 'day');
  const [stakeBoostPct, setStakeBoostPct] = useState(String(initial?.stakeBoostPct ?? ''));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(ratePerDay);
    const boost = Number(stakeBoostPct || 0);
    if (!(rate > 0) || rate > 100) { onMessage('Laju harian harus lebih dari 0 dan maksimal 100 BIX.'); return; }
    if (boost < 0 || boost > 100) { onMessage('Bonus staking harus antara 0–100%.'); return; }
    setBusy(true);
    try {
      await save({ data: { key: 'mining', value: { enabled, ratePerDay: rate, mode, stakeBoostPct: boost } } });
      await onSaved();
      onMessage('Pengaturan mining tersimpan.');
    } catch { onMessage('Could not save mining settings.'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid max-w-xl gap-4 rounded-[20px] border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Mesin mining BIX</h2>
          <p className="mt-1 text-xs text-muted-foreground">Pool 1.000.000 BIX dari alokasi Marketing & Community. Batas 100 BIX per akun, hanya setelah verifikasi email.</p>
        </div>
        <Button type="button" size="sm" variant={enabled ? 'default' : 'outline'} className="rounded-full" onClick={() => setEnabled(!enabled)}>{enabled ? 'ON' : 'OFF'}</Button>
      </div>
      <label className="grid gap-1 text-xs text-muted-foreground">Laju mining (BIX per hari)
        <input className="form-input" type="number" min="0" max="100" step="0.000001" value={ratePerDay} onChange={e => setRatePerDay(e.target.value)} placeholder="contoh: 1" required />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">Mode tampilan timer
        <select className="form-input" value={mode} onChange={e => setMode(e.target.value as 'day' | 'second')}>
          <option value="day">Per hari</option>
          <option value="second">Timer detik</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">Kenaikan hashrate dari staking (%)
        <input className="form-input" type="number" min="0" max="100" step="1" value={stakeBoostPct} onChange={e => setStakeBoostPct(e.target.value)} placeholder="contoh: 10" />
      </label>
      <Button className="rounded-full" disabled={busy}>{busy ? 'Saving…' : 'Simpan pengaturan'}</Button>
      <p className="text-xs text-muted-foreground">Catatan: pengaturan ini baru tersimpan sebagai konfigurasi. Penghitungan hadiah mining ke saldo member belum aktif dan akan menyusul setelah Anda setujui.</p>
    </form>
  );
}
