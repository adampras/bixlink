import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Row = { id: string; email: string | null; count: number; liveCount: number; reward: number; status: string; createdAt: string };

/** Owner 1 review of Leader Challenge claims; approval moves BIX from the owner vault. */
export function ChallengeReview() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['challenge-claims'], queryFn: async () => {
    const { data, error } = await supabase.rpc('bix_leader_challenge_list' as never);
    if (error) throw error; return data as unknown as Row[];
  } });
  const review = async (id: string, approve: boolean) => {
    setMsg('');
    const { error } = await supabase.rpc('bix_leader_challenge_review' as never, { p_id: id, p_approve: approve } as never);
    setMsg(error ? error.message : approve ? 'Disetujui · 1.000 BIX dikirim dari vault.' : 'Ditolak.');
    await qc.invalidateQueries({ queryKey: ['challenge-claims'] });
  };
  return <section className="rounded-2xl border border-border bg-card p-4">
    <h2 className="font-display font-bold">Challenge 1.000 member terverifikasi → 1.000 BIX</h2>
    <p className="mt-1 text-xs text-muted-foreground">Hanya leader/loan approved. Hitungan = seluruh tim dengan email asli terverifikasi, tanpa clone. Cek angka live sebelum menyetujui.</p>
    {msg && <p className="mt-2 text-xs" role="status">{msg}</p>}
    {isLoading ? <p className="mt-3 text-sm">Memuat…</p> : data.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Belum ada klaim.</p> :
    <div className="mt-3 space-y-2">{data.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs">
      <div><b>{r.email ?? '—'}</b><div className="text-muted-foreground">Saat klaim {r.count} · live {r.liveCount} · {new Date(r.createdAt).toLocaleDateString('id-ID')}</div></div>
      {r.status === 'pending' ? <div className="flex gap-2"><Button size="sm" onClick={() => review(r.id, true)}>Setujui</Button><Button size="sm" variant="outline" onClick={() => review(r.id, false)}>Tolak</Button></div> : <span className="font-bold uppercase">{r.status}</span>}
    </div>)}</div>}
  </section>;
}
