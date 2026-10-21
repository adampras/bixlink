import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { createAccountByOwner } from '@/lib/team.functions';
import { passwordValid, PASSWORD_HINT } from '@/lib/password-rule';

export function AdminCreateAccount({ onMessage, title = 'Buat akun (Owner 1)' }: { onMessage: (m: string) => void; title?: string }) {
  const create = useServerFn(createAccountByOwner);
  const [f, setF] = useState({ email: '', password: '', fullName: '', username: '' }); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!passwordValid(f.password)) return onMessage(PASSWORD_HINT); setBusy(true);
    try { await create({ data: f }); onMessage(`Akun ${f.username} dibuat dan langsung bisa login.`); setF({ email: '', password: '', fullName: '', username: '' }); } catch (err) { onMessage(err instanceof Error ? err.message : 'Gagal membuat akun.'); } finally { setBusy(false); } };
  const cls = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm';
  return <form onSubmit={submit} className="mt-8 space-y-3 rounded-[20px] border border-chart-3/40 bg-card p-4">
    <h3 className="font-display text-lg font-black">{title}</h3>
    <p className="text-xs text-muted-foreground">Email bebas, tanpa konfirmasi inbox. Akun langsung aktif.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <input className={cls} placeholder="Nama lengkap" value={f.fullName} onChange={set('fullName')} required/>
      <input className={cls} placeholder="Username" value={f.username} onChange={set('username')} required/>
      <input className={cls} type="email" placeholder="Email" value={f.email} onChange={set('email')} required/>
      <input className={cls} placeholder="Password (Huruf123!)" value={f.password} onChange={set('password')} required/>
    </div>
    <Button type="submit" disabled={busy} className="rounded-full">{busy ? 'Membuat…' : 'Buat akun'}</Button>
  </form>;
}
