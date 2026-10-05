import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { getMyWallet, requestDeposit, requestWithdraw } from '@/lib/bixlink.functions';
import { money } from '@/lib/bixlink';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Gift, Copy, QrCode, X } from 'lucide-react';

export const Route = createFileRoute('/wallet')({ head: () => ({ meta: [{ title: 'Wallet — BIXLINK' }, { name: 'description', content: 'BIXLINK wallet: deposit, withdraw and staking reward history.' }, { property: 'og:title', content: 'Wallet — BIXLINK' }, { property: 'og:description', content: 'Deposit, withdraw and track BIXLINK rewards.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: WalletPage });

const fee = (a: number) => Math.round((1 + a * 0.005) * 100) / 100;
const ICON = { deposit: ArrowDownToLine, withdraw: ArrowUpFromLine, reward: Gift } as const;
const STATUS: Record<string, string> = { pending: 'text-chart-3', approved: 'text-chart-2', rejected: 'text-destructive' };

function WalletPage() {
  const { user, ready } = useMember();
  const { data: cfg } = usePublicConfig();
  const fetchWallet = useServerFn(getMyWallet); const deposit = useServerFn(requestDeposit); const withdraw = useServerFn(requestWithdraw);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['my-wallet', user?.id], queryFn: () => fetchWallet(), enabled: !!user });
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [depMode, setDepMode] = useState<'copy' | 'qr'>('copy');
  const [amount, setAmount] = useState(''); const [field, setField] = useState('');
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [type, setType] = useState('all'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const txs = useMemo(() => (data?.transactions ?? []).filter(t => (type === 'all' || t.type === type) && (!from || t.created_at.slice(0, 10) >= from) && (!to || t.created_at.slice(0, 10) <= to)), [data, type, from, to]);
  const addr = cfg?.wallet.address ?? '';
  const amt = Number(amount) || 0;
  const close = () => { setModal(null); setAmount(''); setField(''); };
  const submit = async () => {
    setBusy(true);
    try {
      if (modal === 'deposit') await deposit({ data: { amount: amt, txHash: field } });
      else await withdraw({ data: { amount: amt, address: field } });
      setNotice(modal === 'deposit' ? 'Deposit submitted — waiting for admin confirmation.' : 'Withdrawal submitted — waiting for admin approval.');
      close(); await qc.invalidateQueries({ queryKey: ['my-wallet'] });
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Request failed.'); }
    setBusy(false);
  };
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="WALLET">
      <div className="eyebrow">MY WALLET</div><h1 className="section-title">BIXLINK <span>WALLET</span></h1>
      <div className="mt-8 rounded-[20px] border border-chart-3 bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet size={16}/> Available balance</div>
        <strong className="mt-2 block text-4xl text-chart-3">{money(data?.balance ?? 0)}</strong>
        <p className="mt-1 text-xs text-muted-foreground">Counts admin-approved deposits and rewards, minus withdrawals.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button className="rounded-full bg-chart-2 text-background" onClick={() => setModal('deposit')}><ArrowDownToLine/> Deposit</Button><Button variant="outline" className="rounded-full" onClick={() => setModal('withdraw')}><ArrowUpFromLine/> Withdraw</Button></div>
      </div>
      {notice && <p role="status" className="mt-4 text-sm text-chart-2">{notice}</p>}

      <h2 className="mt-10 font-display text-xl font-black">Transaction history</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {['all', 'deposit', 'withdraw', 'reward'].map(t => <Button key={t} size="sm" variant={type === t ? 'default' : 'outline'} className="rounded-full capitalize" onClick={() => setType(t)}>{t === 'reward' ? 'Staking reward' : t}</Button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><label>From <input type="date" className="form-input ml-1 inline-block w-auto" value={from} onChange={e => setFrom(e.target.value)}/></label><label>To <input type="date" className="form-input ml-1 inline-block w-auto" value={to} onChange={e => setTo(e.target.value)}/></label>{(from || to) && <Button size="sm" variant="ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>}</div>
      <div className="mt-4 space-y-2">{txs.length ? txs.map(t => { const I = ICON[t.type as keyof typeof ICON] ?? Gift; return <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-3"><I size={18} className="shrink-0 text-primary"/><div className="min-w-0"><b className="capitalize">{t.type === 'reward' ? 'Staking reward' : t.type}</b><div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div><div className="truncate text-[11px] text-muted-foreground">{t.tx_hash ?? t.address ?? t.note}</div></div></div>
        <div className="shrink-0 text-right"><div className={t.type === 'withdraw' ? 'text-destructive' : 'text-chart-2'}>{t.type === 'withdraw' ? '-' : '+'}{money(Number(t.amount_usd))}</div>{Number(t.fee_usd) > 0 && <div className="text-[11px] text-muted-foreground">fee {money(Number(t.fee_usd))} · receive {money(Number(t.net_usd))}</div>}<div className={`text-xs capitalize ${STATUS[t.status]}`}>{t.status}</div></div></div>; }) : <p className="text-sm text-muted-foreground">No transactions for this filter.</p>}</div>

      {modal && <div className="modal-backdrop" onClick={close}><div role="dialog" aria-modal="true" className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between"><h3 className="font-display text-2xl font-black capitalize">{modal}</h3><Button variant="ghost" size="icon" onClick={close}><X/></Button></div>
        {modal === 'deposit' ? <>
          <div className="mt-4 grid grid-cols-2 gap-2"><Button variant={depMode === 'copy' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDepMode('copy')}><Copy/> Copy wallet</Button><Button variant={depMode === 'qr' ? 'default' : 'outline'} className="rounded-full" onClick={() => setDepMode('qr')}><QrCode/> Scan QR</Button></div>
          {!addr ? <p className="mt-4 text-sm text-destructive">Deposit wallet is not set yet. Please check back later.</p> : depMode === 'copy' ? <div className="mt-4 rounded-2xl border border-border p-3"><div className="text-xs text-muted-foreground">{cfg?.wallet.network}</div><div className="mt-1 break-all font-mono text-sm text-chart-3">{addr}</div><Button size="sm" className="mt-3 rounded-full" onClick={async () => { await navigator.clipboard.writeText(addr); setNotice('Wallet address copied.'); }}><Copy/> Copy address</Button></div>
            : <div className="mt-4 flex flex-col items-center gap-2"><div className="rounded-2xl bg-foreground p-3"><QRCodeSVG value={addr} size={180}/></div><div className="text-xs text-muted-foreground">{cfg?.wallet.network}</div></div>}
          <p className="mt-4 text-xs text-muted-foreground">Send only {cfg?.wallet.network} to this address, then enter the amount and transaction hash below.</p>
          <input className="form-input mt-3" type="number" min="1" placeholder="Amount USD" value={amount} onChange={e => setAmount(e.target.value)}/>
          <input className="form-input mt-2" placeholder="Transaction hash (TxID)" value={field} onChange={e => setField(e.target.value)}/>
        </> : <>
          <p className="mt-3 text-sm">Available: <b className="text-chart-3">{money(data?.balance ?? 0)}</b></p>
          <input className="form-input mt-3" type="number" min="5" placeholder="Amount USD (min $5)" value={amount} onChange={e => setAmount(e.target.value)}/>
          <input className="form-input mt-2" placeholder={`Your ${cfg?.wallet.network ?? 'USDT'} address`} value={field} onChange={e => setField(e.target.value)}/>
          <div className="mt-4 space-y-1 rounded-2xl border border-border p-3 text-xs"><div className="flex justify-between"><span>Admin fee</span><span>$1.00</span></div><div className="flex justify-between"><span>Gas fee (0.5%)</span><span>{money(Math.round(amt * 0.5) / 100)}</span></div><div className="flex justify-between border-t border-border pt-1 font-bold"><span>You receive</span><span className="text-chart-2">{money(Math.max(0, amt - (amt ? fee(amt) : 0)))}</span></div></div>
        </>}
        <Button disabled={busy || !amt || !field || (modal === 'deposit' && !addr)} className="mt-5 w-full rounded-full bg-chart-3 text-background" onClick={submit}>Submit {modal}</Button>
      </div></div>}
    </MemberGate>
  </main></BixShell>;
}
