import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { getBixPay, lookupBixPay, sendBixPay } from '@/lib/bixlink.functions';
import { ScanLine, QrCode, Lock, ArrowUpRight, ArrowDownLeft, Copy, ShieldCheck, ArrowLeft, X, ImageUp } from 'lucide-react';
import { dateTime, number } from '@/lib/bixlink';
import { confirmPin, txFeedback } from '@/components/TxFeedback';

export const Route = createFileRoute('/pay')({
  head: () => ({ meta: [{ title: 'BIX PAY — BIXLINK' }, { name: 'description', content: 'Scan a QR code to pay other BIXLINK members in BIX.' }, { property: 'og:title', content: 'BIX PAY — BIXLINK' }, { property: 'og:description', content: 'Member-to-member BIX payments by QR scan.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: PayPage,
});

type Payload = { code: string; amount?: number | undefined; note?: string | undefined };
const parse = (raw: string): Payload | null => {
  const text = raw.trim();
  if (/^BIX-\d{6}$/i.test(text)) return { code: text.toUpperCase() };
  try {
    const url = new URL(text);
    const code = url.searchParams.get('to') ?? '';
    if (!/^BIX-\d{6}$/i.test(code)) return null;
    const amount = Number(url.searchParams.get('amount')) || undefined;
    return { code: code.toUpperCase(), amount, note: url.searchParams.get('note') ?? undefined };
  } catch { return null; }
};

function Scanner({ onResult, onClose }: { onResult: (v: string) => void; onClose: () => void }) {
  const ref = useRef<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stopped = false;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode('bix-scanner'); ref.current = s;
      s.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w: number, h: number) => { const m = Math.floor(Math.min(w, h) * 0.7); return { width: m, height: m }; } }, text => { s.stop().catch(() => {}); ref.current = null; navigator.vibrate?.(30); onResult(text); }, () => {})
        .catch(() => setErr('Camera unavailable. Choose a QR image from your gallery or enter the code manually.'));
    });
    return () => { stopped = true; ref.current?.stop().catch(() => {}); };
  }, [onResult]);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  return <div className="qr-full" role="dialog" aria-label="Scan BIX PAY QR">
    <div id="bix-scanner" className="qr-full__cam"/>
    <div className="qr-full__mask" aria-hidden><div className="qr-full__frame"><i/><i/><i/><i/><span className="qr-full__laser"/></div></div>
    <div className="qr-full__top"><b className="font-display">Scan BIX PAY QR</b><button type="button" onClick={onClose} aria-label="Close" className="qr-full__x"><X size={20}/></button></div>
    <div className="qr-full__bottom">
      <p className="qr-full__hint">{err || 'Point the camera at a member\'s BIX PAY QR'}</p>
      <label className="qr-full__gallery"><ImageUp size={16}/> Choose QR from gallery
        <input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setErr(''); try { await ref.current?.stop().catch(() => {}); ref.current = null; const { Html5Qrcode } = await import('html5-qrcode'); const reader = new Html5Qrcode('bix-file-reader'); const text = await reader.scanFile(file, false); reader.clear(); onResult(text); } catch { setErr('No QR code found in that image. Try a clearer screenshot.'); } e.target.value = ''; }}/>
      </label>
    </div>
    <div id="bix-file-reader" className="hidden"/>
  </div>;
}

function PayPage() {
  const { user, ready } = useMember();
  const { data: cfg } = usePublicConfig();
  const enabled = (cfg?.bixPay.enabled ?? false) || cfg?.isAdmin === true;
  const fetchPay = useServerFn(getBixPay); const lookup = useServerFn(lookupBixPay); const send = useServerFn(sendBixPay);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['bix-pay', user?.id], queryFn: () => fetchPay(), enabled: !!user });
  const [tab, setTab] = useState<'pay' | 'receive'>('pay');
  const [scan, setScan] = useState(false);
  const [code, setCode] = useState(''); const [amount, setAmount] = useState(''); const [note, setNote] = useState('');
  const [reqAmount, setReqAmount] = useState(''); const [reqNote, setReqNote] = useState('');
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = data?.code ? `${origin}/pay?to=${data.code}${Number(reqAmount) > 0 ? `&amount=${Number(reqAmount)}` : ''}${reqNote ? `&note=${encodeURIComponent(reqNote.slice(0, 120))}` : ''}` : '';

  useEffect(() => { const p = parse(window.location.href); if (p) { setCode(p.code); if (p.amount) setAmount(String(p.amount)); if (p.note) setNote(p.note); } }, []);

  const gate = () => { if (!enabled) { setMsg('Coming soon — BIX PAY is not open yet.'); return false; } return true; };
  const review = async () => {
    if (!gate()) return;
    setBusy(true); setMsg('');
    try { const r = await lookup({ data: { code } }); if (!r.valid) setMsg('Recipient not found, or that is your own code.'); else setConfirm(true); }
    catch { setMsg('Enter a valid member code like BIX-123456.'); }
    setBusy(false);
  };
  const pay = async () => {
    if (!(await confirmPin())) return;
    setBusy(true);
    try { await send({ data: { code, amount: Number(amount), note } }); txFeedback.success('Payment sent', `${number(Number(amount), { maximumFractionDigits: 8 })} BIX to ${code.toUpperCase()}`); setMsg(`Paid ${number(Number(amount), { maximumFractionDigits: 8 })} BIX to ${code.toUpperCase()}.`); setConfirm(false); setAmount(''); setNote(''); await qc.invalidateQueries({ queryKey: ['bix-pay'] }); await qc.invalidateQueries({ queryKey: ['my-wallet'] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Payment failed.'); txFeedback.fail('Payment failed', e); setConfirm(false); }
    setBusy(false);
  };

  return <BixShell><main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="BIX PAY">
      <Link to="/wallet" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={14}/> Wallet</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow"><ScanLine size={14}/> BIX UTILITY</div><h1 className="section-title">BIX <span>PAY</span></h1></div>{!enabled && <span className="inline-flex items-center gap-1 rounded-full border border-chart-3 bg-chart-3/10 px-3 py-1 text-xs font-bold text-chart-3"><Lock size={12}/> Coming soon</span>}</div>

      {(() => { const [whole, frac] = number(Number(data?.bixBalance ?? 0), { maximumFractionDigits: 8 }).split('.'); return <div className="hubx-hero mt-5"><span className="hubx-hero__label">BIX BALANCE</span><div className="hubx-hero__num numeric"><b>{whole}</b>{frac && <small>.{frac}</small>}<em>BIX</em></div><button type="button" className="hubx-chip numeric" onClick={() => { if (data?.code) { navigator.clipboard.writeText(data.code); setMsg('Member code copied.'); } }}>{data?.code ?? '—'}<Copy size={11}/></button></div>; })()}

      <div className="hubx-tabs mt-4">{(['pay', 'receive'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab === t ? 'is-on' : ''}>{t === 'pay' ? <><ArrowUpRight size={14}/> Pay</> : <><ArrowDownLeft size={14}/> Receive</>}</button>)}</div>

      {tab === 'pay' ? <section className="mt-5 rounded-[20px] border border-primary bg-card p-5">
        <Button className="w-full rounded-full bg-chart-2 text-background" onClick={() => gate() && setScan(true)}>{enabled ? <><ScanLine/> Scan QR code</> : <><Lock/> Scan QR · Coming soon</>}</Button>
        <p className="tx-hint">Opens the camera or a gallery image to read a member's BIX PAY QR.</p>
        <div className="my-4 text-center text-xs text-muted-foreground">or enter manually</div>
        <label className="text-xs text-muted-foreground">RECIPIENT CODE<input className="form-input mt-2 uppercase" placeholder="BIX-123456" value={code} onChange={e => setCode(e.target.value)}/></label>
        <label className="mt-3 block text-xs text-muted-foreground">AMOUNT (BIX)<input className="form-input mt-2" type="number" min="0.0001" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/></label>
        <label className="mt-3 block text-xs text-muted-foreground">NOTE (OPTIONAL)<input className="form-input mt-2" maxLength={120} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Order #12"/></label>
        <Button disabled={busy || (enabled && (!code || !(Number(amount) > 0)))} className="mt-5 w-full rounded-full bg-primary" onClick={review}>{enabled ? 'Review payment' : <><Lock size={16}/> Pay · Coming soon</>}</Button>
        <p className="tx-hint">Checks the recipient first; nothing is sent until you confirm with your PIN.</p>
        <p className="mt-3 text-xs text-muted-foreground">Payments move BIX instantly inside the BIXLINK internal ledger. Max 100,000 BIX per payment, 500,000 BIX per 24 hours. The owner can reverse suspicious payments.</p>
      </section> : <section className="mt-5 rounded-[20px] border border-chart-2 bg-card p-5 text-center">
        {data?.code ? <><div className="pay-qr-card">
            <div className="pay-qr-card__head"><span className="inline-flex items-center gap-1"><QrCode size={13}/> BIX PAY</span><span>{Number(reqAmount) > 0 ? `${number(Number(reqAmount), { maximumFractionDigits: 8 })} BIX` : 'ANY AMOUNT'}</span></div>
            <div className="pay-qr-plate"><QRCodeSVG value={qrUrl} size={220} level="M" marginSize={0}/></div>
            <button type="button" className="pay-qr-code numeric w-full" onClick={() => { navigator.clipboard.writeText(data.code ?? ''); setMsg('Member code copied.'); }} aria-label="Copy member code">{data.code}<Copy size={13}/></button>
            {reqNote && <p className="mt-2 truncate text-[11px] text-muted-foreground">{reqNote}</p>}
          </div>
          <p className="tx-hint">Show this QR to another member. They scan it to send BIX to your code.</p>
          <div className="mt-4 grid gap-3 text-left sm:grid-cols-2"><label className="text-xs text-muted-foreground">REQUEST AMOUNT (OPTIONAL)<input className="form-input mt-2" type="number" min="0" step="any" value={reqAmount} onChange={e => setReqAmount(e.target.value)} placeholder="Any amount"/></label><label className="text-xs text-muted-foreground">NOTE (OPTIONAL)<input className="form-input mt-2" maxLength={120} value={reqNote} onChange={e => setReqNote(e.target.value)}/></label></div>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => { navigator.clipboard.writeText(qrUrl); setMsg('Payment link copied.'); }}><Copy/> Copy payment link</Button>
          <p className="tx-hint">Share the link in chat — it opens BIX PAY with your code and amount filled in.</p></>
          : <p className="text-sm text-muted-foreground">Your member code is being prepared.</p>}
        {!enabled && <p className="mt-4 text-xs text-chart-3">Receiving opens when the owner launches BIX PAY.</p>}
      </section>}

      {msg && <p role="status" className="mt-4 text-sm text-chart-2">{msg}</p>}

      <h2 className="mt-10 font-display text-xl font-black">BIX PAY history</h2>
      <div className="mt-4 space-y-2">{(data?.transfers ?? []).length ? data?.transfers.map(t => <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-full ${t.outgoing ? 'bg-primary/15 text-primary' : 'bg-chart-2/15 text-chart-2'}`}>{t.outgoing ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}</span><div><b>{t.outgoing ? `To ${t.recipient_code}` : `From ${t.sender_code}`}</b><div className="text-xs text-muted-foreground">{dateTime(t.created_at)}{t.note ? ` · ${t.note}` : ''}</div></div></div><div className="text-right"><b className={`numeric ${t.outgoing ? '' : 'text-chart-2'}`}>{t.outgoing ? '−' : '+'}{number(Number(t.amount_bix), { maximumFractionDigits: 8 })} BIX</b><div className={`text-xs capitalize ${t.status === 'reversed' ? 'text-destructive' : 'text-muted-foreground'}`}>{t.status}</div></div></div>)
        : <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border bg-card/60 p-8 text-center"><QrCode className="text-primary"/><p className="text-sm text-muted-foreground">No BIX PAY transactions yet.</p></div>}</div>

      {scan && <Scanner onClose={() => setScan(false)} onResult={raw => { setScan(false); const p = parse(raw); if (!p) { setMsg('That QR is not a BIX PAY code.'); return; } setCode(p.code); if (p.amount) setAmount(String(p.amount)); if (p.note) setNote(p.note); }}/>}
      {confirm && <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur"><div className="w-full max-w-sm rounded-[20px] border border-chart-3 bg-card p-6 text-center">
        <ShieldCheck className="mx-auto text-chart-2" size={32}/><h3 className="mt-3 font-display text-lg font-black">Confirm payment</h3>
        <strong className="numeric mt-3 block text-3xl font-black text-chart-3">{number(Number(amount), { maximumFractionDigits: 8 })} BIX</strong>
        <p className="mt-2 text-sm text-muted-foreground">to <b className="text-foreground">{code.toUpperCase()}</b>{note ? ` · ${note}` : ''}</p>
        <div className="mt-6 grid grid-cols-2 gap-3"><Button variant="outline" className="rounded-full" onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy} className="rounded-full bg-chart-2 text-background" onClick={pay}>Pay now</Button></div>
      </div></div>}
    </MemberGate>
  </main></BixShell>;
}
