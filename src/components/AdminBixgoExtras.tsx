import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Plus, Trash2 } from 'lucide-react';
import { ppobOwnerTransaction, ppobStatus } from '@/lib/ppob.functions';
import { franchiseSchema, type BixgoFranchise, type BixgoSettings } from '@/lib/bixgo';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const idr = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID');

export function AdminFranchise({ s, setS }: { s: BixgoSettings; setS: (v: BixgoSettings) => void }) {
  const list = s.franchises ?? [];
  const put = (i: number, patch: Partial<BixgoFranchise>) => setS({ ...s, franchises: list.map((f, j) => j === i ? { ...f, ...patch } : f) });
  const add = () => setS({ ...s, franchises: [...list, { id: 'kota-' + (list.length + 1), city: 'New city', partner: '', enabled: false, lat: -6.2, lng: 106.816, radiusKm: 25, franchisePct: 46.67, platformPct: 33.33, poolPct: 20 }] });
  const n = (i: number, k: keyof BixgoFranchise, label: string) => <label className="text-[11px]">{label}<input className="form-input mt-1" type="number" step="any" value={list[i]![k] as number} onChange={e => put(i, { [k]: Number(e.target.value) } as Partial<BixgoFranchise>)}/></label>;
  return <div className="rounded-xl border border-border p-2">
    <div className="flex items-center justify-between"><b>Franchise Kota</b><Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4"/>Kota</Button></div>
    <p className="mt-1 text-[11px] text-muted-foreground">Share of platform commission. Total for each city must be 100%. This is a reference figure; there is no automatic payout yet.</p>
    {list.map((f, i) => { const ok = franchiseSchema.safeParse(f).success; return <div key={i} className="mt-2 space-y-2 rounded-lg border border-border p-2">
      <div className="flex items-center gap-2"><input className="form-input flex-1" value={f.city} onChange={e => put(i, { city: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || f.id })}/><Switch checked={f.enabled} onCheckedChange={v => put(i, { enabled: v })}/><button aria-label="Delete city" onClick={() => setS({ ...s, franchises: list.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-destructive"/></button></div>
      <input className="form-input" placeholder="Nama mitra pengelola" value={f.partner} onChange={e => put(i, { partner: e.target.value })}/>
      <div className="grid grid-cols-3 gap-2">{n(i, 'lat', 'Lintang')}{n(i, 'lng', 'Bujur')}{n(i, 'radiusKm', 'Radius km')}</div>
      <div className="grid grid-cols-3 gap-2">{n(i, 'franchisePct', 'Cabang %')}{n(i, 'platformPct', 'Pusat %')}{n(i, 'poolPct', 'Pool %')}</div>
      {!ok && <p className="text-[11px] text-destructive">Check inputs: share must total 100%.</p>}
    </div>; })}
  </div>;
}

export function AdminPpob({ s, setS }: { s: BixgoSettings; setS: (v: BixgoSettings) => void }) {
  const p = s.ppob ?? { enabled: false, live: false, marginIdr: 1000 };
  const set = (patch: Partial<typeof p>) => setS({ ...s, ppob: { ...p, ...patch } });
  const status = useServerFn(ppobStatus); const tx = useServerFn(ppobOwnerTransaction);
  const [info, setInfo] = useState(''); const [sku, setSku] = useState(''); const [no, setNo] = useState('');
  const check = async () => { setInfo('Memeriksa…'); try { const r = await status(); setInfo(!r.configured ? 'Digiflazz API key not filled in.' : r.error ? r.error : `Connected · deposit balance ${idr(r.balance ?? 0)}`); } catch (e) { setInfo(e instanceof Error ? e.message : 'Failed'); } };
  const test = async () => { setInfo('Mengirim…'); try { const r = await tx({ data: { sku, customerNo: no } }); setInfo(`${r.live ? 'LIVE' : 'TES'} ${r.ref}: ${r.status} ${r.message} ${r.sn}`); } catch (e) { setInfo(e instanceof Error ? e.message : 'Failed'); } };
  return <div className="rounded-xl border border-border p-2 space-y-2">
    <label className="flex items-center justify-between"><b>PPOB Pulsa/PLN (Digiflazz)</b><Switch checked={p.enabled} onCheckedChange={v => set({ enabled: v })}/></label>
    <label className="flex items-center justify-between text-xs">Mode produksi (LIVE memotong deposit asli)<Switch checked={p.live} onCheckedChange={v => set({ live: v })}/></label>
    <label className="block text-xs">Margin per transaksi (Rp)<input className="form-input mt-1" type="number" value={p.marginIdr} onChange={e => set({ marginIdr: Number(e.target.value) })}/></label>
    <Button size="sm" variant="outline" className="w-full" onClick={() => void check()}>Check connection & deposit balance</Button>
    <div className="grid grid-cols-2 gap-2"><input className="form-input" placeholder="Kode SKU" value={sku} onChange={e => setSku(e.target.value)}/><input className="form-input" inputMode="numeric" placeholder="No. HP / ID" value={no} onChange={e => setNo(e.target.value.replace(/\D/g, ''))}/></div>
    <Button size="sm" className="w-full" disabled={!sku || no.length < 6} onClick={() => void test()}>Kirim transaksi Owner ({p.live ? 'LIVE' : 'tes'})</Button>
    {info && <p className="text-[11px] text-muted-foreground break-words">{info}</p>}
    <p className="text-[11px] text-muted-foreground">Members see the original price; member checkout does not deduct any balance until payment rules are approved.</p>
  </div>;
}
