import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Overview shortcut for the BIXTOK Admin 2 network isolation switch (RLS-enforced in DB). */
export function AdminBixtokIsolation({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-bixtok-iso'], queryFn: async () => {
    const { data, error } = await supabase.from('bixtok_config').select('owner2_isolation').eq('id', 1).single();
    if (error) throw error; return data.owner2_isolation === true;
  } });
  const on = q.data === true;
  async function toggle() {
    const { error } = await supabase.from('bixtok_config').update({ owner2_isolation: !on, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) return onMessage(error.message);
    onMessage(!on ? 'Isolasi BIXTOK Admin 2 AKTIF: jaringan Admin 2 tidak melihat posting/LIVE Admin 1.' : 'Isolasi BIXTOK Admin 2 MATI: semua jaringan saling terlihat.');
    await Promise.all([qc.invalidateQueries({ queryKey: ['admin-bixtok-iso'] }), qc.invalidateQueries({ queryKey: ['admin-bixtok'] }), qc.invalidateQueries({ queryKey: ['bixtok'] })]);
  }
  return <section className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
    <div><strong className="text-sm">BIXTOK · Isolasi jaringan Admin 2</strong>
      <p className="text-xs text-muted-foreground">{on ? 'AKTIF — Admin 2 & jaringannya tidak bisa melihat/follow posting dan LIVE Admin 1 & jaringannya (dan sebaliknya).' : 'MATI — semua posting & LIVE terlihat oleh semua jaringan.'}</p></div>
    <button type="button" role="switch" aria-checked={on} disabled={q.isLoading} onClick={toggle} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}/>
    </button>
  </section>;
}
