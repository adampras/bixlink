import { useEffect, useState } from 'react';
import { Crown, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { number } from '@/lib/bixlink';
import { genesisTier } from '@/lib/presale-strategy';

export type PresaleSelection = { usd: number; strategy: string; bix: number; days: number; dailyUsd: number; artwork: string };

export function PresalePurchaseDialog({ selection, balance, busy, error, onClose, onConfirm }: {
  selection: PresaleSelection | null; balance: number; busy: boolean; error: string; onClose: () => void; onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { setAccepted(false); }, [selection]);
  return <Dialog open={selection !== null} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="presale-purchase-dialog" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
      {selection && <>
        <div className="purchase-art"><img src={selection.artwork} alt=""/><span><Crown size={14}/> GENESIS ALLOCATION</span></div>
        <div className="purchase-details">
          <DialogTitle className="font-display text-xl leading-snug">{genesisTier(selection.usd)}</DialogTitle>
          <DialogDescription className="mt-1 capitalize">{selection.strategy} · Confirm your presale allocation</DialogDescription>
          <strong className="numeric mt-4 block text-3xl font-bold text-chart-3">{number(selection.usd)} <small className="text-sm">USDT</small></strong>
          <dl className="mt-4 text-xs">
            <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">Locked allocation</dt><dd className="numeric font-bold">{number(selection.bix)} BIX</dd></div>
            <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">Release period</dt><dd>{selection.days} days</dd></div>
            {selection.dailyUsd > 0 && <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">USDT daily terms</dt><dd className="numeric">{number(selection.dailyUsd, {maximumFractionDigits: 2})} USDT</dd></div>}
            <div className="flex justify-between gap-3 border-y border-border py-2"><dt className="text-muted-foreground">Available USDT</dt><dd className="numeric">{number(balance, {maximumFractionDigits: 2})}</dd></div>
          </dl>
          <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-muted-foreground"><LockKeyhole size={14} className="shrink-0"/>Purchase deducts your internal USDT balance. BIX remains locked; release tracking is not spendable until settlement opens. No on-chain token or guaranteed profit.</p>
          <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" className="mt-0.5 accent-primary" checked={accepted} disabled={busy} onChange={event => setAccepted(event.target.checked)}/>I have reviewed the allocation, lock period and risks.</label>
          {balance < selection.usd && <p className="mt-3 text-xs text-destructive">Insufficient USDT balance.</p>}
          {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
          <div className="mt-4 grid grid-cols-[auto_1fr] gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || !accepted || balance < selection.usd} onClick={onConfirm}><ShieldCheck size={15}/>{busy ? 'Processing…' : 'Confirm purchase'}</Button></div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}