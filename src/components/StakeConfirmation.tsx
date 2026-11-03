import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCircle2, Clock3, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { money, number, type Package } from '@/lib/bixlink';
import { confirmPin } from '@/components/TxFeedback';

export function StakeConfirmation({ pkg, usdt, bix, reference, close, submit }: {
  pkg: Package; usdt: number; bix: number; reference: number; close: () => void;
  submit: (mode: 'usdt' | 'hybrid') => Promise<{ id: string; status: string }>;
}) {
  const [mode, setMode] = useState<'usdt' | 'hybrid'>('usdt');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ id: string; status: string } | null>(null);
  const price = Number(pkg.price_usd);
  const usdtNeed = mode === 'hybrid' ? price * .7 : price;
  const bixNeed = mode === 'hybrid' ? price * .3 / reference : 0;
  const profit = price * pkg.apy / 100 / 365 * pkg.lock_days;
  const insufficient = usdt < usdtNeed || bix < bixNeed;
  return <Dialog open onOpenChange={open => { if (!open && !busy) close(); }}><DialogContent className="stake-detail-dialog" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onInteractOutside={e => { if (busy) e.preventDefault(); }}>
    <div className="flex items-center gap-2 text-primary"><ShieldCheck size={18}/><span className="text-xs font-bold">BIXLINK · STAKING</span></div>
    <DialogTitle className="pr-8 font-display text-2xl">{receipt ? 'Request receipt' : pkg.id}</DialogTitle>
    <DialogDescription>{receipt ? 'Status verified from your recorded staking activity.' : `${pkg.lock_days}-day contract · review before confirming`}</DialogDescription>
    {receipt ? <>
      <div role="status" className="stake-receipt lux-plaque rounded-2xl py-6 text-center">{receipt.status === 'active' || receipt.status === 'completed' ? <div className="lux-seal"><CheckCircle2 size={32}/></div> : <Clock3 className="mx-auto text-chart-3" size={36}/>}<span className="lux-eyebrow mt-3 block">OFFICIAL STAKING RECEIPT</span><strong className="mt-1 block font-display text-xl uppercase lux-gold-text">{receipt.status}</strong><p className="mt-2 text-muted-foreground">{money(price)} · {pkg.id}</p><p className="mt-3 break-all font-mono text-xs">{receipt.id}</p></div>
      <p className="text-xs leading-5 text-muted-foreground">Your wallet notifications track recorded status changes. Projected yield is not spendable; completion does not trigger an automatic payout.</p>
      <Button asChild><Link to="/wallet"><Wallet size={16}/> Open wallet</Link></Button><Button variant="outline" onClick={close}>View staking history</Button>
    </> : <>
      <strong className="numeric text-3xl text-foreground">{money(price)}</strong>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">{(['usdt', 'hybrid'] as const).map(m => <Button key={m} variant="outline" role="radio" aria-checked={m === mode} className={`h-auto min-h-16 whitespace-normal px-3 py-3 text-left ${m === mode ? 'border-primary bg-primary/10' : ''}`} onClick={() => { setMode(m); setAgree(false); }}>{m === 'usdt' ? '100% virtual USDT' : '70% virtual USDT · 30% BIX'}</Button>)}</div>
      <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-xs"><div><dt className="text-muted-foreground">Daily projection</dt><dd className="mt-1 text-lg font-bold text-primary">{money(price * pkg.apy / 100 / 365)}</dd></div><div><dt className="text-muted-foreground">Profit · {pkg.lock_days} days</dt><dd className="mt-1 text-lg font-bold text-primary">{money(profit)}</dd></div><div><dt className="text-muted-foreground">Principal + projected yield</dt><dd className="mt-1 text-xl font-bold">{money(price + profit)}</dd></div><div><dt className="text-muted-foreground">Annual rate snapshot</dt><dd className="mt-1 text-lg font-bold">{number(pkg.apy)}%</dd></div></dl>
      <p className="text-xs text-muted-foreground">Required: {money(usdtNeed)} virtual USDT{bixNeed > 0 ? ` + ${number(bixNeed, { maximumFractionDigits: 2 })} BIX at internal reference ${number(reference, { maximumFractionDigits: 6 })}` : ''}. Available: {money(usdt)} virtual USDT · {number(bix, { maximumFractionDigits: 2 })} BIX. Internal ledger only, not a blockchain payment.</p>
      {insufficient && <p role="alert" className="text-xs text-destructive">Insufficient balance for this payment method.</p>}
      <label className="flex items-start gap-3 text-xs leading-5"><input type="checkbox" checked={agree} disabled={busy} onChange={e => setAgree(e.target.checked)} className="mt-1"/>I accept the lock period, estimated yield and early-unstake penalties. At completion, certificate and settlement terms apply; no guaranteed cash return.</label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy || !agree || insufficient} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { if (!(await confirmPin())) return; setReceipt(await submit(mode)); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed. Please retry.'); } finally { setBusy(false); } }}>{busy ? <><Clock3 size={16}/> Pending confirmation…</> : 'Confirm staking request'}</Button>
      <p className="text-[11px] text-muted-foreground">Non-custodial request. APY is a projection, not a guarantee.</p>
    </>}
  </DialogContent></Dialog>;
}