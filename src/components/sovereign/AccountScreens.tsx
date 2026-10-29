import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, ChevronLeft, ScanLine, ShieldCheck, LogOut, Wallet, Languages, Network, Bell, Star } from 'lucide-react';
import { Button as BaseButton, type ButtonProps } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { signInWithIdentifier } from '@/lib/login.functions';
import { lookupBixPay, sendBixPay, getBixPay, getMyWallet } from '@/lib/bixlink.functions';
import { getSovereignVirtual, sendSovereignVirtual } from '@/lib/sovereign-account.functions';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { hasPin, checkPin } from '@/components/TxFeedback';

function Button(props: ButtonProps) { return <BaseButton variant="wallet" size="wallet" {...props} />; }
function Header({ title, back }: { title: string; back: () => void }) { return <header className="relative mb-6 flex min-h-11 items-center justify-center"><Button className="sw-round absolute left-0" aria-label="Back" onClick={back}><ChevronLeft /></Button><h1 className="font-display text-xl">{title}</h1></header>; }
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Unable to complete this request. Please retry.';

export function AccountLogin({ back, done }: { back: () => void; done: () => void }) {
  const login = useServerFn(signInWithIdentifier);
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState(''); const [password, setPassword] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [forgot, setForgot] = useState(false);
  return <><Header title={forgot ? 'Reset password' : 'Sign in'} back={back} /><div className="flex justify-center py-5"><Wallet className="sw-gold-text" size={54} /></div><form className="space-y-5" onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try {
      if (forgot) { const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error; setMessage('Check your inbox for a password reset link.'); }
      else {
        const r = await login({ data: { identifier: identifier.trim(), password } }); if (!r.ok) throw new Error(r.error);
        const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token }); if (error) throw error;
        setPassword(''); await qc.invalidateQueries(); done();
      }
    } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
  }}><label className="block text-sm">{forgot ? 'Email' : 'Email / BIX ID / Username'}<input required type={forgot ? 'email' : 'text'} autoComplete="username" className="sw-field mt-2 w-full" value={identifier} onChange={e => setIdentifier(e.target.value)} /></label>
  {!forgot && <label className="block text-sm">Password<div className="sw-field mt-2 flex gap-2"><input required type={show ? 'text' : 'password'} autoComplete="current-password" className="min-w-0 flex-1 bg-transparent outline-none" value={password} onChange={e => setPassword(e.target.value)} /><Button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</Button></div></label>}
  {message && <p role="status" className="sw-note">{message}</p>}<Button disabled={busy} className="sw-gold-btn w-full justify-center">{busy ? 'Please wait…' : forgot ? 'Send reset link' : 'Sign in'}</Button><Button type="button" className="sw-muted w-full" onClick={() => { setForgot(!forgot); setMessage(''); }}>{forgot ? 'Back to sign in' : 'Forgot password?'}</Button></form><p className="sw-note">Your existing BIXLINK account. Web3 connection does not sign you into this account.</p></>;
}

export function AccountTransfer({ initialCode, initialToken, back, scan, done }: { initialCode: string; initialToken: string; back: () => void; scan: () => void; done: () => void }) {
  const member = useMember(); const cfg = usePublicConfig(); const qc = useQueryClient();
  const walletFn = useServerFn(getMyWallet); const lookup = useServerFn(lookupBixPay); const sendBix = useServerFn(sendBixPay);
  const virtualFn = useServerFn(getSovereignVirtual); const sendVirtual = useServerFn(sendSovereignVirtual);
  const [token, setToken] = useState(initialToken === 'USDT' ? 'vUSDT' : 'BIX');
  const [code, setCode] = useState(initialCode); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [pin, setPin] = useState('');
  const wallet = useQuery({ queryKey: ['my-wallet', member.user?.id], queryFn: () => walletFn(), enabled: !!member.user });
  const virtual = useQuery({ queryKey: ['sovereign-virtual', member.user?.id], queryFn: () => virtualFn(), enabled: !!member.user && token === 'vUSDT' });
  const enabled = token === 'BIX' ? cfg.data?.bixPay.enabled : cfg.data?.usdtTransfer.enabled;
  const balance = token === 'BIX' ? wallet.data?.bixBalance : virtual.data?.balance;
  const valid = /^BIX-\d{6}$/i.test(code) && Number.isFinite(Number(amount)) && Number(amount) > 0 && balance !== undefined && Number(amount) <= balance;
  return <><Header title="Transfer · Account" back={back} /><div className="sw-mode mb-5">{['BIX', 'vUSDT'].map(t => <Button key={t} aria-pressed={token === t} onClick={() => { setToken(t); setReview(false); setAmount(''); setMessage(''); }}>{t === 'vUSDT' ? 'Virtual USDT' : t}</Button>)}</div>
  {token === 'vUSDT' && <p className="sw-note">Virtual test USDT only. Separate from your account USDT and on-chain USDT; it cannot be withdrawn.</p>}
  <p className="sw-muted mb-4">Available balance: <b>{balance === undefined ? '—' : balance.toLocaleString()} {token}</b></p>
  {!enabled && <p role="status" className="sw-note">{cfg.isPending ? 'Checking availability…' : 'Coming soon — transfers are currently closed by the owner.'}</p>}
  <form className="space-y-5" onSubmit={async e => {
    e.preventDefault(); if (busy || !valid || !enabled) return; setBusy(true); setMessage('');
    try { if (token === 'BIX') { const r = await lookup({ data: { code } }); if (!r.valid) throw new Error('Recipient not found, or this is your own BIX ID.'); }
      if (code.toUpperCase() === member.data?.referral?.code) throw new Error('You cannot transfer to your own BIX ID.'); setReview(true);
    } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
  }}>
  <label className="block text-sm">Recipient BIX ID<div className="sw-field mt-2 flex gap-2"><input required placeholder="BIX-123456" className="min-w-0 flex-1 bg-transparent outline-none" value={code} onChange={e => { setCode(e.target.value.trim().toUpperCase()); setReview(false); }} /><Button type="button" aria-label="Scan QR" onClick={scan}><ScanLine /></Button></div></label>
  <label className="block text-sm">Amount<input required inputMode="decimal" className="sw-field mt-2 w-full" value={amount} onChange={e => { setAmount(e.target.value); setReview(false); }} /></label>
  <label className="block text-sm">Note (optional)<input maxLength={120} className="sw-field mt-2 w-full" value={note} onChange={e => { setNote(e.target.value); setReview(false); }} /></label>
  {!review && <Button disabled={!valid || !enabled || busy} className="sw-gold-btn w-full justify-center">{busy ? 'Please wait…' : 'Review payment'}</Button>}</form>
  {review && <section className="mt-6 border-t border-border pt-5"><ShieldCheck className="sw-gold-text" /><h2 className="mt-3 text-lg">Confirm payment</h2><p className="my-3 break-all">{amount} {token} → {code}</p>{hasPin() && <label className="block text-sm">Transaction PIN<input type="password" inputMode="numeric" maxLength={6} className="sw-field mt-2 w-full" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></label>}<div className="mt-4 grid grid-cols-2 gap-3"><Button disabled={busy} className="sw-action" onClick={() => setReview(false)}>Cancel</Button><Button disabled={busy} className="sw-gold-btn justify-center" onClick={async () => {
    if (busy) return; setBusy(true); setMessage('');
    try { if (hasPin() && !(await checkPin(pin))) throw new Error('Wrong PIN. Try again.');
      if (token === 'BIX') await sendBix({ data: { code, amount: Number(amount), note } }); else await sendVirtual({ data: { code, amount: Number(amount), note } });
      await Promise.all([qc.invalidateQueries({ queryKey: ['my-wallet'] }), qc.invalidateQueries({ queryKey: ['bix-pay'] }), qc.invalidateQueries({ queryKey: ['sovereign-virtual'] })]); done();
    } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); }
  }}>{busy ? 'Sending…' : 'Confirm'}</Button></div></section>}{message && <p role="status" className="sw-note">{message}</p>}<p className="sw-note">Internal transfers only. BIX PAY owner controls and existing limits apply; no blockchain tokens are sent.</p></>;
}

export function AccountHistory({ back, alerts = false }: { back: () => void; alerts?: boolean }) {
  const member = useMember(); const fetchPay = useServerFn(getBixPay); const fetchWallet = useServerFn(getMyWallet); const virtualFn = useServerFn(getSovereignVirtual);
  const pay = useQuery({ queryKey: ['bix-pay', member.user?.id], queryFn: () => fetchPay(), enabled: !!member.user, refetchInterval: 30000 });
  const wallet = useQuery({ queryKey: ['my-wallet', member.user?.id], queryFn: () => fetchWallet(), enabled: !!member.user });
  const virtual = useQuery({ queryKey: ['sovereign-virtual', member.user?.id], queryFn: () => virtualFn(), enabled: !!member.user });
  const [filter, setFilter] = useState('All');
  const rows = [
    ...(pay.data?.transfers ?? []).map(t => ({ id: t.id, date: t.created_at, title: `${t.outgoing ? 'To' : 'From'} ${t.outgoing ? t.recipient_code : t.sender_code}`, amount: `${t.outgoing ? '−' : '+'}${Number(t.amount_bix).toLocaleString()} BIX`, status: t.status, group: 'BIX' })),
    ...(wallet.data?.transactions ?? []).map(t => ({ id: t.id, date: t.created_at, title: t.type, amount: `${Number(t.amount_usd).toLocaleString()} USDT`, status: t.status, group: 'USDT' })),
    ...(virtual.data?.list ?? []).map(t => ({ id: t.id, date: t.created_at, title: `${t.sender_id === member.user?.id ? 'To' : 'From'} ${t.sender_id === member.user?.id ? t.recipient_code : t.sender_code}`, amount: `${Number(t.amount_usd).toLocaleString()} vUSDT`, status: 'Virtual transfer', group: 'vUSDT' })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return <><Header title={alerts ? 'Notifications' : 'Transaction history'} back={back} /><div className="mb-5 flex flex-wrap gap-2">{['All', 'BIX', 'USDT', 'vUSDT'].map(f => <Button key={f} className="sw-pill" aria-pressed={f === filter} onClick={() => setFilter(f)}>{f}</Button>)}</div>
    {!member.user ? <p className="sw-note">Sign in to view your account activity.</p> : pay.isPending || wallet.isPending ? <p role="status" className="sw-note">Loading activity…</p> : <>
    {(pay.isError || wallet.isError || virtual.isError) && <p role="alert" className="sw-note">Some activity could not be loaded.<Button className="sw-gold-text ml-2" onClick={() => { void pay.refetch(); void wallet.refetch(); void virtual.refetch(); }}>Retry</Button></p>}
    {rows.filter(r => filter === 'All' || r.group === filter).map(r => <article key={r.id} className="border-b border-border py-4"><div className="flex flex-wrap justify-between gap-2"><b>{r.title}</b><b className="sw-gold-text">{r.amount}</b></div><small className="sw-muted block mt-2">{new Date(r.date).toLocaleString()} · {r.status}</small></article>)}
    {!rows.filter(r => filter === 'All' || r.group === filter).length && <p className="sw-note">No transactions yet.</p>}</>}
    {alerts && <p className="sw-note">Recorded account activity. Push delivery is not enabled; on-chain alerts remain in your connected wallet.</p>}</>;
}

export function WalletLanguage({ back }: { back: () => void }) { const { language, setLanguage, t } = useI18n(); return <><Header title={t('language')} back={back} /><div className="space-y-2">{LANGUAGES.map(l => <Button key={l.code} className="sw-list-item w-full" aria-pressed={language === l.code} onClick={() => setLanguage(l.code)}><span className="flex-1 text-left">{l.label}</span>{language === l.code && <ShieldCheck className="sw-gold-text" />}</Button>)}</div></>; }

export function AccountProfile({ addr, go, disconnect }: { addr: string; go: (s: string) => void; disconnect: () => void }) {
  const member = useMember(); const qc = useQueryClient(); const { t } = useI18n(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const Item = ({ title, icon, screen }: { title: string; icon: React.ReactNode; screen: string }) => <Button className="sw-list-item w-full" onClick={() => go(screen)}>{icon}<span className="flex-1 text-left">{title}</span></Button>;
  return <><h1 className="text-center font-display text-2xl">{t('profile')}</h1><section className="py-7 text-center"><Wallet size={48} className="sw-gold-text mx-auto" /><b className="block mt-4">{member.data?.profile?.full_name || 'BIXLINK Wallet'}</b><p className="sw-muted mt-2 break-all">{member.data?.referral?.code ?? 'Not signed in'}</p>{member.user && <p className="sw-muted text-sm mt-2 break-all">{member.user.email}</p>}{addr && <p className="sw-muted mt-2 text-xs break-all">BSC: {addr}</p>}</section>
  {!member.user && <Button className="sw-gold-btn w-full justify-center mb-5" onClick={() => go('login')}>{t('signIn')}</Button>}
  <div className="divide-y divide-border"><Item title="Transaction history" icon={<Copy />} screen="history" /><Item title="Security & verification" icon={<ShieldCheck />} screen="security" /><Item title={t('language')} icon={<Languages />} screen="language" /><Item title="Address book" icon={<Star />} screen="book" /><Item title="BNB Chain node" icon={<Network />} screen="node" /><Item title={t('notifications')} icon={<Bell />} screen="notify" /></div>
  {addr && <Button className="sw-action mt-6 w-full" onClick={disconnect}>Disconnect Web3</Button>}
  {member.user && <Button disabled={busy} className="sw-action mt-4 w-full !flex-row" onClick={async () => { if (busy) return; setBusy(true); try { await qc.cancelQueries(); qc.clear(); const { error } = await supabase.auth.signOut(); if (error) throw error; window.history.replaceState(null, '', '/sovereign-wallet'); go('login'); } catch (e) { setMessage(errorText(e)); } finally { setBusy(false); } }}><LogOut />{busy ? 'Please wait…' : 'Sign out'}</Button>}
  {message && <p role="status" className="sw-note">{message}</p>}<p className="sw-note">Account sign-out also signs out the main app on this browser. Disconnecting Web3 does not revoke wallet permissions.</p></>;
}
