import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { saveDepositWallets, type DepositWallet, type DepositMode } from '@/lib/deposit.functions';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Owner1DepositLocks } from '@/components/Owner1DepositLocks';
import { DepositQuotaRoutes } from '@/components/DepositQuotaRoutes';
import { Plus, Save, Trash2, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';

const MAX = 12;
const NETWORKS: { value: DepositWallet['network']; label: string; hint: string }[] = [
  { value: 'BEP20', label: 'BNB Smart Chain (BEP20)', hint: 'Alamat diawali 0x… (42 karakter)' },
  { value: 'TRC20', label: 'TRON (TRC20)', hint: 'Alamat diawali T… (34 karakter)' },
  { value: 'ERC20', label: 'Ethereum (ERC20)', hint: 'Alamat diawali 0x… (42 karakter)' },
];
const validAddr = (w: DepositWallet) => (w.network === 'TRC20' ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/ : /^0x[0-9a-fA-F]{40}$/).test(w.address);
const nextCode = (rows: DepositWallet[]) => { let i = rows.length + 1; while (rows.some(r => r.code === `WLT-${String(i).padStart(2, '0')}`)) i++; return `WLT-${String(i).padStart(2, '0')}`; };
const blank = (rows: DepositWallet[]): DepositWallet => ({ code: nextCode(rows), label: '', network: 'BEP20', asset: 'USDT', address: '', enabled: false });

export function AdminDepositWallets({ initial, onMessage }: { initial?: DepositWallet[] | undefined; onMessage: (m: string) => void }) {
  const save = useServerFn(saveDepositWallets);
  const qc = useQueryClient();
  const [rows, setRows] = useState<DepositWallet[]>(() => (initial?.length ? initial : [blank([])]));
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<DepositWallet>) => setRows(r => r.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const active = rows.filter(w => w.enabled && validAddr(w)).length;
  return <section className="rounded-[20px] border border-chart-2/60 bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-display text-lg font-black"><Wallet size={18}/> Wallet deposit Owner 1</h3>
        <p className="mt-1 text-xs text-muted-foreground">Bind crypto wallet as a deposit option for Owner 1 network members. Owner 2 network members will only see Owner 2's wallet.</p></div>
      <span className="rounded-full border border-chart-2 px-3 py-1 text-xs font-bold text-chart-2">{active} aktif / {rows.length}</span>
    </div>
    <ol className="mt-3 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-3"><li>1. Select coin & network</li><li>2. Paste your wallet address</li><li>3. Turn on the switch then Save</li></ol>
    <div className="mt-4 space-y-3">{rows.map((w, i) => { const ok = !w.address || validAddr(w); const net = NETWORKS.find(n => n.value === w.network)!; return <div key={i} className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-bold text-chart-3">{w.code}</span>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold"><Switch checked={w.enabled} onCheckedChange={enabled => set(i, { enabled })} aria-label={`Aktifkan ${w.code}`}/>{w.enabled ? 'ACTIVE' : 'INACTIVE'}</label>
          {rows.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${w.code}`} onClick={() => setRows(r => r.filter((_, j) => j !== i))}><Trash2 size={16}/></Button>}</div></div>
      <label className="mt-3 block text-xs text-muted-foreground">Model deposit<select className="form-input mt-1" value={w.mode ?? 'both'} onChange={e => set(i, { mode: e.target.value as DepositMode })}><option value="flex">Wallet A · Any amount (TxID)</option><option value="unique">Wallet B · Unique code (3 digits)</option><option value="both">Keduanya</option></select></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Nama wallet<input className="form-input mt-1" maxLength={40} value={w.label} onChange={e => set(i, { label: e.target.value })} placeholder="mis. BIXLINK Official"/></label>
        <label className="text-xs text-muted-foreground">Koin<select className="form-input mt-1" value={w.asset ?? 'USDT'} onChange={e => set(i, { asset: e.target.value as 'USDT' | 'USDC' })}><option value="USDT">USDT (Tether)</option><option value="USDC">USDC (USD Coin)</option></select></label>
        <label className="text-xs text-muted-foreground">Network<select className="form-input mt-1" value={w.network} onChange={e => set(i, { network: e.target.value as DepositWallet['network'] })}>{NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}</select></label>
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">Alamat wallet penerima<input className="form-input mt-1 font-mono text-xs" maxLength={120} value={w.address} onChange={e => set(i, { address: e.target.value.trim() })} placeholder={w.network === 'TRC20' ? 'T…' : '0x…'}/></label>
      <p className={`mt-1 flex items-center gap-1 text-[11px] ${ok ? 'text-muted-foreground' : 'text-destructive'}`}>{w.address && ok ? <CheckCircle2 size={12} className="text-chart-2"/> : !ok ? <AlertTriangle size={12}/> : null}{ok ? net.hint : `Address does not match the ${w.network} network.`}</p>
    </div>; })}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="rounded-full" disabled={rows.length >= MAX} onClick={() => setRows(r => [...r, blank(r)])}><Plus/> Add wallet</Button>
      <Button disabled={busy} className="rounded-full" onClick={async () => { setBusy(true); try { await save({ data: { wallets: rows } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Deposit wallet saved.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save wallet.'); } setBusy(false); }}><Save/> {busy ? 'Saving…' : 'Save wallet'}</Button>
    </div>
    <Owner1DepositLocks onMessage={onMessage}/>
    <DepositQuotaRoutes onMessage={onMessage}/>
    <p className="mt-3 text-[11px] text-muted-foreground">USDT/USDC deposits on this network are verified automatically on the blockchain and credited to the wallet code paid by the member.</p>
  </section>;
}
