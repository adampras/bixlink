import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getSovereignVirtual, sendSovereignVirtual } from '@/lib/sovereign-account.functions';
import { useQuery } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { confirmPin, txFeedback } from '@/components/TxFeedback';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { dateTime, money } from '@/lib/bixlink';
import { ArrowDownLeft, ArrowUpRight, Lock, Send } from 'lucide-react';

export const Route = createFileRoute('/transfer')({ head: () => ({ meta: [{ title: 'Transfer — BIXLINK' }, { name: 'description', content: 'Send virtual test USDT to other BIXLINK members.' }, { property: 'og:title', content: 'Transfer — BIXLINK' }, { property: 'og:description', content: 'Virtual USDT member transfers for testing.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: TransferPage });

function TransferPage() {
  const { user, ready, data: mine } = useMember(); const { data: cfg } = usePublicConfig();
  const fetchVirtual = useServerFn(getSovereignVirtual); const sendVirtual = useServerFn(sendSovereignVirtual);
  const [code, setCode] = useState(''); const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['vusdt-transfers', user?.id], enabled: !!user, queryFn: () => fetchVirtual() });
  const open = !!cfg?.usdtTransfer.enabled && q.data?.canSend === true;
  const myCode = mine?.referral?.code;
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!open || busy || !(await confirmPin())) return; setBusy(true); setMsg('');
    try {
      await sendVirtual({ data: { code: code.trim().toUpperCase(), amount: Number(amount), note } });
      txFeedback.success('Transfer sent', `${money(Number(amount))} vUSDT to ${code.toUpperCase()}`);
      setMsg(`Sent ${money(Number(amount))} vUSDT to ${code.toUpperCase()}.`); setAmount(''); setNote(''); await q.refetch();
    } catch (e) { const message = e instanceof Error ? e.message : 'Transfer failed'; txFeedback.fail('Transfer failed', message); setMsg(message); }
    finally { setBusy(false); }
  }
  return <BixShell><main className="mx-auto max-w-3xl px-5 py-10 md:px-8"><MemberGate ready={ready} signedIn={!!user} title="TRANSFER">
    {mine?.isAdmin && <div className="eyebrow">VIRTUAL USDT · TESTING</div>}<h1 className="section-title">TRANSFER <span>USDT</span></h1>
    <div className="terminal-balance mt-6"><span className="text-xs text-muted-foreground">Virtual USDT balance</span><strong className="numeric mt-2 block text-4xl font-black text-foreground">{money(q.data?.balance ?? 0)}</strong><p className="mt-2 text-xs text-muted-foreground">Test balance only — separate from your real wallet and cannot be withdrawn. Your code: <b className="numeric text-chart-3">{myCode ?? '—'}</b></p></div>
    {!open ? <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-chart-3 bg-chart-3/10 p-5 text-sm font-bold text-chart-3"><Lock size={18}/> {q.isPending ? 'Checking transfer access…' : !q.data?.canSend ? 'Only Owner 1 can transfer virtual USDT.' : 'Transfers are currently closed.'}</div> :
    <form onSubmit={send} className="register-panel mt-6 space-y-4">
      <label className="block text-xs font-bold text-muted-foreground">RECIPIENT CODE<input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="form-input numeric mt-2 uppercase" placeholder="BIX-123456"/></label>
      <label className="block text-xs font-bold text-muted-foreground">AMOUNT (USDT)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-input mt-2"/></label>
      <label className="block text-xs font-bold text-muted-foreground">NOTE (OPTIONAL)<input maxLength={120} value={note} onChange={e => setNote(e.target.value)} className="form-input mt-2"/></label>
      <Button disabled={busy} className="h-12 w-full rounded-full bg-chart-3 font-bold text-background">{busy ? 'Sending…' : 'Send transfer'} <Send/></Button>
    </form>}
    {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}
    <h2 className="mt-10 font-display text-2xl font-black">History</h2>
    <div className="mt-4 space-y-2">{(q.data?.list ?? []).map(t => { const out = t.sender_id === user?.id; return <div key={t.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-xs"><div className="flex items-center gap-3">{out ? <ArrowUpRight className="text-destructive"/> : <ArrowDownLeft className="text-chart-2"/>}<div><b className="text-sm">{out ? `To ${t.recipient_code}` : `From ${t.sender_code}`}</b><div className="text-muted-foreground">{dateTime(t.created_at)}{t.note ? ` · ${t.note}` : ''}</div></div></div><b className={`numeric text-sm ${out ? 'text-destructive' : 'text-chart-2'}`}>{out ? '-' : '+'}{money(Number(t.amount_usd))}</b></div>; })}{!q.data?.list?.length && <p className="text-sm text-muted-foreground">No transfers yet.</p>}</div>
    <Link to="/wallet" className="mt-8 block text-center text-xs text-muted-foreground">← Back to WALLET</Link>
  </MemberGate></main></BixShell>;
}
