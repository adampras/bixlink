import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BadgeCheck, Crown, LockKeyhole, ScrollText, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number } from '@/lib/bixlink';
import { genesisTier } from '@/lib/presale-strategy';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { VIP_PASS_THRESHOLD } from '@/components/VaultFacility';

export type PresaleSelection = { usd: number; strategy: string; bix: number; days: number; dailyUsd: number; artwork: string };
export type PresaleReceipt = { usd: number; bix: number; serial: number; dailyUsd: number };

export function PresalePurchaseDialog({ selection, receipt, balance, busy, error, onClose, onConfirm, onPortfolio }: {
  selection: PresaleSelection | null; receipt?: PresaleReceipt | null; balance: number; busy: boolean; error: string; onClose: () => void; onConfirm: () => void; onPortfolio?: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { setAccepted(false); }, [selection]);
  const open = selection !== null || !!receipt;
  const row = (k: string, v: React.ReactNode) => <div className="lux-row"><dt>{k}</dt><dd className="numeric">{v}</dd></div>;
  return <DialogPrimitive.Root open={open} onOpenChange={o => { if (!o && !busy) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"/>
      <div className="pp-frame">
        <DialogPrimitive.Content className="pp-sheet lux-sheet" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}>
          {receipt ? <div className="purchase-details text-center">
            <div className="lux-seal"><BadgeCheck size={34}/></div>
            <span className="lux-eyebrow mt-3 block">OFFICIAL ALLOCATION RECEIPT</span>
            <DialogPrimitive.Title className="mt-1 font-display text-2xl font-black lux-gold-text">Purchase successful</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">Your Genesis Founder Deed is recorded in the BIXLINK ledger.</DialogPrimitive.Description>
            <p className="numeric mt-4 font-display text-lg font-black lux-gold-text">#GEN-{String(receipt.serial).padStart(4, '0')}</p>
            <dl className="mt-3 text-left text-xs">
              {row('Paid', `${number(receipt.usd)} USDT`)}
              {row('Locked allocation', `${number(receipt.bix)} BIX`)}
              {receipt.dailyUsd > 0 && row('USDT daily terms', `${number(receipt.dailyUsd, { maximumFractionDigits: 2 })} USDT`)}
              {row('Facility', receipt.usd >= VIP_PASS_THRESHOLD ? 'Founder Deed + VIP Pass' : 'Founder Deed')}
            </dl>
            <Button className="lux-cta mt-5 w-full rounded-full" onClick={onPortfolio ?? onClose}><ScrollText size={15}/> View my portfolio</Button>
            <button type="button" className="mt-2 text-xs text-muted-foreground underline" onClick={onClose}>Close</button>
          </div> : selection && <>
            <div className="purchase-art"><img src={selection.artwork} alt=""/><span><Crown size={14}/> GENESIS FOUNDER DEED</span></div>
            <div className="purchase-details">
              <span className="lux-eyebrow">{selection.strategy} · Confirm allocation</span>
              <DialogPrimitive.Title className="mt-1 font-display text-xl font-black leading-snug">{genesisTier(selection.usd)}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Confirm your presale allocation</DialogPrimitive.Description>
              <strong className="numeric mt-2 block font-display text-3xl font-black lux-gold-text"><AnimatedNumber value={selection.usd} digits={0}/> <small className="text-sm">USDT</small></strong>
              <dl className="mt-3 text-xs">
                {row('Presale rate', '1 BIX = $0.50 USDT')}
                {row('Locked allocation', `${number(selection.bix)} BIX`)}
                {row('Release period', `${selection.days} days`)}
                {selection.dailyUsd > 0 && row('USDT daily terms', `${number(selection.dailyUsd, { maximumFractionDigits: 2 })} USDT`)}
                {row('Available USDT', number(balance, { maximumFractionDigits: 2 }))}
              </dl>
              <p className="lux-note mt-3"><LockKeyhole size={13} className="shrink-0"/>Deducted from your internal USDT balance. BIX stays locked until settlement opens. No on-chain token or guaranteed profit.</p>
              <label className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"><input type="checkbox" className="mt-0.5 accent-primary" checked={accepted} disabled={busy} onChange={e => setAccepted(e.target.checked)}/>I have reviewed the allocation, lock period and risks.</label>
              {balance < selection.usd && <p className="mt-3 text-xs text-destructive">Insufficient USDT balance.</p>}
              {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-2"><Button variant="outline" className="rounded-full" disabled={busy} onClick={onClose}>Cancel</Button><Button className="lux-cta rounded-full" disabled={busy || !accepted || balance < selection.usd} onClick={onConfirm}><ShieldCheck size={15}/>{busy ? 'Processing…' : 'Confirm purchase'}</Button></div>
            </div>
          </>}
          <DialogPrimitive.Close className="pp-close" aria-label="Close" disabled={busy}><X size={16}/></DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
