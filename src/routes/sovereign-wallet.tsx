import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type CSSProperties } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowDownLeft, ArrowUpRight, Copy, ExternalLink, PlusCircle, RefreshCw, Wallet, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InstallAppButton } from '@/components/InstallPrompt';

export const Route = createFileRoute('/sovereign-wallet')({
  head: () => ({
    meta: [
      { title: 'BIX Sovereign Wallet · BNB Chain' },
      { name: 'description', content: 'Self-custody BIX Sovereign Wallet: view real BIX and USDT BEP-20 balances, send and receive on BNB Smart Chain.' },
      { property: 'og:title', content: 'BIX Sovereign Wallet' },
      { property: 'og:description', content: 'Real BIX and USDT on BNB Smart Chain, verifiable on BscScan.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: SovereignApp,
});

type Eth = { request: (a: { method: string; params?: unknown }) => Promise<any> };
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const RPC = 'https://bsc-dataseed.bnbchain.org';
const SCAN = 'https://bscscan.com';

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return ((await r.json()) as { result?: string }).result ?? '0x0';
}
const toNum = (hex: string) => (hex && hex !== '0x' ? Number(BigInt(hex) / 10n ** 12n) / 1e6 : 0);
const balOf = async (token: string, a: string) => toNum(await rpc('eth_call', [{ to: token, data: '0x70a08231' + a.slice(2).toLowerCase().padStart(64, '0') }, 'latest']));
function toWei(v: string) {
  const [i, f = ''] = v.trim().split('.');
  return BigInt(i || '0') * 10n ** 18n + BigInt((f + '0'.repeat(18)).slice(0, 18) || '0');
}

function SovereignApp() {
  const [bix, setBix] = useState('');
  const [addr, setAddr] = useState('');
  const [bal, setBal] = useState<{ bix: number; usdt: number; bnb: number } | null>(null);
  const [sheet, setSheet] = useState<'send' | 'receive' | null>(null);
  const [msg, setMsg] = useState('');
  const eth = () => (globalThis as unknown as { ethereum?: Eth }).ethereum;

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prev = link?.href;
    if (link) link.href = '/sovereign.webmanifest';
    void supabase.from('app_settings').select('value').eq('key', 'bix_token').maybeSingle().then(({ data }) => setBix(((data?.value as { address?: string }) ?? {}).address ?? ''));
    return () => { if (link && prev) link.href = prev; };
  }, []);

  const load = async (a = addr) => {
    if (!a) return;
    try {
      const [b, u, n] = await Promise.all([bix ? balOf(bix, a) : 0, balOf(USDT, a), rpc('eth_getBalance', [a, 'latest'])]);
      setBal({ bix: b, usdt: u, bnb: toNum(n) }); setMsg('');
    } catch { setMsg('Could not reach BNB Chain. Try again.'); }
  };
  useEffect(() => { if (addr) void load(addr); }, [addr, bix]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    const w = eth();
    if (!w) { setMsg('Open this page inside TokenPocket, Trust Wallet or MetaMask to connect your wallet.'); return; }
    try {
      try { await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] }); } catch { /* already on BSC */ }
      const [a] = await w.request({ method: 'eth_requestAccounts' }); setAddr(a);
    } catch { setMsg('Connection cancelled.'); }
  };
  const addToken = async () => {
    try { await eth()?.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: bix, symbol: 'BIX', decimals: 18 } } }); } catch { setMsg('Token was not added.'); }
  };
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  const assets: [string, string, number | null, string, string, string][] = [
    ['BIX', 'BIXCOIN · BEP-20', bix ? bal?.bix ?? null : null, '🦊', '#FFD700', '#A855F7'],
    ['USDT', 'Tether · BEP-20', bal?.usdt ?? null, '₮', '#26A17B', '#6FE3BE'],
    ['BNB', 'Gas fee', bal?.bnb ?? null, '◆', '#F3BA2F', '#FFE08A'],
  ];

  return <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
    <main className="mx-auto max-w-md px-4 pb-10 pt-5">
      <div className="flex items-center justify-between"><span className="sov-kicker"><Sparkles size={12}/> BIX SOVEREIGN WALLET</span><span className="sov-soon">{bix ? 'LIVE · BSC' : 'CONTRACT PENDING'}</span></div>
      <section className="sov-card mt-4">
        <small>SELF-CUSTODY · BNB SMART CHAIN</small>
        {addr ? <>
          <div className="mt-1 flex items-center gap-2 font-mono text-xs"><span className="truncate">{addr}</span><button type="button" aria-label="Copy address" onClick={() => void navigator.clipboard.writeText(addr)}><Copy size={14}/></button></div>
          <b className="numeric mt-3 block font-display text-3xl">{bal ? fmt(bal.bix) : '…'} <span className="text-base">BIX</span></b>
        </> : <button type="button" className="sov-onchain-btn mt-3" onClick={() => void connect()}><Wallet size={14}/> Connect wallet</button>}
      </section>
      {addr && <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" className="sov-onchain-btn justify-center" onClick={() => setSheet('send')}><ArrowUpRight size={14}/> Send</button>
        <button type="button" className="sov-onchain-btn justify-center" onClick={() => setSheet('receive')}><ArrowDownLeft size={14}/> Receive</button>
        <button type="button" className="sov-onchain-btn justify-center" aria-label="Refresh balances" onClick={() => void load()}><RefreshCw size={14}/></button>
      </div>}
      <section className="mt-5 space-y-2" aria-label="Assets">
        {assets.map(([s, n, v, g, c1, c2]) => <div key={s} className="sov-card flex items-center gap-3 !p-3" style={{ '--c1': c1, '--c2': c2 } as CSSProperties}>
          <span className="sov-coin" aria-hidden>{g}</span>
          <div className="min-w-0 flex-1"><b className="block">{s}</b><small>{n}</small></div>
          <b className="numeric">{v === null ? '—' : fmt(v)}</b>
        </div>)}
      </section>
      <div className="mt-4 flex flex-wrap gap-2">
        {addr && <a className="sov-onchain-btn" href={`${SCAN}/address/${addr}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> My BscScan</a>}
        {bix && <a className="sov-onchain-btn" href={`${SCAN}/token/${bix}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> BIX contract</a>}
        {bix && addr && <button type="button" className="sov-onchain-btn" onClick={() => void addToken()}><PlusCircle size={14}/> Add BIX</button>}
      </div>
      {msg && <p className="sov-note">{msg}</p>}
      <div className="mt-4"><InstallAppButton/></div>
      <p className="sov-note">Self-custody: your keys stay in your own wallet app; BIXLINK never stores them. On-chain balances are separate from your BIXLINK app ledger. Always verify the contract address. Blockchain transfers are final.</p>
    </main>
    {sheet && addr && <Sheet kind={sheet} addr={addr} bix={bix} onClose={() => setSheet(null)} onDone={() => void load()}/>}
  </div>;
}

function Sheet({ kind, addr, bix, onClose, onDone }: { kind: 'send' | 'receive'; addr: string; bix: string; onClose: () => void; onDone: () => void }) {
  const [tok, setTok] = useState(bix ? 'BIX' : 'USDT');
  const [to, setTo] = useState('');
  const [amt, setAmt] = useState('');
  const [state, setState] = useState('');
  const send = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) return setState('Enter a valid BNB Chain address (0x…).');
    if (!/^\d+(\.\d+)?$/.test(amt) || Number(amt) <= 0) return setState('Enter a valid amount.');
    if (!window.confirm(`Send ${amt} ${tok} to ${to}? On-chain transfers cannot be reversed.`)) return;
    try {
      const data = '0xa9059cbb' + to.slice(2).toLowerCase().padStart(64, '0') + toWei(amt).toString(16).padStart(64, '0');
      const hash = await (globalThis as unknown as { ethereum: Eth }).ethereum.request({ method: 'eth_sendTransaction', params: [{ from: addr, to: tok === 'BIX' ? bix : USDT, data }] });
      setState(`Submitted: ${hash}`); setTimeout(onDone, 6000);
    } catch { setState('Transaction cancelled or failed.'); }
  };
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-3" role="dialog" aria-modal="true" aria-label={kind === 'send' ? 'Send tokens' : 'Receive tokens'}>
    <div className="sov-card w-full max-w-md space-y-3">
      <div className="flex items-center justify-between"><b className="font-display">{kind === 'send' ? 'Send' : 'Receive'}</b><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></div>
      {kind === 'receive' ? <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl bg-foreground p-3"><QRCodeSVG value={addr} size={180}/></div>
        <span className="break-all text-center font-mono text-xs">{addr}</span>
        <button type="button" className="sov-onchain-btn" onClick={() => void navigator.clipboard.writeText(addr)}><Copy size={14}/> Copy address</button>
        <small>Only send BIX, USDT or BNB on BNB Smart Chain (BEP-20).</small>
      </div> : <>
        <div className="flex gap-2">{(bix ? ['BIX', 'USDT'] : ['USDT']).map((t) => <button key={t} type="button" aria-pressed={t === tok} className="sov-onchain-btn" onClick={() => setTok(t)}>{t}</button>)}</div>
        <input className="w-full rounded-lg border border-border bg-card p-2 font-mono text-xs" placeholder="Recipient 0x…" value={to} onChange={(e) => setTo(e.target.value.trim())}/>
        <input className="w-full rounded-lg border border-border bg-card p-2" inputMode="decimal" placeholder="Amount" value={amt} onChange={(e) => setAmt(e.target.value)}/>
        <button type="button" className="sov-onchain-btn w-full justify-center" onClick={() => void send()}><ArrowUpRight size={14}/> Confirm in wallet</button>
        <small>Network fee is paid in BNB. You approve the transfer in your own wallet app.</small>
      </>}
      {state && <p className="sov-note break-all">{state}</p>}
    </div>
  </div>;
}
