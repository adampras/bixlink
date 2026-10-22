import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { changeMemberEmail } from '@/lib/team.functions';

export function AdminChangeEmail({ onMessage }: { onMessage: (m: string) => void }) {
  const change = useServerFn(changeMemberEmail);
  const [member, setMember] = useState(''); const [newEmail, setNewEmail] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true);
    try { await change({ data: { member, newEmail } }); onMessage(`Email member diganti menjadi ${newEmail}.`); setMember(''); setNewEmail(''); }
    catch (err) { onMessage(err instanceof Error ? err.message : 'Gagal mengganti email.'); } finally { setBusy(false); } };
  const cls = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm';
  return <form onSubmit={submit} className="mt-6 space-y-3 rounded-[20px] border border-chart-2/40 bg-card p-4">
    <h3 className="font-display text-lg font-black">Ganti email member</h3>
    <p className="text-xs text-muted-foreground">Masukkan kode member, username, atau email lama. Email baru langsung aktif tanpa konfirmasi.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <input className={cls} placeholder="Kode / username / email lama" value={member} onChange={e => setMember(e.target.value)} required/>
      <input className={cls} type="email" placeholder="Email baru" value={newEmail} onChange={e => setNewEmail(e.target.value)} required/>
    </div>
    <Button type="submit" disabled={busy} className="rounded-full">{busy ? 'Menyimpan…' : 'Ganti email'}</Button>
  </form>;
}
