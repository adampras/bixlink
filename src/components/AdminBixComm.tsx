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
    onMessage('BIX CALL & CHAT requirements saved.');
    await qc.invalidateQueries({ queryKey: ['admin-bix-comm'] });
  }
  const field = (k: keyof C, label: string) => <label className="text-xs text-muted-foreground">{label}<input className="form-input mt-1" type="number" min={0} step="1" value={Number(c[k])} onChange={e => setC({ ...c, [k]: Number(e.target.value) })}/></label>;
  return <><MatchaToggle onMessage={onMessage}/><section className="mt-6 rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-3"><div><strong className="text-sm">BIX CALL & CHAT · Fasilitas per paket staking</strong>
      <p className="text-xs text-muted-foreground">Minimum active total staking (USD). Checked on the server every time a member chats or calls.</p></div>
      <button type="button" role="switch" aria-checked={c.comm_chat_enabled} aria-label="BIX CHAT active" onClick={() => setC({ ...c, comm_chat_enabled: !c.comm_chat_enabled })} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${c.comm_chat_enabled ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${c.comm_chat_enabled ? 'left-[22px]' : 'left-0.5'}`}/></button>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {field('comm_chat_min_usd', 'Chat (0 = gratis)')}{field('comm_voice_min_usd', 'Voice call')}{field('comm_video_min_usd', 'Video call')}{field('comm_vip_min_usd', '👑 VIP Caller')}
    </div>
    <button type="button" onClick={() => void save()} className="mt-3 rounded-lg border border-primary px-4 py-2 text-xs font-bold text-primary">Save requirements</button>
  </section></>;
}

/** Owner switch: Black Matcha Lux colour model for BIX CALL (stored in bixtok_config.features.call_matcha). */
function MatchaToggle({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-bix-call-theme'], queryFn: async () => {
    const { data, error } = await supabase.from('bixtok_config').select('features').eq('id', 1).single();
    if (error) throw error; return ((data as { features?: Record<string, boolean> }).features ?? {}) as Record<string, boolean>;
  } });
  const on = q.data?.['call_matcha'] === true;
  async function toggle() {
    const { error } = await supabase.from('bixtok_config').update({ features: { ...(q.data ?? {}), call_matcha: !on }, updated_at: new Date().toISOString() } as never).eq('id', 1);
    if (error) return onMessage(error.message);
    onMessage(!on ? 'BIX CALL Black Matcha Lux theme ACTIVE.' : 'BIX CALL theme reset to Obsidian Gold-Purple.');
    try { localStorage.setItem('bixcall-theme', !on ? 'matcha' : 'default'); } catch { /* ignore */ }
    await qc.invalidateQueries({ queryKey: ['admin-bix-call-theme'] });
  }
  if (!q.data) return null;
  return <section className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
    <div><strong className="text-sm">BIX CALL · Tema Black Matcha Lux</strong><p className="text-xs text-muted-foreground">Obsidian black, glossy matcha green, and orange accents for the entire BIX CALL screen.</p></div>
    <button type="button" role="switch" aria-checked={on} aria-label="Tema Black Matcha Lux" onClick={() => void toggle()} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}/></button>
  </section>;
}
