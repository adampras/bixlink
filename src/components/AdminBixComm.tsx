import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type C = { comm_chat_enabled: boolean; comm_chat_min_usd: number; comm_voice_min_usd: number; comm_video_min_usd: number; comm_vip_min_usd: number };

/** Overview: staking tiers that unlock BIX CHAT / voice / video / VIP (enforced in the DB RPCs). */
export function AdminBixComm({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-bix-comm'], queryFn: async () => {
    const { data, error } = await supabase.from('bixtok_config').select('comm_chat_enabled, comm_chat_min_usd, comm_voice_min_usd, comm_video_min_usd, comm_vip_min_usd').eq('id', 1).single();
    if (error) throw error; return data as C;
  } });
  const [c, setC] = useState<C | null>(null);
  useEffect(() => { if (q.data) setC(q.data); }, [q.data]);
  if (!c) return null;
  const n = (v: number) => Math.max(0, Number(v) || 0);
  async function save() {
    if (!c) return;
    const v = { comm_chat_enabled: c.comm_chat_enabled, comm_chat_min_usd: n(c.comm_chat_min_usd), comm_voice_min_usd: n(c.comm_voice_min_usd), comm_video_min_usd: n(c.comm_video_min_usd), comm_vip_min_usd: n(c.comm_vip_min_usd) };
    const { error } = await supabase.from('bixtok_config').update({ ...v, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) return onMessage(error.message);
    onMessage('Syarat BIX CALL & CHAT tersimpan.');
    await qc.invalidateQueries({ queryKey: ['admin-bix-comm'] });
  }
  const field = (k: keyof C, label: string) => <label className="text-xs text-muted-foreground">{label}<input className="form-input mt-1" type="number" min={0} step="1" value={Number(c[k])} onChange={e => setC({ ...c, [k]: Number(e.target.value) })}/></label>;
  return <><MatchaToggle onMessage={onMessage}/><section className="mt-6 rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-3"><div><strong className="text-sm">BIX CALL & CHAT · Fasilitas per paket staking</strong>
      <p className="text-xs text-muted-foreground">Minimal total staking aktif (USD). Dicek di server setiap kali member chat atau menelepon.</p></div>
      <button type="button" role="switch" aria-checked={c.comm_chat_enabled} aria-label="BIX CHAT aktif" onClick={() => setC({ ...c, comm_chat_enabled: !c.comm_chat_enabled })} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${c.comm_chat_enabled ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${c.comm_chat_enabled ? 'left-[22px]' : 'left-0.5'}`}/></button>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {field('comm_chat_min_usd', 'Chat (0 = gratis)')}{field('comm_voice_min_usd', 'Voice call')}{field('comm_video_min_usd', 'Video call')}{field('comm_vip_min_usd', '👑 VIP Caller')}
    </div>
    <button type="button" onClick={() => void save()} className="mt-3 rounded-lg border border-primary px-4 py-2 text-xs font-bold text-primary">Simpan syarat</button>
  </section>;
}
