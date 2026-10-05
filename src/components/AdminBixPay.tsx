import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getAdminTransfers, reverseTransfer, updateSetting } from '@/lib/bixlink.functions';
import { ScanLine, Undo2 } from 'lucide-react';

export function AdminBixPay({ enabled = false, onMessage }: { enabled?: boolean; onMessage: (m: string) => void }) {
  const save = useServerFn(updateSetting); const list = useServerFn(getAdminTransfers); const reverse = useServerFn(reverseTransfer);
  const qc = useQueryClient();
  const [open, setOpen] = useState(enabled);
  const { data = [], refetch } = useQuery({ queryKey: ['admin-transfers'], queryFn: () => list() });
  return <div className="mt-8 space-y-4">
    <section className="max-w-2xl rounded-[20px] border border-chart-2 bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="flex items-center gap-2 font-display text-lg font-black"><ScanLine size={18}/> BIX PAY availability</h3><p className="mt-1 text-xs text-muted-foreground">Closed mode shows Coming soon and blocks payments in the backend. Open payments move instantly.</p></div><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={open} onChange={async e => { const next = e.target.checked; setOpen(next); try { await save({ data: { key: 'bix_pay', value: { enabled: next } } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage(next ? 'BIX PAY is now open.' : 'BIX PAY is now closed.'); } catch { setOpen(!next); onMessage('Could not update BIX PAY.'); } }}/>{open ? 'OPEN' : 'CLOSED'}</label></div></section>
    <h3 className="font-display text-lg font-black">BIX PAY transactions</h3>
    <div className="space-y-2">{data.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-xs"><div><b className="text-sm">{t.sender_code} → {t.recipient_code}</b><div className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}{t.note ? ` · ${t.note}` : ''}</div></div><div className="flex items-center gap-3"><div className="text-right"><b className="numeric text-chart-3">{Number(t.amount_bix).toLocaleString()} BIX</b><div className="capitalize">{t.status}</div></div>{t.status === 'completed' && <Button size="sm" variant="destructive" className="rounded-full" onClick={async () => { if (!confirm('Reverse this payment?')) return; try { await reverse({ data: { id: t.id } }); await refetch(); onMessage('Payment reversed.'); } catch { onMessage('Could not reverse payment.'); } }}><Undo2/> Reverse</Button>}</div></div>)}{!data.length && <p className="text-sm text-muted-foreground">No BIX PAY transactions yet.</p>}</div>
  </div>;
}
