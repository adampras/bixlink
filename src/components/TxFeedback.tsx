import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* Device-level preferences: optional fiat display + optional transaction PIN.
   The PIN is a local confirmation step on this device (stored as a SHA-256 hash);
   server-side authorization still applies to every transaction. */
export const FIAT_KEY = 'bixlink-fiat-codes';
const PIN_KEY = 'bixlink-tx-pin';

export const getFiatCodes = (): string[] => { try { return JSON.parse(localStorage.getItem(FIAT_KEY) ?? '[]'); } catch { return []; } };
export const setFiatCodes = (codes: string[]) => { localStorage.setItem(FIAT_KEY, JSON.stringify(codes)); window.dispatchEvent(new Event('bixlink-preferences')); };

const hash = async (pin: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bixlink:${pin}`)))).map(b => b.toString(16).padStart(2, '0')).join('');
export const hasPin = () => typeof window !== 'undefined' && !!localStorage.getItem(PIN_KEY);
export const savePin = async (pin: string) => localStorage.setItem(PIN_KEY, await hash(pin));
export const clearPin = () => localStorage.removeItem(PIN_KEY);
export const checkPin = async (pin: string) => (await hash(pin)) === localStorage.getItem(PIN_KEY);

type Result = { ok: boolean; title: string; detail?: string | undefined };
let showResult: (r: Result) => void = () => {};
let askPin: (resolve: (ok: boolean) => void) => void = r => r(true);

export const txFeedback = {
  success: (title: string, detail?: string) => showResult({ ok: true, title, detail }),
  fail: (title: string, error?: unknown) => showResult({ ok: false, title, detail: error instanceof Error ? error.message : typeof error === 'string' ? error : undefined }),
};
/** Resolves true when no PIN is set or the correct PIN is entered. */
export const confirmPin = () => hasPin() ? new Promise<boolean>(resolve => askPin(resolve)) : Promise.resolve(true);

export function TxFeedbackHost() {
  const [result, setResult] = useState<Result | null>(null);
  const [pinReq, setPinReq] = useState<((ok: boolean) => void) | null>(null);
  const [pin, setPin] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { showResult = setResult; askPin = resolve => { setPin(''); setErr(''); setPinReq(() => resolve); }; }, []);
  const finishPin = (ok: boolean) => { pinReq?.(ok); setPinReq(null); };
  return <>
    {pinReq && <div className="modal-backdrop" onClick={() => finishPin(false)}><form role="dialog" aria-modal="true" className="modal-panel text-center" onClick={e => e.stopPropagation()} onSubmit={async e => { e.preventDefault(); if (await checkPin(pin)) finishPin(true); else setErr('Wrong PIN. Try again.'); }}>
      <KeyRound className="mx-auto text-chart-3" size={34}/><h3 className="mt-3 font-display text-xl font-black">Transaction PIN</h3><p className="mt-1 text-xs text-muted-foreground">Enter your 6-digit PIN to confirm.</p>
      <input autoFocus className="form-input mt-4 text-center text-2xl tracking-[0.5em]" inputMode="numeric" type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}/>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3"><Button type="button" variant="outline" className="rounded-full" onClick={() => finishPin(false)}>Cancel</Button><Button disabled={pin.length !== 6} className="rounded-full bg-chart-3 text-background">Confirm</Button></div>
    </form></div>}
    {result && <div className="modal-backdrop" onClick={() => setResult(null)}><div role="dialog" aria-modal="true" className={`tx-result ${result.ok ? 'is-ok' : 'is-fail'}`} onClick={e => e.stopPropagation()}>
      <div className="tx-result-ring">{result.ok ? <CheckCircle2 size={52}/> : <XCircle size={52}/>}</div>
      <div className="eyebrow mt-5 justify-center">{result.ok ? 'TRANSACTION SUCCESS' : 'TRANSACTION FAILED'}</div>
      <h3 className="mt-2 font-display text-xl font-black">{result.title}</h3>
      {result.detail && <p className="mt-2 break-words text-sm text-muted-foreground">{result.detail}</p>}
      <Button className="tx-result-btn mt-6 w-full rounded-full" onClick={() => setResult(null)}>{result.ok ? 'Done' : 'Close'}</Button>
    </div></div>}
  </>;
}
