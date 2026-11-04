import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listReviewers, getOwnerTurnover, setReviewer, getAllReviewerPermissions, saveReviewerPermissions, type ReviewerPermissions } from '@/lib/reviewer.functions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';

export function AdminReviewers({ members, onMessage }: { members: { id: string; email: string }[]; onMessage: (m: string) => void }) {
  const list = useServerFn(listReviewers); const save = useServerFn(setReviewer); const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data: ids = [] } = useQuery({ queryKey: ['admin-reviewers'], queryFn: () => list() });
  const loadPerms = useServerFn(getAllReviewerPermissions); const savePerms = useServerFn(saveReviewerPermissions);
  const { data: perms = {} } = useQuery({ queryKey: ['reviewer-perms-all', ids.length], queryFn: () => loadPerms() });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['admin-reviewers'] }), qc.invalidateQueries({ queryKey: ['reviewer-perms-all'] })]);
  const toggle = async (userId: string, idx: number, k: keyof ReviewerPermissions) => {
    const cur = perms[userId]; if (!cur) return;
    try { const next = await savePerms({ data: { userId, perms: { ...cur, [k]: !cur[k] } } }); qc.setQueryData(['reviewer-perms-all', ids.length], { ...perms, [userId]: next }); onMessage(`Owner ${idx + 2}: ${PERM_LABEL[k]} ${next[k] ? 'dibuka' : 'ditutup'}.`); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save permissions.'); }
  };
  return <section className="mt-8 max-w-2xl rounded-[20px] border border-primary bg-card p-5">
    <h3 className="font-display text-lg font-black">Owner 2–5 (operator terbatas)</h3>
    <p className="mt-1 text-xs text-muted-foreground">Each Owner logs in with a regular account then opens /review. New Owners start with all menus closed; toggle them on individually. They only see the sponsor network below them.</p>
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={async e => { e.preventDefault(); const id = String(new FormData(e.currentTarget).get('user')); setSaving(true); try { await save({ data: { userId: id, enabled: true } }); await refresh(); onMessage(`Owner ${ids.length + 2} ditambahkan.`); } catch (error) { onMessage(error instanceof Error ? error.message : 'Failed to add Owner.'); } finally { setSaving(false); } }}>
      <select name="user" aria-label="New Owner account" className="form-input min-w-0 flex-1" required disabled={saving} defaultValue=""><option value="" disabled>Select member account</option>{members.filter(m => !ids.includes(m.id)).map(m => <option key={m.id} value={m.id}>{m.email}</option>)}</select>
      <Button disabled={saving} className="rounded-full bg-foreground text-background hover:bg-foreground/90">{saving ? <Loader2 className="animate-spin"/> : <UserCheck/>}{saving ? 'Menyimpan…' : `Jadikan Owner ${ids.length + 2}`}</Button>
    </form>
    <div className="mt-5 space-y-3">{ids.map((id, i) => <div key={id} className="rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><b className="text-sm text-primary">Owner {i + 2}</b><p className="break-all text-xs text-muted-foreground">{members.find(m => m.id === id)?.email ?? id}</p></div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={async () => { try { await save({ data: { userId: id, enabled: false } }); await refresh(); onMessage(`Owner ${i + 2} dihapus.`); } catch { onMessage('Failed to delete.'); } }}>Delete</Button></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{(Object.keys(PERM_LABEL) as (keyof ReviewerPermissions)[]).map(k => <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-xs">{PERM_LABEL[k]}<Switch checked={Boolean(perms[id]?.[k])} disabled={!perms[id]} onCheckedChange={() => toggle(id, i, k)} aria-label={`Owner ${i + 2} ${PERM_LABEL[k]}`}/></label>)}</div>
    </div>)}</div>
    <p className="mt-3 text-[11px] text-muted-foreground">Vault, Users, Presale, Clones, Team, new features, and other sensitive settings remain exclusive to Owner 1.</p>
  </section>;
}

const PERM_LABEL: Record<keyof ReviewerPermissions, string> = { apy: 'APY & paket staking', wallet: 'Dompet & review deposit/withdraw', market: 'Market Price', referral: 'Bonus Referral', leaders: 'Leader bersponsor & Team Support' };

export function AdminTurnover({ members }: { members: { id: string; email: string }[] }) {
  const fetchT = useServerFn(getOwnerTurnover);
  const q = useQuery({ queryKey: ['owner-turnover'], queryFn: () => fetchT() });
  const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (!q.data) return <p className="text-sm text-muted-foreground">Loading turnover…</p>;
  const rows = q.data.owners; const sub = rows.reduce((a, r) => a + r.deposit, 0);
  return <section className="rounded-2xl border border-border bg-card p-4">
    <h3 className="font-bold text-primary">Omset real USDT per Owner</h3>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div><b className="block text-base text-chart-2">{usd(q.data.total.deposit)}</b>Total deposit global</div><div><b className="block text-base text-primary">{usd(sub)}</b>Jaringan sub-owner</div><div><b className="block text-base">{usd(q.data.total.withdraw)}</b>Total withdraw</div></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th className="p-2">Owner</th><th>Member</th><th>Deposit</th><th>Withdraw</th><th>Net</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.userId} className="border-t border-border"><td className="p-2 break-all">{members.find(m => m.id === r.userId)?.email ?? r.code}</td><td>{r.members}</td><td className="text-chart-2">{usd(r.deposit)}</td><td>{usd(r.withdraw)}</td><td>{usd(r.deposit - r.withdraw)}</td></tr>)}
      <tr className="border-t border-border font-bold"><td className="p-2">Jaringan Owner 1 / umum</td><td>—</td><td>{usd(q.data.total.deposit - sub)}</td><td>—</td><td>—</td></tr></tbody></table></div>
  </section>;
}
