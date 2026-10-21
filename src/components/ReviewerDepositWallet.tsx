import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { DepositWallet } from '@/lib/deposit.functions';
import { saveReviewerDepositWallet } from '@/lib/reviewer.functions';

export function ReviewerDepositWallet({ wallet, onSaved, onMessage }: { wallet: DepositWallet | null; onSaved: () => Promise<void>; onMessage: (m: string) => void }) {
  const [row, setRow] = useState(wallet);
  const [busy, setBusy] = useState(false);
  const save = useServerFn(saveReviewerDepositWallet);
  const qc = useQueryClient();
  useEffect(() => setRow(wallet), [wallet]);
  if (!row) return null;
  return <form className="mt-6 max-w-2xl space-y-4" onSubmit={async e => {
    e.preventDefault(); setBusy(true);
    try { await save({ data: row }); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Wallet deposit Anda tersimpan. Hanya member di jaringan Anda yang melihatnya.'); }
    catch (err) { onMessage(err instanceof Error ? err.message : 'Wallet gagal disimpan.'); }
    finally { setBusy(false); }
  }}>
    <div className="flex items-center justify-between gap-2 border-b border-border pb-4"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Wallet size={20}/> IKAT WALLET{row.code === 'OWN-NEW' ? '' : ` · ${row.code}`}</h2><label className="flex items-center gap-2 text-xs font-bold"><Switch aria-label="WLT-01 availability" checked={row.enabled} disabled={busy} onCheckedChange={enabled => setRow({ ...row, enabled })}/>{row.enabled ? 'OPEN' : 'CLOSED'}</label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Nama wallet<input aria-label="WLT-01 label" className="form-input mt-2" maxLength={40} value={row.label} onChange={e => setRow({ ...row, label: e.target.value })}/></label><label className="text-xs text-muted-foreground">Jaringan<select aria-label="WLT-01 network" className="form-input mt-2" value={row.network} onChange={e => setRow({ ...row, network: e.target.value as DepositWallet['network'] })}>{['BEP20', 'TRC20', 'ERC20'].map(n => <option key={n}>{n}</option>)}</select></label><label className="text-xs text-muted-foreground">Koin<select aria-label="Coin" className="form-input mt-2" value={row.asset ?? 'USDT'} onChange={e => setRow({ ...row, asset: e.target.value as 'USDT' | 'USDC' })}><option>USDT</option><option>USDC</option></select></label></div>
    <label className="block text-xs text-muted-foreground">Alamat deposit<input aria-label="WLT-01 address" className="form-input mt-2 font-mono text-xs" maxLength={120} value={row.address} onChange={e => setRow({ ...row, address: e.target.value.trim() })}/></label>
    <Button type="submit" disabled={busy}><Save size={16}/>{busy ? 'Menyimpan…' : 'Simpan wallet'}</Button>
  </form>;
}