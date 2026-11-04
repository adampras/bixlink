import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CoinMark, networkName } from '@/components/deposit/CoinBadge';
import type { DepositWallet, DepositMode } from '@/lib/deposit.functions';
import { getReviewerExtraWallets, saveReviewerExtraWallets } from '@/lib/reviewer.functions';

const MAX = 10;
const TEMPLATES: DepositWallet[] = [
  { code: '', label: 'USDT BEP-20', network: 'BEP20', asset: 'USDT', address: '', enabled: false, mode: 'both' },
  { code: '', label: 'USDT TRC-20', network: 'TRC20', asset: 'USDT', address: '', enabled: false, mode: 'both' },
  { code: '', label: 'USDC BEP-20', network: 'BEP20', asset: 'USDC', address: '', enabled: false, mode: 'both' },
];
const validAddr = (w: DepositWallet) => (w.network === 'TRC20' ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/ : /^0x[0-9a-fA-F]{40}$/).test(w.address);

export function ReviewerMultiWallets({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getReviewerExtraWallets); const save = useServerFn(saveReviewerExtraWallets); const qc = useQueryClient();
  const [rows, setRows] = useState<DepositWallet[]>(TEMPLATES); const [busy, setBusy] = useState(false);
  useEffect(() => { load().then(w => { if (w.length) setRows(w); }).catch(() => {}); }, []);
  const set = (i: number, p: Partial<DepositWallet>) => setRows(r => r.map((w, j) => (j === i ? { ...w, ...p } : w)));
  const active = rows.filter(w => w.enabled && validAddr(w)).length;
  return <section className="mt-6 max-w-2xl rounded-[20px] border border-chart-2/60 bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 font-display text-lg font-black"><Wallet size={18}/> Wallet deposit tambahan</h2>
        <p className="mt-1 text-xs text-muted-foreground">Enter your wallet address, turn on the toggle, then Save. Empty/inactive wallets are not shown to members in your network.</p></div>
      <span className="rounded-full border border-chart-2 px-3 py-1 text-xs font-bold text-chart-2">{active} aktif / {rows.length}</span>
    </div>
    <div className="mt-4 space-y-3">{rows.map((w, i) => { const ok = !w.address || validAddr(w); return <div key={i} className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><CoinMark asset={w.asset ?? 'USDT'} network={w.network} size={30}/><div><b className="text-sm">{w.asset ?? 'USDT'} · {w.network.replace('20', '-20')}</b><div className="text-[11px] text-muted-foreground">{networkName(w.network)}{w.code ? ` · Ref: ${w.code}` : ''}</div></div></div>
        <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-xs font-bold"><Switch checked={w.enabled} onCheckedChange={enabled => set(i, { enabled })} aria-label={`Aktifkan wallet ${i + 1}`}/>{w.enabled ? 'ACTIVE' : 'INACTIVE'}</label>
          {rows.length > 1 && <Button type="button" size="icon" variant="ghost" aria-label={`Delete wallet ${i + 1}`} onClick={() => setRows(r => r.filter((_, j) => j !== i))}><Trash2 size={16}/></Button>}</div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Koin<select className="form-input mt-1" value={w.asset ?? 'USDT'} onChange={e => set(i, { asset: e.target.value as 'USDT' | 'USDC' })}><option>USDT</option><option>USDC</option></select></label>
        <label className="text-xs text-muted-foreground">Network<select className="form-input mt-1" value={w.network} onChange={e => set(i, { network: e.target.value as DepositWallet['network'] })}>{['BEP20', 'TRC20', 'ERC20'].map(n => <option key={n}>{n}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Model deposit<select className="form-input mt-1" value={w.mode ?? 'both'} onChange={e => set(i, { mode: e.target.value as DepositMode })}><option value="flex">Any amount (TxID)</option><option value="unique">3-digit unique code</option><option value="both">Keduanya</option></select></label>
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">Alamat wallet<input className="form-input mt-1 font-mono text-xs" maxLength={120} value={w.address} onChange={e => set(i, { address: e.target.value.trim() })} placeholder={w.network === 'TRC20' ? 'T…' : '0x…'}/></label>
      {!ok && <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle size={12}/>Alamat tidak cocok dengan jaringan {w.network}.</p>}
      {w.address && ok && <p className="mt-1 flex items-center gap-1 text-[11px] text-chart-2"><CheckCircle2 size={12}/>Alamat valid</p>}
    </div>; })}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="rounded-full" disabled={rows.length >= MAX} onClick={() => setRows(r => [...r, { ...TEMPLATES[0]!, label: '' }])}><Plus/> Add wallet</Button>
      <Button disabled={busy} className="rounded-full" onClick={async () => { setBusy(true); try { const out = await save({ data: { wallets: rows } }); setRows(out); await qc.invalidateQueries({ queryKey: ['my-deposit-wallets'] }); onMessage('Wallet saved. Active wallets are instantly visible to members in your network.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save wallet.'); } setBusy(false); }}><Save/> {busy ? 'Saving…' : 'Save wallet'}</Button>
    </div>
  </section>;
}
