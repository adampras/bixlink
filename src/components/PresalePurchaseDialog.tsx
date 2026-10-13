import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Crown, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number } from '@/lib/bixlink';
import { genesisTier } from '@/lib/presale-strategy';
import { AnimatedNumber } from '@/components/AnimatedNumber';

export type PresaleSelection = { usd: number; strategy: string; bix: number; days: number; dailyUsd: number; artwork: string };

export function PresalePurchaseDialog({ selection, balance, busy, error, onClose, onConfirm }: {
  selection: PresaleSelection | null; balance: number; busy: boolean; error: string; onClose: () => void; onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { setAccepted(false); }, [selection]);
  return <DialogPrimitive.Root open={selection !== null} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"/>
      <div className="pp-frame">
        <DialogPrimitive.Content className="pp-sheet" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
          {selection && <>
            <div className="purchase-art"><img src={selection.artwork} alt=""/><span><Crown size={14}/> GENESIS ALLOCATION</span></div>
            <div className="purchase-details">
              <DialogPrimitive.Title className="font-display text-xl font-semibold leading-snug">{genesisTier(selection.usd)}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm capitalize text-muted-foreground">{selection.strategy} · Confirm your presale allocation</DialogPrimitive.Description>
              <strong className="numeric mt-3 block text-2xl font-bold text-chart-3"><AnimatedNumber value={selection.usd} digits={0}/> <small className="text-sm">USDT</small></strong>
              <dl className="mt-3 text-xs">
                <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">Presale rate</dt><dd className="numeric font-bold">1 BIX = $0.50 USDT</dd></div>
                <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">Locked allocation</dt><dd className="numeric font-bold">{number(selection.bix)} BIX</dd></div>
                <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">Release period</dt><dd>{selection.days} days</dd></div>
                {selection.dailyUsd > 0 && <div className="flex justify-between gap-3 border-t border-border py-2"><dt className="text-muted-foreground">USDT daily terms</dt><dd className="numeric">{number(selection.dailyUsd, {maximumFractionDigits: 2})} USDT</dd></div>}
                <div className="flex justify-between gap-3 border-y border-border py-2"><dt className="text-muted-foreground">Available USDT</dt><dd className="numeric">{number(balance, {maximumFractionDigits: 2})}</dd></div>
              </dl>
              <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-muted-foreground"><LockKeyhole size={14} className="shrink-0"/>Purchase deducts your internal USDT balance. BIX remains locked; release tracking is not spendable until settlement opens. No on-chain token or guaranteed profit.</p>
              <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" className="mt-0.5 accent-primary" checked={accepted} disabled={busy} onChange={event => setAccepted(event.target.checked)}/>I have reviewed the allocation, lock period and risks.</label>
              {balance < selection.usd && <p className="mt-3 text-xs text-destructive">Insufficient USDT balance.</p>}
              {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || !accepted || balance < selection.usd} onClick={onConfirm}><ShieldCheck size={15}/>{busy ? 'Processing…' : 'Confirm purchase'}</Button></div>
            </div>
          </>}
          <DialogPrimitive.Close className="pp-close" aria-label="Close" disabled={busy}><X size={16}/></DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
