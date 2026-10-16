import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePublicConfig } from '@/lib/useMember';
import { isMiningVisible } from '@/lib/mining-visibility';
import { miningConversionSchema } from '@/lib/mining-conversion';

export type MiningSettings = {
  enabled?: boolean;
  ratePerDay?: number;
  mode?: 'day' | 'second';
  stakeBoostPct?: number;
};

export function AdminMining({ initial, onMessage, onSaved }: { initial: MiningSettings | undefined; onMessage: (msg: string) => void; onSaved: () => Promise<void> }) {
  const save = useServerFn(updateSetting);
  const { data: config } = usePublicConfig();
  const queryClient = useQueryClient();
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [conversionRate, setConversionRate] = useState<string | null>(null);
  const [conversionBusy, setConversionBusy] = useState(false);
  const conversion = config?.miningConversion;
  const rateText = conversionRate ?? (conversion?.vbixPerBix == null ? '' : String(conversion.vbixPerBix));
  const saveConversion = async (enabled: boolean) => {
    const parsed = miningConversionSchema.safeParse({ enabled, vbixPerBix: rateText.trim() ? Number(rateText) : null });
    if (!parsed.success) { onMessage('Isi nilai BIXP untuk 1 BIX sebelum membuka konversi.'); return; }
    setConversionBusy(true);
    try { await save({ data: { key: 'mining_conversion', value: parsed.data } }); await Promise.all([queryClient.invalidateQueries({ queryKey: ['bix-public-config'] }), queryClient.invalidateQueries({ queryKey: ['bix-mining-conversion'] })]); await onSaved(); onMessage(enabled ? 'Konversi BIXP dibuka.' : 'Konversi BIXP ditutup.'); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Konversi gagal disimpan.'); }
    finally { setConversionBusy(false); }
  };
  const visible = isMiningVisible(config?.miningVisibility);
  const setVisibility = async (next: boolean) => {
    setVisibilityBusy(true);
    try {
      await save({ data: { key: 'mining_visibility', value: { visible: next } } });
      await queryClient.invalidateQueries({ queryKey: ['bix-public-config'] });
      await onSaved();
      onMessage(next ? 'Mining dibuka di HOME.' : 'Mining ditutup dan disembunyikan dari HOME.');
    } catch { onMessage('Tidak dapat menyimpan tampilan mining.'); }
    finally { setVisibilityBusy(false); }
  };
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
    <div className="mt-8 max-w-xl">
      <section className="border-b border-border pb-6" aria-labelledby="mining-visibility-title">
        <h2 id="mining-visibility-title" className="font-display text-lg font-bold">Tampilan mining di HOME</h2>
        <div className="mt-3 flex gap-2" role="group" aria-label="Buka atau tutup mining">
          <Button variant={visible ? 'default' : 'outline'} aria-pressed={visible} disabled={visibilityBusy || !config} onClick={() => setVisibility(true)}><Eye size={16}/> Buka</Button>
          <Button variant={!visible ? 'default' : 'outline'} aria-pressed={!visible} disabled={visibilityBusy || !config} onClick={() => setVisibility(false)}><EyeOff size={16}/> Tutup</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{visible ? 'Terlihat di HOME member.' : 'Tersembunyi dari HOME member.'}</p>
      </section>
    <section className="mt-6 border-b border-border pb-6"><h2 className="font-display text-lg font-bold">Konversi BIXP ke BIX</h2><label className="mt-3 grid gap-2 text-sm">Jumlah BIXP untuk 1 BIX<input className="form-input" type="number" min="0.000001" step="any" value={rateText} onChange={e => setConversionRate(e.target.value)} placeholder="Tentukan nilai konversi"/></label><div role="group" aria-label="Buka atau tutup konversi" className="mt-3 flex flex-wrap gap-2"><Button aria-pressed={!!conversion?.enabled} variant={conversion?.enabled ? 'default' : 'outline'} disabled={conversionBusy || !config} onClick={() => saveConversion(true)}><Eye size={16}/>Buka konversi</Button><Button aria-pressed={!conversion?.enabled} variant={!conversion?.enabled ? 'default' : 'outline'} disabled={conversionBusy || !config} onClick={() => saveConversion(false)}><EyeOff size={16}/>Tutup konversi</Button><Button variant="outline" disabled={conversionBusy || !config} onClick={() => saveConversion(!!conversion?.enabled)}>Simpan nilai</Button></div><p className="mt-3 text-xs text-muted-foreground">Pool Marketing & Community 1.000.000 BIX · batas kumulatif 100 BIX per akun. Tidak menggunakan vault owner.</p></section>
    <form onSubmit={submit} className="mt-6 grid gap-4">
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
      <p className="text-xs text-muted-foreground">Mining menghasilkan BIXP plus bonus jaringan 5 level sesuai persentase Referral. Konversi ke saldo BIX internal mengikuti nilai dan tombol buka/tutup di atas.</p>
    </form></div>
  );
}
