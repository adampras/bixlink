import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDepositQuotaRoutes, setDepositQuotaRoute } from '@/lib/deposit.functions';

/** Owner 1: after N direct sponsors of a member, direct #N+1… and their whole downline deposit to Owner 1 wallets. */
export function DepositQuotaRoutes({ onMessage }: { onMessage: (m: string) => void }) {
  const list = useServerFn(getDepositQuotaRoutes); const set = useServerFn(setDepositQuotaRoute);
  const q = useQuery({ queryKey: ['deposit-quota-routes'], queryFn: () => list() });
  const [code, setCode] = useState(''); const [max, setMax] = useState(5); const [busy, setBusy] = useState(false);
  const run = async (c: string, m: number, on: boolean) => { setBusy(true); try { await set({ data: { code: c, max: m, on } }); if (on) setCode(''); await q.refetch(); onMessage(on ? 'Aturan batas sponsor disimpan.' : 'Aturan dihapus.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal.'); } setBusy(false); };
  return <div className="mt-5 rounded-xl border border-chart-3/50 p-3">
    <h4 className="flex items-center gap-2 text-sm font-black"><GitBranch size={14}/> Batas direct sponsor → wallet Admin 1</h4>
    <p className="mt-1 text-[11px] text-muted-foreground">Direct sponsor setelah batas (misal ke-6 dst) beserta seluruh jaringan di bawahnya hanya melihat wallet deposit Admin 1. Pohon network dan komisi tidak berubah.</p>
    <div className="mt-2 flex gap-2">
      <input className="form-input flex-1" placeholder="Referral code / username ID A" value={code} onChange={e => setCode(e.target.value)}/>
      <input className="form-input w-20" type="number" min={0} aria-label="Batas direct" value={max} onChange={e => setMax(Math.max(0, Math.floor(Number(e.target.value) || 0)))}/>
      <Button disabled={busy || code.trim().length < 2} onClick={() => run(code, max, true)}>Simpan</Button>
    </div>
    <ul className="mt-3 space-y-2 text-xs">{(q.data ?? []).map(r => <li key={(r.code ?? '') + r.created_at} className="rounded-lg border border-border p-2">
      <div className="flex items-center justify-between"><span className="font-mono font-bold">{r.code} · {r.username} · batas {r.max_direct}</span>
        <Button size="sm" variant="ghost" disabled={busy || !r.code} onClick={() => r.code && run(r.code, r.max_direct, false)}><Trash2 size={12}/></Button></div>
      <div className="mt-1 flex flex-wrap gap-1">{r.directs.map((d, i) => <span key={i} className={`rounded px-1.5 py-0.5 font-mono ${d.routed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{i + 1}. {d.code}{d.routed ? ' → Admin 1' : ''}</span>)}
        {!r.directs.length && <span className="text-muted-foreground">Belum ada direct sponsor.</span>}</div>
    </li>)}</ul>
  </div>;
}
