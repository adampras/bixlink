import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listReviewers, setReviewer } from '@/lib/reviewer.functions';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';

export function AdminReviewers({ members, onMessage }: { members: { id: string; email: string }[]; onMessage: (m: string) => void }) {
  const list = useServerFn(listReviewers); const save = useServerFn(setReviewer); const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: ids = [] } = useQuery({ queryKey: ['admin-reviewers'], queryFn: () => list() });
  return <section className="mt-8 max-w-2xl rounded-[20px] border border-primary bg-card p-5">
    <h3 className="font-display text-lg font-black">Owner 2 (limited reviewer)</h3>
    <p className="mt-1 text-xs text-muted-foreground">Owner 2 signs in with a normal account and opens /review. They can only approve or reject deposits and withdrawals — no balances, vault, plans, prices or wallet addresses.</p>
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={async e => { e.preventDefault(); const id = String(new FormData(e.currentTarget).get('user')); setSaving(true); try { await save({ data: { userId: id, enabled: true } }); await qc.invalidateQueries({ queryKey: ['admin-reviewers'] }); onMessage('Owner 2 added.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not add Owner 2. Please try again.'); } finally { setSaving(false); } }}>
      <select name="user" aria-label="Owner 2 account" className="form-input min-w-0 flex-1" required disabled={saving} defaultValue=""><option value="" disabled>Select member account</option>{members.filter(m => !ids.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.email}</option>)}</select>
      <Button disabled={saving} className="rounded-full bg-foreground text-background hover:bg-foreground/90">{saving ? <Loader2 className="animate-spin"/> : <UserCheck/>}{saving ? 'Saving…' : 'Make Owner 2'}</Button>
    </form>
    <div className="mt-4 space-y-2">{ids.map(id => <div key={id} className="flex items-center justify-between gap-3 text-sm"><span className="break-all">{members.find(m => m.id === id)?.email ?? id}</span><Button size="sm" variant="outline" className="rounded-full" onClick={async () => { try { await save({ data: { userId: id, enabled: false } }); await qc.invalidateQueries({ queryKey: ['admin-reviewers'] }); onMessage('Owner 2 removed.'); } catch { onMessage('Could not remove.'); } }}>Remove</Button></div>)}</div>
  </section>;
}
