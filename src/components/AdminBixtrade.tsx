import { useCallback, useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { updateSetting } from '@/lib/bixlink.functions';
import { readBixtrade, withdrawNet, type BixtradeSettings } from '@/lib/bixtrade';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AdminFold } from '@/components/AdminNavigation';

type Req = { id: string; user_id: string; kind: string; amount_usd: number; strategy: string; status: string; created_at: string };

export function AdminBixtrade({ initial, onMessage, onSaved }: { initial?: unknown; onMessage: (m: string) => void; onSaved?: () => void }) {
  const [s, setS] = useState<BixtradeSettings>(() => readBixtrade(initial));
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const save = useServerFn(updateSetting);
  useEffect(() => { setS(readBixtrade(initial)); }, [initial]);
  const load = useCallback(async () => {
    let q = supabase.from('bixtrade_requests').select('id,user_id,kind,amount_usd,strategy,status,created_at').order('created_at', { ascending: false }).limit(50);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data } = await q; setReqs((data ?? []) as Req[]);
  }, [filter]);
  useEffect(() => { void load(); }, [load]);
  const num = (k: keyof BixtradeSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setS(v => ({ ...v, [k]: Number(e.target.value) }));
  const submit = async (next = s) => {
    setBusy(true);
    try { await save({ data: { key: 'bixtrade', value: next } }); setS(next); onMessage(`BIXTrade disimpan · ${next.enabled ? 'AKTIF' : 'Under Reconstruction'}.`); onSaved?.(); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal menyimpan BIXTrade.'); } finally { setBusy(false); }
  };
  const decide = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('bixtrade_requests').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
    onMessage(error ? error.message : `Permintaan ${status === 'approved' ? 'disetujui' : 'ditolak'}.`); void load();
  };
  const sw = (k: 'depositOpen' | 'withdrawOpen', label: string) => <label className="flex items-center justify-between gap-3"><b>{label}</b><Switch checked={s[k]} disabled={busy} onCheckedChange={v => submit({ ...s, [k]: v })}/></label>;
  return <AdminFold title="BIXTrade Bot Arbitrase" tone="gold" badge={s.enabled ? 'AKTIF' : 'UNDER RECONSTRUCTION'}>
    <div className="mt-4 grid gap-4 text-xs">
      <label className="flex items-center justify-between gap-3"><span><b>Buka halaman BIXTrade</b><br/><span className="text-muted-foreground">Saat ditutup, member melihat “Under Reconstruction”.</span></span>
        <Switch checked={s.enabled} disabled={busy} onCheckedChange={v => submit({ ...s, enabled: v })}/></label>
      {sw('depositOpen', 'Buka deposit bot')}
      {sw('withdrawOpen', 'Buka withdraw bot')}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Profit harian minimum (%)<input className="form-input mt-1" type="number" step="0.01" min={0} max={5} value={s.minDailyPct} onChange={num('minDailyPct')}/></label>
        <label>Profit harian maksimum (%)<input className="form-input mt-1" type="number" step="0.01" min={0} max={5} value={s.maxDailyPct} onChange={num('maxDailyPct')}/></label>
        <label>Win rate tampilan (%)<input className="form-input mt-1" type="number" min={50} max={99} value={s.winRate} onChange={num('winRate')}/></label>
        <label>Deposit minimum (USDT)<input className="form-input mt-1" type="number" min={10} value={s.minAlloc} onChange={num('minAlloc')}/></label>
        <label>Deposit maksimum (USDT)<input className="form-input mt-1" type="number" min={10} value={s.maxAlloc} onChange={num('maxAlloc')}/></label>
        <label>Withdraw minimum (USDT)<input className="form-input mt-1" type="number" min={1} value={s.minWithdraw} onChange={num('minWithdraw')}/></label>
        <label>Biaya withdraw (%)<input className="form-input mt-1" type="number" step="0.1" min={0} max={20} value={s.withdrawFeePct} onChange={num('withdrawFeePct')}/></label>
        <label>Masa kunci (hari)<input className="form-input mt-1" type="number" min={0} max={365} value={s.lockDays} onChange={num('lockDays')}/></label>
        <label className="sm:col-span-2">Pesan saat ditutup<input className="form-input mt-1" maxLength={200} value={s.notice ?? ''} onChange={e => setS(v => ({ ...v, notice: e.target.value }))}/></label>
      </div>
      <p className="text-muted-foreground">Angka profit hanya proyeksi tampilan; tidak menambah saldo member.</p>
      <Button disabled={busy} onClick={() => submit()}>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</Button>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between"><b>Permintaan deposit / withdraw bot</b>
          <select className="form-input w-auto" value={filter} onChange={e => setFilter(e.target.value as 'pending' | 'all')}><option value="pending">Pending</option><option value="all">Semua</option></select></div>
        <div className="mt-2 grid gap-2">{reqs.length ? reqs.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
          <span><b className="uppercase">{r.kind}</b> {Number(r.amount_usd).toFixed(2)} USDT{r.kind === 'withdraw' ? ` (bersih ${withdrawNet(s, Number(r.amount_usd)).toFixed(2)})` : ''} · {r.strategy}<br/><span className="text-muted-foreground">{r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</span></span>
          {r.status === 'pending' ? <span className="flex gap-1"><Button size="sm" onClick={() => decide(r.id, 'approved')}>Setujui</Button><Button size="sm" variant="outline" onClick={() => decide(r.id, 'rejected')}>Tolak</Button></span> : <span className={`arb-badge is-${r.status}`}>{r.status}</span>}
        </div>) : <p className="text-muted-foreground">Tidak ada permintaan.</p>}</div>
      </div>
    </div>
  </AdminFold>;
}
