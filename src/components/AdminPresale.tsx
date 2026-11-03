import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useQueryClient } from '@tanstack/react-query';
import { getPresaleStatus, savePresale } from '@/lib/presale.functions';
import { bixForUsd, presalePrice, withPresaleStages, editPresaleStage, activatePresaleStage, setPresaleStageWindow, stagePhase, type PresaleConfig } from '@/lib/presale';
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromLocalInput = (v: string) => v ? new Date(v).toISOString() : null;
import { presaleSettingsSchema } from '@/lib/presale-settings';
import { DEFAULT_STRATEGIES } from '@/lib/presale-strategy';
import { AdminAgency } from '@/components/AdminAgency';

export function AdminPresale({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getPresaleStatus); const save = useServerFn(savePresale);
  const [cfg, setCfg] = useState<PresaleConfig | null>(null); const [used, setUsed] = useState(0);
  const [price, setPrice] = useState(0.5);
  const [saving, setSaving] = useState(false); const [notice, setNotice] = useState(''); const queryClient = useQueryClient();
  useEffect(() => { load().then(s => { const next = withPresaleStages(s.config); setCfg(next); setUsed(Number(s.poolUsed)); setPrice(next.stages?.[next.activeStage ?? 0]?.price ?? presalePrice(next.packages)); }).catch(e => onMessage(e.message)); }, []);
  if (!cfg) return <p className="mt-8 text-sm text-muted-foreground">Loading presale…</p>;
  const applyPrice = (v: number) => { setPrice(v); setCfg(prev => prev && editPresaleStage(prev, prev.activeStage ?? 0, v)); };
  const DEFAULT_STAGES = [{ price: 0.5 }, { price: 0.65 }, { price: 0.8 }];
  const setStagePrice = (i: number, v: number) => setCfg(prev => prev && editPresaleStage(prev, i, v));
  const activateStage = (i: number) => { const v = cfg.stages?.[i]?.price ?? DEFAULT_STAGES[i]?.price ?? 0.5; if (v <= 0) { setNotice('Harga tahap harus lebih dari 0.'); return; } setPrice(v); setCfg(prev => prev && activatePresaleStage(prev, i)); };
  const setPkg = (i: number, k: 'usd' | 'releaseDays', v: number) => setCfg({ ...cfg, packages: cfg.packages.map((p, j) => j !== i ? p : k === 'usd' ? { ...p, usd: v, bix: bixForUsd(v, price) } : { ...p, releaseDays: v }) });
  const num = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
  return <section className="mt-8 grid max-w-3xl gap-4">
    <h2 className="font-display text-xl font-black">PRESALE STAKING BIX</h2>
    <p className="text-xs text-muted-foreground">Separate from the 8 USDT packages and free mining. BIX is locked and released by mining over the duration you set. Pool comes from the Presale Allocation (15% of supply, max 3,150,000). Used: {used.toLocaleString()} BIX.</p>
    <div className="flex items-center justify-between gap-3 border-b border-border py-3"><label htmlFor="presale-open" className="text-sm font-bold">Presale {cfg.enabled ? 'BUKA' : 'TUTUP'}</label><Switch id="presale-open" checked={cfg.enabled} disabled={saving} onCheckedChange={enabled => setCfg(prev => prev && ({ ...prev, enabled }))}/></div>
    <p className="text-xs text-muted-foreground">Buka/tutup dan harga berlaku setelah disimpan. Pembelian member yang sudah ada tidak berubah.</p>
    <div className="rounded-lg border border-primary/40 p-3"><h3 className="text-sm font-black text-primary">HARGA PRESALE PER TAHAP</h3><p className="text-[11px] text-muted-foreground">Pilih tahap aktif — harga tahap itu langsung diterapkan ke semua paket. Simpan untuk berlaku.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">{[0, 1, 2].map(i => { const st = cfg.stages ?? [{ price: 0.5 }, { price: 0.65 }, { price: 0.8 }]; const active = (cfg.activeStage ?? 0) === i; const ph = stagePhase(st[i], Date.now()); const phLabel = { open: 'Tanpa jadwal', upcoming: 'Mendatang', live: 'Berjalan', ended: 'Selesai' }[ph]; return <div key={i} className={`rounded-md border p-2 ${active ? 'border-primary bg-primary/10' : 'border-border'}`}>
        <div className="flex items-center justify-between"><span className="text-xs font-bold">Tahap {i + 1}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ph === 'live' ? 'border-chart-2 text-chart-2' : ph === 'ended' ? 'border-destructive text-destructive' : ph === 'upcoming' ? 'border-chart-3 text-chart-3' : 'border-border text-muted-foreground'}`}>{phLabel}</span></div>
        <label className="mt-1 block text-[11px]">Harga (USD/BIX)<input type="number" step="0.0001" min="0.0001" className={num} value={st[i]?.price ?? 0.5} onChange={e => { const v = Number(e.target.value); setStagePrice(i, v); if (active) setPrice(v); }}/></label>
        <label className="mt-1 block text-[11px]">Waktu buka<input type="datetime-local" className={num} value={toLocalInput(st[i]?.startsAt)} onChange={e => setCfg(prev => prev && setPresaleStageWindow(prev, i, 'startsAt', fromLocalInput(e.target.value)))}/></label>
        <label className="mt-1 block text-[11px]">Waktu tutup<input type="datetime-local" className={num} value={toLocalInput(st[i]?.endsAt)} onChange={e => setCfg(prev => prev && setPresaleStageWindow(prev, i, 'endsAt', fromLocalInput(e.target.value)))}/></label>
        <Button type="button" variant={active ? 'default' : 'outline'} onClick={() => activateStage(i)} className="mt-2 h-8 w-full text-[11px] font-black">{active ? '● AKTIF' : 'Aktifkan'}</Button></div>; })}</div>
      <p className="mt-2 text-[11px] text-muted-foreground">Kosongkan waktu jika tahap dibuka/ditutup manual. Pembelian di tahap aktif ditolak server sebelum waktu buka dan sesudah waktu tutup.</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs">Presale price (USD per BIX)<input type="number" step="0.0001" min="0.0001" className={num} value={price} onChange={e => applyPrice(Number(e.target.value))}/><button type="button" onClick={() => applyPrice(0.5)} className="mt-1 text-[11px] font-bold text-primary underline">Apply $0.50 to all packages</button></label>
      <label className="text-xs">Sponsor % (direct referrer, max 10)<input type="number" className={num} value={cfg.sponsorPct} onChange={e => setCfg({ ...cfg, sponsorPct: Number(e.target.value) })}/></label>
      <label className="text-xs">Pool cap (BIX)<input type="number" className={num} value={cfg.poolCap} onChange={e => setCfg({ ...cfg, poolCap: Number(e.target.value) })}/></label>
    </div>
    {cfg.packages.map((p, i) => <div key={i} className="grid grid-cols-3 gap-2 rounded-lg border border-border p-3">
      <label className="text-xs">Package USDT<input type="number" className={num} value={p.usd} onChange={e => setPkg(i, 'usd', Number(e.target.value))}/></label>
      <label className="text-xs">BIX received (editable)<input type="number" min="1" className={num} value={p.bix} onChange={e => setCfg({ ...cfg, packages: cfg.packages.map((q, j) => j === i ? { ...q, bix: Number(e.target.value) } : q) })}/></label>
      <label className="text-xs">Release days<input type="number" className={num} value={p.releaseDays} onChange={e => setPkg(i, 'releaseDays', Number(e.target.value))}/></label>
      <button type="button" className="col-span-3 w-fit text-[11px] font-bold text-destructive underline" onClick={() => setCfg({ ...cfg, packages: cfg.packages.filter((_, j) => j !== i) })}>Remove package</button>
    </div>)}
    {cfg.packages.length < 14 && <Button type="button" variant="outline" className="w-fit" onClick={() => setCfg({ ...cfg, packages: [...cfg.packages, { usd: 1000, bix: bixForUsd(1000, price), releaseDays: 365 }].sort((a, b) => a.usd - b.usd) })}>+ Add package</Button>}
    {(() => { const sv = cfg.sovereign ?? { enabled: true, usd: 100000, bix: 175000, releaseDays: 365, slots: 21 }; const set = (k: keyof typeof sv, v: number | boolean) => setCfg({ ...cfg, sovereign: { ...sv, [k]: v } }); return <div className="grid gap-3 rounded-lg border border-chart-3/50 p-3">
      <b className="text-sm">Sovereign $100,000 package</b>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sv.enabled} onChange={e => set('enabled', e.target.checked)}/> Sovereign open</label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">BIX received<input type="number" min="1" className={num} value={sv.bix} onChange={e => set('bix', Number(e.target.value))}/></label>
        <label className="text-xs">Release days<input type="number" min="1" className={num} value={sv.releaseDays} onChange={e => set('releaseDays', Number(e.target.value))}/></label>
        <label className="text-xs">Slots (max 21)<input type="number" min="1" max="21" className={num} value={sv.slots} onChange={e => set('slots', Number(e.target.value))}/></label>
      </div>
      <button type="button" onClick={() => set('bix', bixForUsd(100000, price))} className="w-fit text-[11px] font-bold text-primary underline">Use presale price ({bixForUsd(100000, price).toLocaleString()} BIX)</button>
    </div>; })()}
    {(() => { const st = cfg.strategies ?? DEFAULT_STRATEGIES; const set = (k: keyof typeof st, v: number | boolean) => setCfg({ ...cfg, strategies: { ...st, [k]: v } }); return <div className="grid gap-3 rounded-lg border border-border p-3">
      <b className="text-sm">Investor strategies (automatic)</b>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.enabled} onChange={e => set('enabled', e.target.checked)}/> Strategies open (Hybrid, Dividend, Founder)</label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs">Hybrid BIX share %<input type="number" min="10" max="90" className={num} value={st.hybridBixPct} onChange={e => set('hybridBixPct', Number(e.target.value))}/></label>
        <label className="text-xs">Hybrid USDT %/day<input type="number" step="0.01" min="0" max="1" className={num} value={st.hybridDailyPct} onChange={e => set('hybridDailyPct', Number(e.target.value))}/></label>
        <label className="text-xs">Dividend %/day<input type="number" step="0.01" min="0" max="1" className={num} value={st.dividendDailyPct} onChange={e => set('dividendDailyPct', Number(e.target.value))}/></label>
        <label className="text-xs">Founder bonus BIX %/year<input type="number" min="0" max="100" className={num} value={st.founderBonusApy} onChange={e => set('founderBonusApy', Number(e.target.value))}/></label>
      </div>
      <p className="text-[11px] text-muted-foreground">USDT dividends are credited to member wallets automatically each full day for the release period. Rates are snapshotted at purchase; changes apply to new purchases only.</p>
    </div>; })()}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    <Button className="w-fit" disabled={saving} onClick={async () => {
      const parsed = presaleSettingsSchema.safeParse(cfg);
      if (!parsed.success) { const issue = parsed.error.issues[0]; setNotice(issue?.path[0] === 'stages' ? 'Isi harga ketiga tahap dengan angka lebih dari 0 sebelum menyimpan.' : `Periksa ${issue?.path.join(' / ') ?? 'pengaturan'} sebelum menyimpan.`); return; }
      setSaving(true); setNotice('');
      try {
        await save({ data: parsed.data });
        const fresh = await load(); const next = withPresaleStages(fresh.config);
        setCfg(next); setUsed(Number(fresh.poolUsed)); setPrice(next.stages?.[next.activeStage ?? 0]?.price ?? presalePrice(next.packages));
        await queryClient.invalidateQueries({ queryKey: ['presale'] });
        setNotice(`Tersimpan — Tahap ${(next.activeStage ?? 0) + 1}, presale ${next.enabled ? 'BUKA' : 'TUTUP'}.`); onMessage('Pengaturan presale tersimpan.');
      } catch (e) { setNotice(e instanceof Error ? e.message : 'Pengaturan gagal disimpan.'); }
      finally { setSaving(false); }
    }}>{saving ? 'Menyimpan…' : 'Save presale'}</Button>
    <AdminAgency/>
  </section>;
}
