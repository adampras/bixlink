import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Admin = { enabled: boolean; quota: number; reward: number; round: number; winners: number; left: number; bank: number; list: { name: string; result: string | null; amount: number; at: string }[] };

/** Owner 1 console for the surprise FREE BIX quiz. Questions are auto-picked (2 random) from the server bank. */
export function AdminSurpriseQuiz({ onMessage }: { onMessage?: (m: string) => void }) {
  const [d, setD] = useState<Admin | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [quota, setQuota] = useState(20);
  const [reward, setReward] = useState(1);
  const [busy, setBusy] = useState(false);
  const apply = (a: Admin) => { setD(a); setEnabled(a.enabled); setQuota(a.quota); setReward(a.reward); };
  const load = async () => { const { data, error } = await supabase.rpc('bix_surprise_admin'); if (error) onMessage?.(error.message); else apply(data as unknown as Admin); };
  useEffect(() => { void load(); }, []);
  const save = async (newRound: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_surprise_save', { p_enabled: enabled, p_quota: quota, p_reward: reward, p_new_round: newRound });
    setBusy(false);
    if (error) { onMessage?.(error.message); return; }
    apply(data as unknown as Admin); onMessage?.(newRound ? 'Ronde baru dibuka' : 'Kuis kejutan disimpan');
  };
  const label = (r: string | null) => r === 'win' ? 'Menang' : r === 'wrong' ? 'Salah' : r === 'late' ? 'Kuota habis' : 'Sedang menjawab';
  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground">Sistem otomatis memilih 2 soal acak dari {d?.bank ?? '…'} soal tentang BIXLINK setiap kuis dibuka. Hadiah dibayar sebagai BIX promo (vBIX) ke pemenang tercepat.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Promo aktif</label>
        <label className="grid gap-1">Kuota pemenang<input type="number" min={1} max={1000} value={quota} onChange={e => setQuota(Number(e.target.value))} className="rounded-md border border-border bg-background px-2 py-1" /></label>
        <label className="grid gap-1">Hadiah (BIX)<input type="number" min={0} max={100} step="0.1" value={reward} onChange={e => setReward(Number(e.target.value))} className="rounded-md border border-border bg-background px-2 py-1" /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-full bg-primary px-4 py-1.5 font-bold text-primary-foreground">Simpan</button>
        <button type="button" disabled={busy} onClick={() => save(true)} className="rounded-full border border-primary px-4 py-1.5 font-bold text-primary">Mulai ronde baru</button>
      </div>
      {d && <p className="font-semibold">Ronde #{d.round} · Pemenang {d.winners}/{d.quota} · Sisa {d.left}</p>}
      <div className="max-h-72 overflow-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-muted-foreground"><th className="p-2">Member</th><th className="p-2">Status</th><th className="p-2">BIX</th><th className="p-2">Waktu</th></tr></thead>
          <tbody>{(d?.list ?? []).map((r, i) => <tr key={i} className="border-t border-border/40"><td className="p-2">{r.name}</td><td className="p-2">{label(r.result)}</td><td className="p-2">{r.amount}</td><td className="p-2">{new Date(r.at).toLocaleString()}</td></tr>)}
          {!d?.list?.length && <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">Belum ada peserta ronde ini</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
