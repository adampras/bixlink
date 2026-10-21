import { AnimatedNumber } from '@/components/AnimatedNumber';
import { PoweredBy } from '@/components/PoweredBy';
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
import { getFiatRates } from '@/lib/market.functions';
import { getMyDepositWallets, createDepositIntent, checkDepositIntent, claimDepositIntent } from '@/lib/deposit.functions';
import { dateTime, money, number } from '@/lib/bixlink';
import { confirmPin, getFiatCodes, txFeedback } from '@/components/TxFeedback';
import { pickWalletSkin } from '@/lib/wallet-skin';
import { WalletFinanceMotion } from '@/components/WalletFinanceMotion';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, Copy, QrCode, X, ArrowLeftRight, Lock, Inbox, ScanLine, CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react';
import { DepositFlightScanner } from '@/components/DepositFlightScanner';

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
  const fetchWallet = useServerFn(getMyWallet); const fetchFiat = useServerFn(getFiatRates); const createIntent = useServerFn(createDepositIntent); const checkIntent = useServerFn(checkDepositIntent); const claimIntent = useServerFn(claimDepositIntent); const [claimed, setClaimed] = useState(false); const withdraw = useServerFn(requestWithdraw); const swap = useServerFn(requestSwap);
  const qc = useQueryClient(); const isAdmin = !!useMember().data?.isAdmin;
  const { data } = useQuery({ queryKey: ['my-wallet', user?.id], queryFn: () => fetchWallet(), enabled: !!user });
  const fiat = useQuery({ queryKey: ['wallet-fiat-rates'], queryFn: () => fetchFiat(), staleTime: 3_600_000 });
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [depMode, setDepMode] = useState<'copy' | 'qr'>('copy');
  const [amount, setAmount] = useState(''); const [field, setField] = useState('');
  const [notice, setNotice] = useState(''); const [walletCode, setWalletCode] = useState(''); const [success, setSuccess] = useState<{ amount: number; walletCode: string; network: string; txHash: string } | null>(null); const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<{ id: string; amount: number; network: string; address: string; walletCode: string } | null>(null); const [matched, setMatched] = useState(false);
  const [swapDirection, setSwapDirection] = useState<'USDT_TO_BIX'|'BIX_TO_USDT'>('USDT_TO_BIX'); const [swapAmount, setSwapAmount] = useState('');
  const [fiatCodes, setFiat] = useState<string[]>([]);
  useEffect(() => { const load = () => setFiat(getFiatCodes()); load(); window.addEventListener('bixlink-preferences', load); return () => window.removeEventListener('bixlink-preferences', load); }, []);
  const fiatShown = (fiat.data ?? []).filter(f => fiatCodes.includes(f.code));
  const [type, setType] = useState('all'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const txs = useMemo(() => (data?.transactions ?? []).filter(t => t.note !== 'Moved to 70/30 network bonus ledger' && (type === 'all' || t.type === type) && (!from || t.created_at.slice(0, 10) >= from) && (!to || t.created_at.slice(0, 10) <= to)), [data, type, from, to]);
  const fetchDep = useServerFn(getMyDepositWallets); const { data: myDep } = useQuery({ queryKey: ['my-deposit-wallets'], queryFn: () => fetchDep(), staleTime: 60_000 });
  const depWallets = myDep ?? cfg?.depositWallets ?? [];
  const selWallet = depWallets.find(w => w.code === walletCode) ?? depWallets[0];
  const addr = selWallet?.address ?? '';
  const swapEnabled = cfg?.swap.enabled ?? false;
  const bixPrice = Number(cfg?.bixMarket.priceUsd ?? 0.84291);
  const amt = Number(amount) || 0;
  const close = () => { setModal(null); setAmount(''); setField(''); setNotice(''); setIntent(null); setClaimed(false); };
  const poll = async (id: string) => {
    const r = await checkIntent({ data: { id } });
    if (r.status === 'credited') { setMatched(true); await new Promise(res => setTimeout(res, 1200)); setMatched(false); setSuccess({ amount: r.amount, walletCode: r.walletCode, network: r.network, txHash: r.txHash }); close(); await qc.invalidateQueries({ queryKey: ['my-wallet'] }); }
    else if (r.status === 'expired' || r.status === 'missing') { setIntent(null); setNotice('This deposit request expired. Create a new one.'); }
    else setNotice('Still waiting for the blockchain to confirm your transfer. This updates automatically.');
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
      } else { if (!(await confirmPin())) { setBusy(false); return; } await withdraw({ data: { amount: amt, address: field } }); txFeedback.success('Withdrawal submitted', `${money(amt)} is pending admin review (within 1×24 hours).`); }
      close(); await qc.invalidateQueries({ queryKey: ['my-wallet'] });
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Request failed.'); txFeedback.fail(modal === 'deposit' ? 'Deposit request failed' : 'Withdrawal failed', e); }
    setBusy(false);
  };
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setHidden(localStorage.getItem('bixlink-hide-balance') === 'on'); }, []);
  useEffect(() => { const sync = () => setHidden(localStorage.getItem('bixlink-hide-balance') === 'on'); window.addEventListener('bixlink-preferences', sync); return () => window.removeEventListener('bixlink-preferences', sync); }, []);
  const toggleHidden = () => { const next = !hidden; setHidden(next); localStorage.setItem('bixlink-hide-balance', next ? 'on' : 'off'); window.dispatchEvent(new Event('bixlink-preferences')); };
  const maskNum = (text: string) => hidden ? '••••••' : text;
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="WALLET">
      <div data-sov-color={cfg?.readiness.walletCard ? (cfg?.readiness.walletCardColor ?? 'onyx') : undefined} data-wallet-skin={cfg?.readiness.walletCard ? undefined : pickWalletSkin(cfg?.readiness.walletColors)} className={`wallet-summary wallet-vault auric-card relative overflow-hidden rounded-[20px] border p-6${cfg?.readiness.walletCard ? ' wallet-sovereign' : ''}`}>
        {cfg?.readiness.walletCard ? <><span className="sov-sheen" aria-hidden/><div className="sov-top" aria-hidden><span className="sov-chip"/><span className="sov-wave">)))</span><span className="sov-brand">BIXLINK · SOVEREIGN</span></div></> : <WalletFinanceMotion settings={cfg?.readiness}/>}
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet size={16}/> Available balance</div><div className="flex items-center gap-2"><Button type="button" size="icon" variant="ghost" className="vault-pill! size-8 rounded-full" aria-label={hidden ? 'Show balance' : 'Hide balance'} aria-pressed={hidden} title={hidden ? 'Show balance' : 'Hide balance'} onClick={toggleHidden}>{hidden ? <Eye size={16}/> : <EyeOff size={16}/>}</Button><span className="vault-pill">ASSET VAULT</span></div></div>
        <strong className="numeric mt-2 block break-all text-[28px] leading-snug font-black text-foreground md:text-[32px]">{hidden ? '••••••••' : <><AnimatedNumber value={data?.balance ?? 0}/> USDT</>}</strong>
        {fiatShown.length > 0 && <><div className="wallet-fx-grid mt-4">{fiatShown.map(item => <div key={item.code}><span>{item.label}</span><b className="numeric">{hidden ? '••••••' : `${item.code} ${number((data?.balance ?? 0) * item.rate, { maximumFractionDigits: item.code === 'IDR' ? 0 : 2 })}`}</b></div>)}</div>
        <p className="mt-3 text-[10px] text-foreground/70">Display-only USD reference conversions. Rates may be delayed.</p></>}
        <div className="mt-5 grid grid-cols-2 gap-3"><Button className="vault-btn-primary rounded-full" onClick={() => setModal('deposit')}><ArrowDownToLine/> Deposit</Button><Button variant="outline" className="vault-btn-ghost rounded-full" onClick={() => setModal('withdraw')}><ArrowUpFromLine/> Withdraw</Button></div>
        {cfg?.readiness.walletCard && <div className="sov-foot"><span className="numeric">{(user?.id.replace(/\D/g, '').padEnd(4, '0').slice(0, 4) ?? '0000')} •••• •••• 2026</span><span>MEMBER LEDGER PASS</span></div>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/pay" className="wallet-tile wallet-tile--pay"><span className="wallet-tile-top"><span className="wallet-tile-icon"><ScanLine size={18}/></span><span className={`wallet-tile-status${cfg?.bixPay.enabled ? ' is-open' : ''}`}><i/>{cfg?.bixPay.enabled ? 'OPEN' : 'SOON'}</span></span><span><b className="wallet-tile-title">BIX PAY</b><span className="wallet-tile-sub">Scan QR · pay in BIX</span></span></Link>
        <Link to="/transfer" className="wallet-tile wallet-tile--transfer"><span className="wallet-tile-top"><span className="wallet-tile-icon"><ArrowLeftRight size={18}/></span><span className={`wallet-tile-status${cfg?.usdtTransfer.enabled ? ' is-open' : ''}`}><i/>{cfg?.usdtTransfer.enabled ? 'OPEN' : 'SOON'}</span></span><span><b className="wallet-tile-title">TRANSFER</b><span className="wallet-tile-sub">{isAdmin ? 'Virtual USDT (testing)' : 'Send USDT to members'}</span></span></Link>
      </div>
      {notice && <p role="status" className="mt-4 text-sm text-chart-2">{notice}</p>}

      <section className="vault-swap auric-card mt-8 rounded-[20px] border bg-card p-6"><div className="flex items-center justify-between"><div><div className="eyebrow"><ArrowLeftRight size={14}/> INTERNAL SWAP</div><h2 className="mt-2 font-display text-2xl font-black">BIX / USDT</h2></div><div className="flex flex-col items-end gap-1"><span className="vault-pill numeric text-sm font-bold">1 BIX = ${bixPrice.toFixed(6)}</span>{!swapEnabled && <span className="inline-flex items-center gap-1 rounded-full border border-chart-3 bg-chart-3/10 px-3 py-1 text-[11px] font-bold text-chart-3"><Lock size={12}/> Coming soon</span>}</div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="min-w-0 rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">USDT balance</span><b className="numeric mt-1 block break-all text-lg sm:text-xl">{maskNum(money(data?.usdtBalance ?? 0))}</b></div><div className="min-w-0 rounded-xl border border-border p-3"><span className="text-xs text-muted-foreground">BIX balance</span><b className="numeric mt-1 block break-all text-lg text-chart-3 sm:text-xl">{maskNum(`${number(Number(data?.bixBalance ?? 0), { maximumFractionDigits: 8 })} BIX`)}</b></div></div>
        <div className="mt-4 grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"><label className="min-w-0 text-xs text-muted-foreground">YOU SEND<input className="form-input mt-2" type="number" min="0.00000001" step="any" value={swapAmount} onChange={e=>setSwapAmount(e.target.value)} placeholder="0.00"/><b className="mt-1 block text-foreground">{swapDirection === 'USDT_TO_BIX' ? 'USDT' : 'BIX'}</b></label><Button size="icon" variant="outline" className="justify-self-center rounded-full sm:mb-6" title="Reverse swap" onClick={()=>setSwapDirection(v=>v==='USDT_TO_BIX'?'BIX_TO_USDT':'USDT_TO_BIX')}><ArrowLeftRight/></Button><label className="min-w-0 text-xs text-muted-foreground">YOU RECEIVE<input className="form-input mt-2" readOnly value={(swapDirection === 'USDT_TO_BIX' ? (Number(swapAmount)||0)/bixPrice : (Number(swapAmount)||0)*bixPrice).toFixed(8)}/><b className="mt-1 block text-foreground">{swapDirection === 'USDT_TO_BIX' ? 'BIX' : 'USDT'}</b></label></div>
        <p className="mt-4 text-xs text-muted-foreground">Swaps are applied instantly in the internal ledger. No on-chain trade is executed.</p><Button disabled={busy || (swapEnabled && !(Number(swapAmount)>0))} className="mt-5 w-full rounded-full bg-primary" onClick={async()=>{if(!swapEnabled){setNotice('Coming soon — BIX/USDT swap is not open yet.');return;}if(!(await confirmPin()))return;setBusy(true);try{await swap({data:{direction:swapDirection,amount:Number(swapAmount)}});txFeedback.success('Swap completed',`${swapAmount} ${swapDirection==='USDT_TO_BIX'?'USDT → BIX':'BIX → USDT'}`);setSwapAmount('');setNotice('Swap completed.');await qc.invalidateQueries({queryKey:['my-wallet']});}catch(e){setNotice(e instanceof Error?e.message:'Swap failed.');txFeedback.fail('Swap failed',e);}setBusy(false);}}>{swapEnabled?'Request swap':<><Lock size={16}/> Swap · Coming soon</>}</Button>
      </section>

      <h2 className="mt-10 font-display text-xl font-black">Swap history</h2><div className="mt-4 space-y-2">{(data?.swaps ?? []).length ? data?.swaps.map(s=><div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm"><div><b>{s.direction === 'USDT_TO_BIX' ? 'USDT → BIX' : 'BIX → USDT'}</b><div className="text-xs text-muted-foreground">{dateTime(s.created_at)}</div></div><div className="text-right"><div>{number(Number(s.amount_in), { maximumFractionDigits: 8 })} → <b className="text-chart-3">{number(Number(s.amount_out), { maximumFractionDigits: 8 })}</b></div><span className={`text-xs capitalize ${STATUS[s.status]}`}>{s.status}</span></div></div>) : <EmptyState text="No swap requests yet."/>}</div>

      <h2 className="mt-10 font-display text-xl font-black">Transaction history</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {['all', 'deposit', 'withdraw', 'reward'].map(t => <Button key={t} size="sm" variant={type === t ? 'default' : 'outline'} className="rounded-full capitalize" onClick={() => setType(t)}>{t === 'reward' ? 'Staking reward' : t}</Button>)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><label className="min-w-0">From<input type="date" className="form-input mt-1 w-full" value={from} onChange={e => setFrom(e.target.value)}/></label><label className="min-w-0">To<input type="date" className="form-input mt-1 w-full" value={to} onChange={e => setTo(e.target.value)}/></label>{(from || to) && <Button size="sm" variant="ghost" className="col-span-2 justify-self-end" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}</div>
      <div className="mt-4 space-y-2">{txs.length ? txs.map(t => { const I = ICON[t.type as keyof typeof ICON] ?? Gift; return <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-3"><I size={18} className="shrink-0 text-primary"/><div className="min-w-0"><b className="capitalize">{t.type === 'reward' ? 'Staking reward' : t.type}</b><div className="text-xs text-muted-foreground">{dateTime(t.created_at)}</div>{t.wallet_code && <div className="text-[11px] font-bold text-chart-2">→ {t.wallet_code} · {t.network}</div>}<div className="truncate text-[11px] text-muted-foreground">{t.tx_hash ?? t.address ?? t.note}</div></div></div>
        <div className="shrink-0 text-right"><div className={t.type === 'withdraw' ? 'text-destructive' : 'text-chart-2'}>{t.type === 'withdraw' ? '-' : '+'}{money(Number(t.amount_usd))}</div>{Number(t.fee_usd) > 0 && <div className="text-[11px] text-muted-foreground">fee {money(Number(t.fee_usd))} · receive {money(Number(t.net_usd))}</div>}<div className={`text-xs capitalize ${STATUS[t.status]}`}><span className="status-dot"/>{t.status}</div></div></div>; }) : <EmptyState text="No transactions for this filter." action="Make a deposit" onAction={() => setModal('deposit')}/>}</div>

      {modal && <div className="modal-backdrop" onClick={close}><div role="dialog" aria-modal="true" className={`modal-panel${modal === 'deposit' ? ' deposit-panel' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black capitalize">{modal}</h3><Button variant="ghost" size="icon" onClick={close}><X/></Button></div>
        {modal === 'deposit' ? <>
          {!depWallets.length ? <p className="mt-4 text-sm text-destructive">Deposit wallets are not set yet. Please check back later.</p> : <>
          <p className="mt-3 text-xs text-muted-foreground">1. Choose coin & network (USDT or USDC)</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{depWallets.map(w => <button key={w.code} type="button" onClick={() => setWalletCode(w.code)} data-active={selWallet?.code === w.code} className="dep-chip"><b>{w.code}</b><span>{w.asset ?? 'USDT'} · {w.network}</span></button>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Button variant={depMode === 'copy' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDepMode('copy')}><Copy/> Copy wallet</Button><Button variant={depMode === 'qr' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDepMode('qr')}><QrCode/> Scan QR</Button></div>
          {depMode === 'copy' ? <div className="mt-3 rounded-2xl border border-border p-3"><div className="text-xs text-muted-foreground">{selWallet?.code} · {selWallet?.asset ?? 'USDT'} {selWallet?.network}</div><div className="mt-1 break-all font-mono text-sm text-chart-3">{addr}</div><Button size="sm" className="mt-3 rounded-full" onClick={async () => { await navigator.clipboard.writeText(addr); setNotice('Wallet address copied.'); }}><Copy/> Copy address</Button></div>
            : <div className="mt-3 flex flex-col items-center gap-2"><div className="rounded-2xl bg-foreground p-3"><QRCodeSVG value={addr} size={180}/></div><div className="text-xs text-muted-foreground">{selWallet?.code} · {selWallet?.asset ?? 'USDT'} {selWallet?.network}</div></div>}
          {!intent ? <><p className="mt-4 text-xs text-muted-foreground">2. Enter how much {selWallet?.asset ?? 'USDT'} you want to deposit (credited 1:1 as USD).</p>
          <input className="form-input mt-2" type="number" min="1" step="1" placeholder="Amount USDT (e.g. 50)" value={amount} onChange={e => setAmount(e.target.value)}/></>
          : <div className="mt-4 rounded-2xl border border-chart-2 bg-chart-2/10 p-3 text-center"><div className="text-xs text-muted-foreground">Send EXACTLY this amount of {selWallet?.asset ?? 'USDT'} {intent.network}</div><div className="numeric mt-1 text-2xl font-black text-chart-2">{intent.amount.toFixed(4)}</div><Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={async () => { await navigator.clipboard.writeText(intent.amount.toFixed(4)); setNotice('Exact amount copied.'); }}><Copy/> Copy amount</Button><DepositFlightScanner done={matched}/><p className="mt-2 text-[11px] text-muted-foreground">The unique decimals identify your deposit. Balance is credited automatically once the blockchain confirms. Valid for 2 hours.</p>{claimed ? <p className="mt-3 rounded-xl border border-chart-3/50 bg-chart-3/10 p-2 text-xs text-chart-3">Transfer reported. You can close this page — we keep checking the blockchain every 5 minutes for 24 hours, and the owner can approve it manually.</p> : <Button size="sm" className="mt-3 w-full rounded-full bg-chart-2 text-background" disabled={busy} onClick={async () => { setBusy(true); try { await claimIntent({ data: { id: intent.id } }); setClaimed(true); setNotice(''); txFeedback.success('Transfer reported', 'We will credit your balance once the blockchain confirms.'); await qc.invalidateQueries({ queryKey: ['my-wallet'] }); } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not record your transfer.'); txFeedback.fail('Could not record your transfer', e); } setBusy(false); }}>I have transferred</Button>}</div>}
          {notice && <p className={`mt-2 text-xs ${intent ? 'text-chart-3' : 'text-destructive'}`}>{notice}</p>}
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
        <p className="tx-hint">{modal === 'deposit' ? 'Send the exact amount on-chain; one credit per transaction ID after the matcher confirms it.' : 'Creates a withdrawal request for review; USDT is not sent until it is approved.'}</p>
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
      <nav aria-label="Wallet quick actions" className="wallet-quick-actions"><Button variant="ghost" size="sm" onClick={() => setModal('deposit')}><ArrowDownToLine size={16}/> Deposit</Button><span className="h-5 w-px bg-border"/><Button variant="ghost" size="sm" onClick={() => setModal('withdraw')}><ArrowUpFromLine size={16}/> Withdraw</Button></nav>
    </MemberGate>
  <PoweredBy slim/><div className="h-24 md:h-0" aria-hidden/></main></BixShell>;
}
