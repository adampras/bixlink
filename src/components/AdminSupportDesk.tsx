import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { updateSetting } from '@/lib/bixlink.functions';
import { supportDeskSchema, type SupportDesk } from '@/lib/support-desk';
import { SupportCommandCenter } from '@/components/SupportCommandCenter';

export function useSupportDesk() {
  return useQuery({
    queryKey: ['support-desk'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'support_desk').maybeSingle();
      const p = supportDeskSchema.safeParse(data?.value ?? {});
      return p.success ? p.data : supportDeskSchema.parse({});
    },
    staleTime: 60_000,
  });
}

type Op = { id: string; code: string | null; name: string; active: boolean };
function SupportOperators({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['support-operators'], queryFn: async () => { const { data } = await supabase.rpc('bix_support_operators_list' as never); return (data ?? []) as unknown as Op[]; } });
  const [query, setQuery] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (args: { p_query?: string; p_user?: string | null; p_active?: boolean; p_remove?: boolean }, ok: string) => {
    setBusy(true);
    const { error } = await supabase.rpc('bix_support_operator_set' as never, { p_query: args.p_query ?? '', p_user: args.p_user ?? null, p_active: args.p_active ?? true, p_remove: args.p_remove ?? false } as never);
    setBusy(false);
    if (error) { onMessage(error.message); return; }
    onMessage(ok); setQuery(''); await qc.invalidateQueries({ queryKey: ['support-operators'] });
  };
  return <div className="mt-6 grid gap-2 rounded-2xl border border-border p-3">
    <b className="text-sm">Operator CS (khusus Admin 1)</b>
    <p className="text-xs text-muted-foreground">Member yang ditunjuk muncul di pop-up Layanan 24 Jam dengan tanda CS RESMI. Matikan saat istirahat.</p>
    <div className="flex gap-2"><input className="form-input flex-1" value={query} onChange={e => setQuery(e.target.value)} placeholder="BIX-ID atau @username"/><Button type="button" disabled={busy || !query.trim()} onClick={() => run({ p_query: query.trim() }, 'Operator ditambahkan.')}>+ Tunjuk</Button></div>
    {(q.data ?? []).map(o => <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-2 py-1.5 text-sm">
      <span className="min-w-0"><b>@{o.name}</b> <small className="text-muted-foreground">{o.code}</small></span>
      <span className="flex shrink-0 items-center gap-2 text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" checked={o.active} disabled={busy} onChange={e => run({ p_user: o.id, p_active: e.target.checked }, e.target.checked ? 'Operator aktif.' : 'Operator istirahat.')}/>{o.active ? 'Aktif' : 'Istirahat'}</label>
        <button type="button" className="text-destructive" disabled={busy} onClick={() => run({ p_user: o.id, p_remove: true }, 'Akses operator dicabut.')}>✕</button>
      </span>
    </div>)}
    {q.data?.length === 0 && <p className="text-xs text-muted-foreground">Belum ada operator.</p>}
  </div>;
}

export function AdminSupportDesk({ onMessage }: { onMessage: (m: string) => void }) {
  const { data } = useSupportDesk();
  const [f, setF] = useState<SupportDesk>(supportDeskSchema.parse({}));
  const [busy, setBusy] = useState(false);
  const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  useEffect(() => { if (data) setF(data); }, [data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      let next = { ...f, bixcallUserId: '', bixcallName: '' };
      if (f.bixcallId.trim()) {
        const { data: found } = await supabase.rpc('bix_call_find' as never, { p_query: f.bixcallId.trim() } as never);
        const u = found as { user_id: string; name: string } | null;
        if (!u) { onMessage(`BIX CALL ID ${f.bixcallId} tidak ditemukan.`); return; }
        next = { ...next, bixcallUserId: u.user_id, bixcallName: u.name ?? 'BIXLINK Support' };
      }
      const parsed = supportDeskSchema.safeParse(next);
      if (!parsed.success) { onMessage(parsed.error.issues[0]?.message ?? 'Data tidak valid.'); return; }
      await save({ data: { key: 'support_desk', value: parsed.data } });
      await qc.invalidateQueries({ queryKey: ['support-desk'] });
      setF(parsed.data);
      onMessage('Kontak Customer Service tersimpan.');
    } catch { onMessage('Gagal menyimpan kontak Customer Service.'); } finally { setBusy(false); }
  }

  const set = (k: keyof SupportDesk) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return <section className="mt-6 max-w-xl">
    <h2 className="font-display text-xl font-bold">Customer Service 24/7</h2>
    <p className="mt-1 text-sm text-muted-foreground">FOX AI menjawab dulu; kendala deposit, penarikan, saldo atau akun diarahkan ke kontak resmi ini — bukan ke upline.</p>
    <form className="mt-4 grid gap-3" onSubmit={submit}>
      <label className="grid gap-1 text-sm">Nomor WhatsApp CS<input className="form-input" value={f.whatsapp} onChange={set('whatsapp')} placeholder="628123456789" inputMode="tel"/></label>
      <label className="grid gap-1 text-sm">Username Telegram CS<input className="form-input" value={f.telegram} onChange={set('telegram')} placeholder="@bixlink_support"/></label>
      <label className="grid gap-1 text-sm">BIX CALL ID operator (BIX-ID / @username)<input className="form-input" value={f.bixcallId} onChange={set('bixcallId')} placeholder="BIX-100001"/></label>
      {f.bixcallName && <p className="text-xs text-muted-foreground">Operator aktif: <b className="text-foreground">{f.bixcallName}</b></p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.float24} onChange={e => setF({ ...f, float24: e.target.checked })}/> Tampilkan pop-up mengambang "Layanan 24 Jam" di landing & Home</label>
      <label className="grid gap-1 text-sm">Salam pembuka pop-up (opsional)<input className="form-input" value={f.greeting} maxLength={160} onChange={set('greeting')} placeholder="Halo! Tim CS kami siap membantu 24 jam."/></label>
      <Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kontak CS'}</Button>
    </form>
    <SupportOperators onMessage={onMessage}/>
    <SupportCommandCenter/>
  </section>;
}
