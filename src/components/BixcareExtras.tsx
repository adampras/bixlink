import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Coffee, Download, Fuel, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type CareOrder, type Outlet, careStats, careCsv, gasRunway, gasFeeBix, rp, PAY_LABEL, type PayMethod, MIN_GAS_BIX } from '@/lib/bixcare';

const card = 'rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-4';
const ghost = 'rounded-xl border border-border px-3 py-2 text-xs font-semibold';
const input = 'w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm';

export const onBreak = (o: Pick<Outlet, 'break_until'>) => !!o.break_until && new Date(o.break_until).getTime() > Date.now();

/** Partner dashboard: revenue by period/method, gas runway, auto-break and CSV export. */
export function CarePartnerStats({ outlet, balance, onBreakChange }: { outlet: Outlet; balance: number | null; onBreakChange: () => void }) {
  const [orders, setOrders] = useState<CareOrder[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => void supabase.from('bixcare_orders').select('*').eq('outlet_id', outlet.id).order('created_at', { ascending: false }).limit(1000).then(({ data }) => setOrders((data ?? []) as unknown as CareOrder[])), [outlet.id]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  const now = new Date();
  const since = period === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : period === 'week' ? new Date(now.getTime() - 7 * 864e5) : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : undefined;
  const s = careStats(orders, since);
  const all = careStats(orders);
  const direct = orders.filter(o => o.status === 'completed' && !['bix', 'usdt'].includes(o.pay_method));
  const avgFee = direct.length ? direct.reduce((a, o) => a + Number(o.fee_bix), 0) / direct.length : gasFeeBix(150000, outlet.division);
  const runway = balance === null ? null : gasRunway(balance, avgFee);
  const pending = orders.filter(o => o.status === 'pending').length;
  const exportCsv = () => {
    const rows = since ? orders.filter(o => new Date(o.created_at) >= since) : orders;
    const url = URL.createObjectURL(new Blob(['\ufeff' + careCsv(rows)], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `bixcare-${outlet.name.replace(/\W+/g, '-')}-${period}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const setBreak = async (m: number) => { setMsg(''); const { error } = await supabase.rpc('bixcare_set_break', { p_minutes: m }); if (error) setMsg(error.message); else onBreakChange(); };
  const rated = orders.filter(o => o.rating);
  const avg = rated.length ? (rated.reduce((a, o) => a + Number(o.rating), 0) / rated.length).toFixed(1) : '–';
  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-bold"><BarChart3 className="h-4 w-4 text-primary" />Dasbor bisnis</p><button className={ghost} onClick={exportCsv}><Download className="mr-1 inline h-3 w-3" />Laporan CSV</button></div>
      <div className="flex gap-1">{(['today', 'week', 'month', 'all'] as const).map(p => <button key={p} onClick={() => setPeriod(p)} className={`flex-1 rounded-full px-2 py-1 text-[11px] font-bold ${period === p ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{{ today: 'Hari ini', week: '7 hari', month: 'Bulan ini', all: 'Semua' }[p]}</button>)}</div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Omzet</p><p className="font-black text-primary">{rp(s.omzet)}</p></div>
        <div className="rounded-xl bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Order selesai</p><p className="font-black">{s.orders}</p></div>
        <div className="rounded-xl bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Masuk saldo</p><p className="text-xs font-bold">{s.bix.toFixed(2)} BIX · {s.usdt.toFixed(2)} USDT</p></div>
        <div className="rounded-xl bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">Rating</p><p className="font-black"><Star className="mr-1 inline h-3 w-3 text-primary" />{avg} <span className="text-[10px] font-normal">({rated.length})</span></p></div>
      </div>
      <div className="space-y-1">{(Object.keys(PAY_LABEL) as PayMethod[]).map(m => { const v = s.byMethod[m] ?? 0; const pct = s.omzet ? (v / s.omzet) * 100 : 0; return (
        <div key={m} className="text-[11px]"><div className="flex justify-between"><span>{PAY_LABEL[m]}</span><span className="font-semibold">{rp(v)}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div></div>
      ); })}</div>
      <div className="rounded-xl bg-primary/10 p-2 text-[11px]"><p className="flex items-center gap-1 font-bold"><Fuel className="h-3 w-3 text-primary" />Kesehatan BIX Gas</p>
        <p>{runway === null ? '…' : runway > 0 ? `Saldo gas cukup untuk ±${runway} order QRIS/bank/tunai berikutnya (rata-rata ${avgFee.toFixed(2)} BIX/order).` : `Saldo gas di batas minimum ${MIN_GAS_BIX} BIX — isi ulang agar outlet tetap BUKA.`}</p>
        <p className="text-muted-foreground">Total gas terpakai: {all.gas.toFixed(2)} BIX · {pending} order menunggu.</p></div>
      <div className="text-[11px]"><p className="flex items-center gap-1 font-bold"><Coffee className="h-3 w-3 text-primary" />Istirahat otomatis {onBreak(outlet) && <span className="text-primary">— sampai {new Date(outlet.break_until!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}</p>
        <div className="mt-1 flex gap-1">{[15, 30, 60].map(m => <button key={m} className={ghost} disabled={outlet.status !== 'approved'} onClick={() => setBreak(m)}>{m} mnt</button>)}{onBreak(outlet) && <button className={ghost} onClick={() => setBreak(0)}>Buka lagi</button>}</div>
        <p className="mt-1 text-muted-foreground">Konsumen tidak bisa memesan selama istirahat; outlet buka sendiri setelahnya.</p>
        {msg && <p className="text-destructive">{msg}</p>}</div>
    </div>
  );
}

export function RateOrder({ o, onDone }: { o: CareOrder; onDone: () => void }) {
  const [r, setR] = useState(0); const [t, setT] = useState(''); const [err, setErr] = useState('');
  if (o.rated_at) return <p className="mt-2 text-xs"><span className="font-bold text-primary">{'★'.repeat(Number(o.rating))}</span> {o.review && `“${o.review}”`}</p>;
  const send = async () => { setErr(''); const { error } = await supabase.rpc('bixcare_rate_order', { p_id: o.id, p_rating: r, p_review: t }); if (error) setErr(error.message); else onDone(); };
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-border/60 p-2">
      <p className="text-[11px] font-bold">Beri nilai layanan</p>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => <button key={n} aria-label={`${n} bintang`} onClick={() => setR(n)} className={`text-xl ${n <= r ? 'text-primary' : 'text-muted-foreground'}`}>★</button>)}</div>
      {r > 0 && <><input className={input} placeholder="Ulasan singkat (opsional)" value={t} onChange={e => setT(e.target.value)} /><button className={ghost} onClick={send}>Kirim ulasan</button></>}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function ServiceNote({ o, onSaved }: { o: CareOrder; onSaved: () => void }) {
  const [open, setOpen] = useState(false); const [n, setN] = useState(o.service_note ?? ''); const [d, setD] = useState(o.next_service_at ?? ''); const [err, setErr] = useState('');
  if (!open) return <button className={`${ghost} mt-2`} onClick={() => setOpen(true)}>{o.service_note ? 'Ubah catatan servis/garansi' : 'Tambah catatan servis/garansi'}</button>;
  const save = async () => { setErr(''); const { error } = await supabase.rpc('bixcare_order_service_note', { p_id: o.id, p_note: n, p_next: (d || null) as unknown as string }); if (error) setErr(error.message); else { setOpen(false); onSaved(); } };
  return (
    <div className="mt-2 space-y-1">
      <textarea className={input} placeholder="Contoh: Ganti oli 10W-40 di KM 45.000, garansi 7 hari" value={n} onChange={e => setN(e.target.value)} />
      <label className="block text-[11px] text-muted-foreground">Pengingat servis berikutnya<input type="date" className={`${input} mt-1`} value={d} onChange={e => setD(e.target.value)} /></label>
      <button className={ghost} onClick={save}>Simpan catatan</button>{err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
