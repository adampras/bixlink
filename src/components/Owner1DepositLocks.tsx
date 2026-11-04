import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOwner1DepositLocks, setOwner1DepositLock } from '@/lib/deposit.functions';

/** Owner 1: members (and their downlines) moved under Owner 2 keep seeing Owner 1 deposit wallets. */
export function Owner1DepositLocks({ onMessage }: { onMessage: (m: string) => void }) {
  const list = useServerFn(getOwner1DepositLocks); const set = useServerFn(setOwner1DepositLock);
  const q = useQuery({ queryKey: ['owner1-deposit-locks'], queryFn: () => list() });
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const run = async (c: string, lock: boolean) => { setBusy(true); try { await set({ data: { code: c, lock } }); setCode(''); await q.refetch(); onMessage(lock ? 'Member dikunci ke wallet Owner 1.' : 'Kunci wallet Owner 1 dilepas.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal.'); } setBusy(false); };
  return <div className="mt-5 rounded-xl border border-chart-3/50 p-3">
    <h4 className="flex items-center gap-2 text-sm font-black"><Lock size={14}/> Lock Owner 1 wallet (transferred network)</h4>
    <p className="mt-1 text-[11px] text-muted-foreground">Members moved to the Owner 2 network and their downlines still see the Owner 1 deposit wallet.</p>
    <div className="mt-2 flex gap-2"><input className="form-input" placeholder="Referral code / username" value={code} onChange={e => setCode(e.target.value)}/><Button disabled={busy || code.trim().length < 2} onClick={() => run(code, true)}><Lock size={14}/> Kunci</Button></div>
    <ul className="mt-2 space-y-1 text-xs">{(q.data ?? []).map(r => <li key={(r.code ?? '') + r.created_at} className="flex items-center justify-between rounded-lg border border-border px-2 py-1"><span className="font-mono">{r.code} · {r.username}</span><Button size="sm" variant="ghost" disabled={busy || !r.code} onClick={() => r.code && run(r.code, false)}><Unlock size={12}/> Lepas</Button></li>)}</ul>
  </div>;
}
