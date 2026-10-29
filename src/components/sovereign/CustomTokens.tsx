import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tok = { address: string; symbol: string; decimals: number };
const KEY = 'sov_custom_tokens';
const isAddr = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
const read = (): Tok[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((t) => isAddr(t?.address)) : []; } catch { return []; } };
const buzz = () => { try { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(10); } catch { /* noop */ } };

async function call(node: string, to: string, data: string) {
  const r = await fetch(node, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }) });
  const j = (await r.json()) as { result?: string };
  if (!j.result || j.result === '0x') throw new Error('Not a BEP-20 contract');
  return j.result;
}
function decodeString(hex: string) {
  const h = hex.slice(2);
  if (h.length === 64) return decodeBytes32(h);
  const len = parseInt(h.slice(64, 128), 16);
  const bytes = h.slice(128, 128 + len * 2);
  return new TextDecoder().decode(new Uint8Array(bytes.match(/../g)?.map((b) => parseInt(b, 16)) ?? []));
}
function decodeBytes32(h: string) { return new TextDecoder().decode(new Uint8Array((h.match(/../g) ?? []).map((b) => parseInt(b, 16)).filter((b) => b > 0))); }

export function CustomTokens({ addr, node, hide }: { addr: string; node: string; hide: boolean }) {
  const [list, setList] = useState<Tok[]>([]);
  const [bal, setBal] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setList(read()); }, []);
  useEffect(() => {
    if (!addr) return;
    list.forEach((t) => {
      void call(node, t.address, '0x70a08231' + addr.slice(2).toLowerCase().padStart(64, '0'))
        .then((h) => setBal((b) => ({ ...b, [t.address]: Number(BigInt(h)) / 10 ** t.decimals })))
        .catch(() => undefined);
    });
  }, [addr, list, node]);
  const save = (l: Tok[]) => { setList(l); localStorage.setItem(KEY, JSON.stringify(l)); };
  const add = async () => {
    const a = input.trim();
    if (!isAddr(a)) return setMsg('Enter a valid BEP-20 contract address (0x…).');
    if (list.some((t) => t.address.toLowerCase() === a.toLowerCase())) return setMsg('Token already in your list.');
    setBusy(true); setMsg('');
    try {
      const [s, d] = await Promise.all([call(node, a, '0x95d89b41'), call(node, a, '0x313ce567')]);
      const symbol = decodeString(s).slice(0, 12) || 'TOKEN';
      const decimals = Number(BigInt(d));
      if (!Number.isFinite(decimals) || decimals > 36) throw new Error('bad');
      save([...list, { address: a, symbol, decimals }]); buzz();
      setInput(''); setOpen(false);
    } catch { setMsg('No BEP-20 token found at this address on BNB Chain.'); }
    finally { setBusy(false); }
  };
  return <section className="mt-3 space-y-3" aria-label="Custom tokens">
    {list.map((t) => <div key={t.address} className="sw-row w-full">
      <span className="sw-coin"><b>{t.symbol.slice(0, 2)}</b></span>
      <div className="min-w-0 flex-1"><b className="block text-lg">{t.symbol}</b><span className="sw-muted font-mono text-xs">{t.address.slice(0, 8)}…{t.address.slice(-4)}</span></div>
      <b className="numeric text-lg">{hide ? '••••' : addr ? (bal[t.address] ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}</b>
      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${t.symbol}`} onClick={() => save(list.filter((x) => x.address !== t.address))}><Trash2 size={15} /></Button>
    </div>)}
    {open ? <div className="sw-row w-full flex-col items-stretch gap-2">
      <div className="flex items-center justify-between"><b>Add custom BEP-20 token</b><Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}><X size={16} /></Button></div>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Contract address 0x…" className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm" />
      <Button type="button" className="sw-gold-btn" disabled={busy} onClick={() => void add()}>{busy ? 'Reading BNB Chain…' : 'Add token'}</Button>
      <small className="sw-muted">Anyone can create a token. Only add contracts you trust; listing here does not imply value.</small>
      {msg && <small role="alert" className="sw-muted">{msg}</small>}
    </div> : <Button type="button" className="sw-row w-full justify-center gap-2" onClick={() => setOpen(true)}><Plus size={16} /> Add custom token</Button>}
  </section>;
}
