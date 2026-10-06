import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { KycCard } from '@/components/KycCard';
import { getMyWallet, requestWithdraw, requestSwap } from '@/lib/bixlink.functions';
import { createDepositIntent, checkDepositIntent } from '@/lib/deposit.functions';
import { dateTime, money, number } from '@/lib/bixlink';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, Copy, QrCode, X, ArrowLeftRight, Lock, Inbox, ScanLine, CheckCircle2, Clock } from 'lucide-react';

function EmptyState({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border bg-card/60 p-8 text-center"><span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary"><Inbox size={22}/></span><p className="text-sm text-muted-foreground">{text}</p>{action && onAction && <Button size="sm" variant="outline" className="rounded-full" onClick={onAction}>{action}</Button>}</div>;
}

export const Route = createFileRoute('/wallet')({ head: () => ({ meta: [{ title: 'Wallet — BIXLINK' }, { name: 'description', content: 'BIXLINK wallet: deposit, withdraw and staking reward history.' }, { property: 'og:title', content: 'Wallet — BIXLINK' }, { property: 'og:description', content: 'Deposit, withdraw and track BIXLINK rewards.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: WalletPage });

const fee = (a: number) => Math.round((1 + a * 0.005) * 100) / 100;
const ICON = { deposit: ArrowDownToLine, withdraw: ArrowUpFromLine, reward: Gift } as const;
const STATUS: Record<string, string> = { pending: 'text-chart-3', approved: 'text-chart-2', rejected: 'text-destructive' };

function WalletPage() {
  const { user, ready } = useMember();
  const { data: cfg } = usePublicConfig();
  const fetchWallet = useServerFn(getMyWallet); const createIntent = useServerFn(createDepositIntent); const checkIntent = useServerFn(checkDepositIntent); const withdraw = useServerFn(requestWithdraw); const swap = useServerFn(requestSwap);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['my-wallet', user?.id], queryFn: () => fetchWallet(), enabled: !!user });
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [depMode, setDepMode] = useState<'copy' | 'qr'>('copy');
  const [amount, setAmount] = useState(''); const [field, setField] = useState('');
  const [notice, setNotice] = useState(''); const [walletCode, setWalletCode] = useState(''); const [success, setSuccess] = useState<{ amount: number; walletCode: string; network: string; txHash: string } | null>(null); const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<{ id: string; amount: number; network: string; address: string; walletCode: string } | null>(null);
  const [swapDirection, setSwapDirection] = useState<'USDT_TO_BIX'|'BIX_TO_USDT'>('USDT_TO_BIX'); const [swapAmount, setSwapAmount] = useState('');
  const [type, setType] = useState('all'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const txs = useMemo(() => (data?.transactions ?? []).filter(t => (type === 'all' || t.type === type) && (!from || t.created_at.slice(0, 10) >= from) && (!to || t.created_at.slice(0, 10) <= to)), [data, type, from, to]);
  const depWallets = cfg?.depositWallets ?? [];
  const selWallet = depWallets.find(w => w.code === walletCode) ?? depWallets[0];
  const addr = selWallet?.address ?? '';
  const swapEnabled = cfg?.swap.enabled ?? false;
  const bixPrice = Number(cfg?.bixMarket.priceUsd ?? 0.84291);
  const amt = Number(amount) || 0;
  const close = () => { setModal(null); setAmount(''); setField(''); setNotice(''); setIntent(null); };
  const poll = async (id: string) => {
    const r = await checkIntent({ data: { id } });
    if (r.status === 'credited') { setSuccess({ amount: r.amount, walletCode: r.walletCode, network: r.network, txHash: r.txHash }); close(); await qc.invalidateQueries({ queryKey: ['my-wallet'] }); }
    else if (r.status === 'expired' || r.status === 'missing') { setIntent(null); setNotice('This deposit request expired. Create a new one.'); }
    else if (r.reason) setNotice(r.reason);
  };
  useEffect(() => { if (!intent) return; const t = setInterval(() => { poll(intent.id).catch(() => {}); }, 15000); return () => clearInterval(t); }, [intent?.id]);
  const submit = async () => {
    if (modal === 'withdraw' && (amt < 10 || amt > 10000)) {
      setNotice('Withdrawal amount must be between $10 and $10,000 per day per account.');
      return;
    }
    setBusy(true);
    try {
      if (modal === 'deposit') {
        if (intent) { await poll(intent.id); setBusy(false); return; }
        const r = await createIntent({ data: { walletCode: selWallet?.code ?? '', amount: Math.floor(amt) } });
        setIntent(r); setNotice(''); setBusy(false); return;
      } else { await withdraw({ data: { amount: amt, address: field } }); }
      close(); await qc.invalidateQueries({ queryKey: ['my-wallet'] });
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Request failed.'); }
    setBusy(false);
  };
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="WALLET">
      <div className="relative overflow-hidden rounded-[20px] border border-chart-3 bg-gradient-to-br from-primary/25 via-card to-chart-3/10 p-6 shadow-[0_0_40px_color-mix(in_oklab,var(--chart-3)_18%,transparent)]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet size={16}/> Available balance</div>
        <strong className="numeric mt-2 block break-all text-[28px] leading-snug font-black text-foreground md:text-[32px]">{money(data?.balance ?? 0)}</strong>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90" onClick={() => setModal('deposit')}><ArrowDownToLine/> Deposit</Button><Button variant="outline" className="rounded-full" onClick={() => setModal('withdraw')}><ArrowUpFromLine/> Withdraw</Button></div>
      </div>
      <Link to="/pay" className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-chart-2/60 bg-card p-4 transition hover:border-chart-2"><span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-chart-2/15 text-chart-2"><ScanLine size={20}/></span><span><b className="block font-display">BIX PAY</b><span className="text-xs text-muted-foreground">Scan QR to pay other members in BIX</span></span></span>{!cfg?.bixPay.enabled ? <span className="inline-flex items-center gap-1 rounded-full border border-chart-3 bg-chart-3/10 px-3 py-1 text-[11px] font-bold text-chart-3"><Lock size={12}/> Coming soon</span> : <span className="text-xs font-bold text-chart-2">OPEN →</span>}</Link>
      <Link to="/transfer" className="mt-3 flex items-center justify-between gap-3 rounded-[20px] border border-chart-3/60 bg-card p-4 transition hover:border-chart-3"><span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-chart-3/15 text-chart-3"><ArrowLeftRight size={20}/></span><span><b className="block font-display">TRANSFER</b><span className="text-xs text-muted-foreground">Send virtual USDT to members (testing)</span></span></span>{!cfg?.usdtTransfer.enabled ? <span className="inline-flex items-center gap-1 rounded-full border border-chart-3 bg-chart-3/10 px-3 py-1 text-[11px] font-bold text-chart-3"><Lock size={12}/> Coming soon</span> : <span className="text-xs font-bold text-chart-2">OPEN →</span>}</Link>
      {notice && <p role="status" className="mt-4 text-sm text-chart-2">{notice}</p>}

      <section className="mt-8 rounded-[20px] border border-primary bg-card p-6"><div className="flex items-center justify-between"><div><div className="eyebrow"><ArrowLeftRight size={14}/> INTERNAL SWAP</div><h2 className="mt-2 font-display text-2xl font-black">BIX / USDT</h2></div><div className="flex flex-col items-end gap-1"><span className="numeric text-sm font-bold text-chart-3">1 BIX = ${bixPrice.toFixed(6)}</span>{!swapEnabled && <span className="inline-flex items-center gap-1 rounded-full border border-chart-3 bg-chart-3/10 px-3 py-1 text-[11px] font-bold text-chart-3"><Lock size={12}/> Coming soon</span>}</div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="min-w-0 rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">USDT balance</span><b className="numeric mt-1 block break-all text-lg sm:text-xl">{money(data?.usdtBalance ?? 0)}</b></div><div className="min-w-0 rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">BIX balance</span><b className="numeric mt-1 block break-all text-lg text-chart-3 sm:text-xl">{number(Number(data?.bixBalance ?? 0), { maximumFractionDigits: 8 })} BIX</b></div></div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2"><label className="text-xs text-muted-foreground">YOU SEND<input className="form-input mt-2" type="number" min="0.00000001" step="any" value={swapAmount} onChange={e=>setSwapAmount(e.target.value)} placeholder="0.00"/><b className="mt-1 block text-foreground">{swapDirection === 'USDT_TO_BIX' ? 'USDT' : 'BIX'}</b></label><Button size="icon" variant="outline" className="mb-6 rounded-full" title="Reverse swap" onClick={()=>setSwapDirection(v=>v==='USDT_TO_BIX'?'BIX_TO_USDT':'USDT_TO_BIX')}><ArrowLeftRight/></Button><label className="text-xs text-muted-foreground">YOU RECEIVE<input className="form-input mt-2" readOnly value={(swapDirection === 'USDT_TO_BIX' ? (Number(swapAmount)||0)/bixPrice : (Number(swapAmount)||0)*bixPrice).toFixed(8)}/><b className="mt-1 block text-foreground">{swapDirection === 'USDT_TO_BIX' ? 'BIX' : 'USDT'}</b></label></div>
        <p className="mt-4 text-xs text-muted-foreground">Swaps are applied instantly in the internal ledger. No on-chain trade is executed.</p><Button disabled={busy || (swapEnabled && !(Number(swapAmount)>0))} className="mt-5 w-full rounded-full bg-primary" onClick={async()=>{if(!swapEnabled){setNotice('Coming soon — BIX/USDT swap is not open yet.');return;}setBusy(true);try{await swap({data:{direction:swapDirection,amount:Number(swapAmount)}});setSwapAmount('');setNotice('Swap completed.');await qc.invalidateQueries({queryKey:['my-wallet']});}catch(e){setNotice(e instanceof Error?e.message:'Swap failed.');}setBusy(false);}}>{swapEnabled?'Request swap':<><Lock size={16}/> Swap · Coming soon</>}</Button>
      </section>

      <h2 className="mt-10 font-display text-xl font-black">Swap history</h2><div className="mt-4 space-y-2">{(data?.swaps ?? []).length ? data?.swaps.map(s=><div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm"><div><b>{s.direction === 'USDT_TO_BIX' ? 'USDT → BIX' : 'BIX → USDT'}</b><div className="text-xs text-muted-foreground">{dateTime(s.created_at)}</div></div><div className="text-right"><div>{number(Number(s.amount_in), { maximumFractionDigits: 8 })} → <b className="text-chart-3">{number(Number(s.amount_out), { maximumFractionDigits: 8 })}</b></div><span className={`text-xs capitalize ${STATUS[s.status]}`}>{s.status}</span></div></div>) : <EmptyState text="No swap requests yet."/>}</div>

      <h2 className="mt-10 font-display text-xl font-black">Transaction history</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {['all', 'deposit', 'withdraw', 'reward'].map(t => <Button key={t} size="sm" variant={type === t ? 'default' : 'outline'} className="rounded-full capitalize" onClick={() => setType(t)}>{t === 'reward' ? 'Staking reward' : t}</Button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><label>From <input type="date" className="form-input ml-1 inline-block w-auto" value={from} onChange={e => setFrom(e.target.value)}/></label><label>To <input type="date" className="form-input ml-1 inline-block w-auto" value={to} onChange={e => setTo(e.target.value)}/></label>{(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}</div>
      <div className="mt-4 space-y-2">{txs.length ? txs.map(t => { const I = ICON[t.type as keyof typeof ICON] ?? Gift; return <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-3"><I size={18} className="shrink-0 text-primary"/><div className="min-w-0"><b className="capitalize">{t.type === 'reward' ? 'Staking reward' : t.type}</b><div className="text-xs text-muted-foreground">{dateTime(t.created_at)}</div>{t.wallet_code && <div className="text-[11px] font-bold text-chart-2">→ {t.wallet_code} · {t.network}</div>}<div className="truncate text-[11px] text-muted-foreground">{t.tx_hash ?? t.address ?? t.note}</div></div></div>
        <div className="shrink-0 text-right"><div className={t.type === 'withdraw' ? 'text-destructive' : 'text-chart-2'}>{t.type === 'withdraw' ? '-' : '+'}{money(Number(t.amount_usd))}</div>{Number(t.fee_usd) > 0 && <div className="text-[11px] text-muted-foreground">fee {money(Number(t.fee_usd))} · receive {money(Number(t.net_usd))}</div>}<div className={`text-xs capitalize ${STATUS[t.status]}`}>{t.status}</div></div></div>; }) : <EmptyState text="No transactions for this filter." action="Make a deposit" onAction={() => setModal('deposit')}/>}</div>

      {modal && <div className="modal-backdrop" onClick={close}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black capitalize">{modal}</h3><Button variant="ghost" size="icon" onClick={close}><X/></Button></div>
        {modal === 'deposit' ? <>
          {!depWallets.length ? <p className="mt-4 text-sm text-destructive">Deposit wallets are not set yet. Please check back later.</p> : <>
          <p className="mt-3 text-xs text-muted-foreground">1. Choose a deposit wallet code</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{depWallets.map(w => <button key={w.code} type="button" onClick={() => setWalletCode(w.code)} className={`rounded-xl border p-2 text-left text-xs transition ${selWallet?.code === w.code ? 'border-chart-2 bg-chart-2/10' : 'border-border'}`}><b className="block font-mono text-sm text-chart-3">{w.code}</b><span className="text-muted-foreground">USDT {w.network}{w.label ? ` · ${w.label}` : ''}</span></button>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Button variant={depMode === 'copy' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDepMode('copy')}><Copy/> Copy wallet</Button><Button variant={depMode === 'qr' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDepMode('qr')}><QrCode/> Scan QR</Button></div>
          {depMode === 'copy' ? <div className="mt-3 rounded-2xl border border-border p-3"><div className="text-xs text-muted-foreground">{selWallet?.code} · USDT {selWallet?.network}</div><div className="mt-1 break-all font-mono text-sm text-chart-3">{addr}</div><Button size="sm" className="mt-3 rounded-full" onClick={async () => { await navigator.clipboard.writeText(addr); setNotice('Wallet address copied.'); }}><Copy/> Copy address</Button></div>
            : <div className="mt-3 flex flex-col items-center gap-2"><div className="rounded-2xl bg-foreground p-3"><QRCodeSVG value={addr} size={180}/></div><div className="text-xs text-muted-foreground">{selWallet?.code} · USDT {selWallet?.network}</div></div>}
          {!intent ? <><p className="mt-4 text-xs text-muted-foreground">2. Enter how much USDT you want to deposit.</p>
          <input className="form-input mt-2" type="number" min="1" step="1" placeholder="Amount USDT (e.g. 50)" value={amount} onChange={e => setAmount(e.target.value)}/></>
          : <div className="mt-4 rounded-2xl border border-chart-2 bg-chart-2/10 p-3 text-center"><div className="text-xs text-muted-foreground">Send EXACTLY this amount of USDT {intent.network}</div><div className="numeric mt-1 text-2xl font-black text-chart-2">{intent.amount.toFixed(4)}</div><Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={async () => { await navigator.clipboard.writeText(intent.amount.toFixed(4)); setNotice('Exact amount copied.'); }}><Copy/> Copy amount</Button><p className="mt-2 text-[11px] text-muted-foreground">The unique decimals identify your deposit. Balance is credited automatically once the blockchain confirms. Valid for 2 hours.</p></div>}
          {notice && <p className="mt-2 text-xs text-destructive">{notice}</p>}
          </>}
        </> : <>
          <p className="mt-3 text-sm">Available: <b className="text-chart-3">{money(data?.balance ?? 0)}</b></p>
          <input className="form-input mt-3" type="number" min="10" max="10000" placeholder="Amount USD (min $10 · max $10,000/day)" value={amount} onChange={e => setAmount(e.target.value)}/>
          <input className="form-input mt-2" placeholder={`Your ${cfg?.wallet.network ?? 'USDT'} address`} value={field} onChange={e => setField(e.target.value)}/>
          <KycCard compact userId={user?.id}/>
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-chart-3/50 bg-chart-3/10 p-2 text-xs text-chart-3"><Clock size={14}/> Minimum withdrawal is $10. Maximum withdrawal is $10,000 per day per account. USDT withdrawals are reviewed manually by admin within 1×24 hours.</p>
          <div className="mt-4 space-y-1 rounded-2xl border border-border p-3 text-xs"><div className="flex justify-between"><span>Admin fee</span><span>$1.00</span></div><div className="flex justify-between"><span>Gas fee (0.5%)</span><span>{money(Math.round(amt * 0.5) / 100)}</span></div><div className="flex justify-between border-t border-border pt-1 font-bold"><span>You receive</span><span className="text-chart-2">{money(Math.max(0, amt - (amt ? fee(amt) : 0)))}</span></div></div>
          {notice && <p className="mt-2 text-xs text-destructive">{notice}</p>}
        </>}
        <Button disabled={busy || (modal === 'deposit' ? !addr || (!intent && !(amt >= 1)) : !field || !amt || amt < 10 || amt > 10000)} className="mt-5 w-full rounded-full bg-chart-3 text-background" onClick={submit}>{busy ? 'Checking blockchain…' : modal === 'deposit' ? (intent ? 'Waiting for transfer… Check now' : 'Get exact deposit amount') : 'Submit withdraw'}</Button>
      </div></div>}
      {success && <div className="modal-backdrop" onClick={() => setSuccess(null)}><div role="dialog" aria-modal="true" className="deposit-success" onClick={e => e.stopPropagation()}>
        <div className="deposit-success-ring"><CheckCircle2 size={56}/></div>
        <div className="eyebrow mt-5 justify-center text-chart-2">DEPOSIT SUCCESS</div>
        <strong className="numeric mt-2 block text-4xl font-black text-chart-2">+{money(success.amount)}</strong>
        <p className="mt-2 text-sm text-muted-foreground">Funds received in wallet code</p>
        <span className="mt-2 inline-block rounded-full border border-chart-2 bg-chart-2/10 px-4 py-1 font-mono text-sm font-bold text-chart-2">{success.walletCode} · USDT {success.network}</span>
        <p className="mt-4 break-all font-mono text-[11px] text-muted-foreground">TxID {success.txHash}</p>
        <Button className="mt-6 w-full rounded-full bg-chart-2 text-background hover:bg-chart-2/90" onClick={() => setSuccess(null)}>Done</Button>
      </div></div>}
    </MemberGate>
  </main></BixShell>;
}
