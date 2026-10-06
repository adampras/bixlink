import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { updateSetting } from '@/lib/bixlink.functions';
import { Send } from 'lucide-react';

export function AdminTransferToggle({ enabled, onMessage }: { enabled: boolean; onMessage: (m: string) => void }) {
  const [open, setOpen] = useState(enabled); const save = useServerFn(updateSetting); const qc = useQueryClient();
  return <section className="mt-8 max-w-2xl rounded-[20px] border border-chart-3 bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="flex items-center gap-2 font-display text-lg font-black"><Send size={18}/> Virtual USDT transfer (testing)</h3><p className="mt-1 text-xs text-muted-foreground">Members and owner send virtual test USDT to each other. Owner starts with $1,000,000 virtual. Not withdrawable, separate from the real wallet.</p></div><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={open} onChange={async e => { const next = e.target.checked; setOpen(next); try { await save({ data: { key: 'usdt_transfer', value: { enabled: next } } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage(next ? 'Transfer is now open.' : 'Transfer is now closed.'); } catch { setOpen(!next); onMessage('Could not update transfer.'); } }}/>{open ? 'OPEN' : 'CLOSED'}</label></div></section>;
}
