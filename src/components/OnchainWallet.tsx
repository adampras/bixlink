import { useEffect, useState } from 'react';
import { ExternalLink, Copy, Wallet, PlusCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InstallAppButton } from '@/components/InstallPrompt';

type Eth = { request: (a: { method: string; params?: unknown }) => Promise<any> };
type Token = { chainId?: number; address?: string };
const USDT_BSC = '0x55d398326f99059fF775485246999027B3197955';
const NET = {
  56: { hex: '0x38', rpc: 'https://bsc-dataseed.bnbchain.org', scan: 'https://bscscan.com', name: 'BNB Smart Chain' },
  97: { hex: '0x61', rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', scan: 'https://testnet.bscscan.com', name: 'BNB Testnet' },
} as const;

async function balanceOf(rpc: string, token: string, owner: string) {
  const data = '0x70a08231' + owner.slice(2).toLowerCase().padStart(64, '0');
  const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: token, data }, 'latest'] }) });
  const j = await r.json() as { result?: string };
  return j.result && j.result !== '0x' ? Number(BigInt(j.result) / 10n ** 12n) / 1e6 : 0;
}

/** Real BNB Chain view: connected member address, live BEP-20 BIX/USDT balances read from the public RPC, BscScan links. Read-only; never holds keys. */
export function OnchainWallet() {
  const [token, setToken] = useState<Token | null>(null);
  const [addr, setAddr] = useState('');
  const [bal, setBal] = useState<{ bix: number; usdt: number } | null>(null);
  const [msg, setMsg] = useState('');
  const eth = () => (globalThis as unknown as { ethereum?: Eth }).ethereum;

  useEffect(() => { void supabase.from('app_settings').select('value').eq('key', 'bix_token').maybeSingle().then(({ data }) => setToken((data?.value as Token) ?? {})); }, []);
  const chainId = token?.chainId === 97 ? 97 : 56;
  const net = NET[chainId];
  const live = Boolean(token?.address);

  const load = async (a = addr) => {
    if (!a) return;
    try {
      const [bix, usdt] = await Promise.all([live ? balanceOf(net.rpc, token!.address!, a) : Promise.resolve(0), chainId === 56 ? balanceOf(net.rpc, USDT_BSC, a) : Promise.resolve(0)]);
      setBal({ bix, usdt }); setMsg('');
    } catch { setMsg('Could not reach BNB Chain. Try again.'); }
  };
  const connect = async () => {
    const w = eth();
    if (!w) { setMsg('Open BIXLINK inside TokenPocket, Trust Wallet or MetaMask browser to connect.'); return; }
    try { const [a] = await w.request({ method: 'eth_requestAccounts' }); setAddr(a); await load(a); } catch { setMsg('Connection cancelled.'); }
  };
  const addToken = async () => {
    const w = eth(); if (!w || !live) return;
    try {
      try { await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.hex }] }); } catch { /* user may already be on chain */ }
      await w.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: token!.address, symbol: 'BIX', decimals: 18 } } });
    } catch { setMsg('Token was not added.'); }
  };
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

  return <section className="sov-wallet mt-4" aria-label="BIX on-chain wallet">
    <div className="flex items-center justify-between gap-2"><span className="sov-kicker"><Wallet size={12}/> BIX ON-CHAIN · {net.name}</span><span className="sov-soon">{live ? 'LIVE' : 'CONTRACT PENDING'}</span></div>
    <div className="sov-card mt-3 space-y-2">
      {addr ? <div className="flex items-center gap-2 font-mono text-xs"><span className="truncate">{addr}</span><button type="button" aria-label="Copy address" onClick={() => void navigator.clipboard.writeText(addr)}><Copy size={14}/></button></div>
        : <button type="button" className="sov-onchain-btn" onClick={() => void connect()}><Wallet size={14}/> Connect wallet</button>}
      {addr && <div className="grid grid-cols-2 gap-2 text-center">
        <div><small>BIX (BEP-20)</small><b className="numeric block text-lg">{live ? (bal ? fmt(bal.bix) : '…') : '—'}</b></div>
        <div><small>USDT (BEP-20)</small><b className="numeric block text-lg">{bal ? fmt(bal.usdt) : '…'}</b></div>
      </div>}
      <div className="flex flex-wrap gap-2">
        {addr && <a className="sov-onchain-btn" href={`${net.scan}/address/${addr}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> My address on BscScan</a>}
        {live && <a className="sov-onchain-btn" href={`${net.scan}/token/${token!.address}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> BIX contract</a>}
        {live && addr && <button type="button" className="sov-onchain-btn" onClick={() => void addToken()}><PlusCircle size={14}/> Add BIX to wallet</button>}
        {addr && <button type="button" className="sov-onchain-btn" aria-label="Refresh balances" onClick={() => void load()}><RefreshCw size={14}/></button>}
      </div>
    </div>
    {msg && <p className="sov-note">{msg}</p>}
    <div className="mt-3"><InstallAppButton/></div>
    <p className="sov-note">On-chain balances are read directly from BNB Chain and are separate from your BIXLINK app ledger balance. {live ? 'Verify the contract address, not just the ticker.' : 'The official BIX contract address will appear here once the owner deploys it.'}</p>
  </section>;
}
