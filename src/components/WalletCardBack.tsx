import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, RotateCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { getBixPay } from '@/lib/bixlink.functions';

/** Back face of the wallet balance card: personal BIX PAY QR, member code and account ID. */
export function WalletCardBack({ userId, onFlip }: { userId?: string; onFlip: () => void }) {
  const fetchPay = useServerFn(getBixPay);
  const { data } = useQuery({ queryKey: ['bix-pay', userId], queryFn: () => fetchPay(), enabled: !!userId, staleTime: 60_000 });
  const [copied, setCopied] = useState('');
  const code = (data as { code?: string } | undefined)?.code ?? '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qr = code ? `${origin}/pay?to=${code}` : '';
  const shortId = userId ? `BIX-${userId.replace(/-/g, '').slice(0, 4).toUpperCase()}-${userId.replace(/-/g, '').slice(-4).toUpperCase()}` : '—';
  const copy = (label: string, text: string) => { if (!text) return; navigator.clipboard?.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1500); };
  return <div className="wallet-back-body">
    <div className="flex items-center justify-between gap-2">
      <span className="wallet-back-eyebrow"><ShieldCheck size={13}/> Verified member</span>
      <button type="button" className="wallet-flip-btn" aria-label="Show balance" onClick={onFlip}><RotateCcw size={14}/></button>
    </div>
    <div className="wallet-back-grid">
      <div className="wallet-back-qr">{qr ? <QRCodeSVG value={qr} size={112} level="M" marginSize={0}/> : <span className="text-[10px]">Loading…</span>}</div>
      <dl className="wallet-back-ids">
        <div><dt>Member code</dt><dd><button type="button" onClick={() => copy('code', code)}>{code || '—'} <Copy size={11}/></button></dd></div>
        <div><dt>Account ID</dt><dd><button type="button" onClick={() => copy('id', shortId)}>{shortId} <Copy size={11}/></button></dd></div>
        <p className="wallet-back-hint">{copied ? 'Copied' : 'Scan to send BIX via BIX PAY'}</p>
      </dl>
    </div>
  </div>;
}
