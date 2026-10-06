import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { saveDepositWallets, type DepositWallet } from '@/lib/deposit.functions';
import { Button } from '@/components/ui/button';
import { Save, Wallet } from 'lucide-react';

const blank = (i: number): DepositWallet => ({ code: `WLT-0${i + 1}`, label: '', network: 'BEP20', address: '', enabled: false });

export function AdminDepositWallets({ initial, onMessage }: { initial?: DepositWallet[] | undefined; onMessage: (m: string) => void }) {
  const save = useServerFn(saveDepositWallets);
  const qc = useQueryClient();
  const [rows, setRows] = useState<DepositWallet[]>(() => Array.from({ length: 5 }, (_, i) => initial?.[i] ?? blank(i)));
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<DepositWallet>) => setRows(r => r.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  return <section className="rounded-[20px] border border-chart-2/60 bg-card p-5">
    <h3 className="flex items-center gap-2 font-display text-lg font-black"><Wallet size={18}/> Owner deposit wallets (5)</h3>
    <p className="mt-1 text-xs text-muted-foreground">Each wallet has its own code. Member deposits are verified on the blockchain and credited automatically to the wallet code they paid into.</p>
    <div className="mt-4 space-y-3">{rows.map((w, i) => <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[110px_1fr_110px_2fr_auto] sm:items-center">
      <input className="form-input font-mono uppercase" value={w.code} onChange={e => set(i, { code: e.target.value.toUpperCase() })} placeholder="Code" aria-label={`Wallet ${i + 1} code`}/>
      <input className="form-input" value={w.label} onChange={e => set(i, { label: e.target.value })} placeholder="Label (optional)"/>
      <select className="form-input" value={w.network} onChange={e => set(i, { network: e.target.value as DepositWallet['network'] })}><option value="BEP20">BEP20</option><option value="TRC20">TRC20</option><option value="ERC20">ERC20</option></select>
      <input className="form-input font-mono text-xs" value={w.address} onChange={e => set(i, { address: e.target.value.trim() })} placeholder={w.network === 'TRC20' ? 'T…' : '0x…'}/>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={w.enabled} onChange={e => set(i, { enabled: e.target.checked })}/>{w.enabled ? 'ON' : 'OFF'}</label>
    </div>)}</div>
    <Button disabled={busy} className="mt-4 rounded-full" onClick={async () => { setBusy(true); try { await save({ data: { wallets: rows } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Deposit wallets saved.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Could not save wallets.'); } setBusy(false); }}><Save/> Save wallets</Button>
  </section>;
}
