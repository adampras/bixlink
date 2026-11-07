import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { updateSetting } from '@/lib/bixlink.functions';
import { supportDeskSchema, type SupportDesk } from '@/lib/support-desk';

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
      <Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kontak CS'}</Button>
    </form>
  </section>;
}
