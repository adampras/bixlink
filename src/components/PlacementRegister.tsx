import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { registerPlacedMember } from '@/lib/placement.functions';

export type PlacementOption = { id: string; label: string };

export function PlacementRegister({ open, onOpenChange, options, initial }: { open: boolean; onOpenChange: (v: boolean) => void; options: PlacementOption[]; initial: string }) {
  const run = useServerFn(registerPlacedMember); const qc = useQueryClient();
  const [placement, setPlacement] = useState(initial); const [q, setQ] = useState('');
  const [f, setF] = useState({ fullName: '', username: '', email: '', password: '' }); const [busy, setBusy] = useState(false);
  const pw = f.password; const strong = pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const list = options.filter(o => o.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  const target = options.find(o => o.id === (placement || initial));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!strong) { toast.error('Password: uppercase, lowercase, number & symbol (min 8)'); return; }
    setBusy(true);
    try { await run({ data: { placementId: placement || initial, ...f } }); toast.success('Member registered & active'); setF({ fullName: '', username: '', email: '', password: '' }); qc.invalidateQueries(); onOpenChange(false); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Registration failed'); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (v) setPlacement(initial); }}>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus size={18} className="text-chart-3"/>Register Member</DialogTitle>
        <DialogDescription>Placed directly under: <b className="text-chart-3">{target?.label ?? '—'}</b></DialogDescription></DialogHeader>
      <form onSubmit={submit} className="grid gap-2 text-sm">
        <label className="text-xs text-muted-foreground">Search placement position</label>
        <input className="form-input" placeholder="Downline ID / username" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form-input" aria-label="Placement position" value={placement || initial} onChange={e => setPlacement(e.target.value)}>{list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
        <input className="form-input" required placeholder="Full name" value={f.fullName} onChange={e => setF({ ...f, fullName: e.target.value })} />
        <input className="form-input" required placeholder="Username (a-z, 0-9)" value={f.username} onChange={e => setF({ ...f, username: e.target.value.toLowerCase() })} />
        <input className="form-input" required type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input className="form-input" required type="password" placeholder="Password e.g. Pass123!" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        <p className={`text-[11px] ${strong ? 'text-chart-2' : 'text-muted-foreground'}`}>{strong ? '✓ Strong password' : 'Min 8: uppercase, lowercase, number, symbol'}</p>
        <Button type="submit" disabled={busy} className="mt-1 w-full">{busy ? 'Processing…' : 'Register & Activate'}</Button>
        <p className="text-[10px] text-muted-foreground">Account active immediately. Direct sponsor = placement position; bonuses follow applicable network rules.</p>
      </form>
    </DialogContent>
  </Dialog>;
}
