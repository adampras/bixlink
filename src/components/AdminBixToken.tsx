import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Coins, ExternalLink, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSetting } from '@/lib/bixlink.functions';
import { BIXCOIN_BYTECODE } from '@/lib/bixcoin-token-bytecode';

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<any> };
const CHAINS = {
  56: { hex: '0x38', name: 'BNB Smart Chain', rpc: 'https://bsc-dataseed.bnbchain.org', explorer: 'https://bscscan.com', symbol: 'BNB' },
  97: { hex: '0x61', name: 'BNB Testnet', rpc: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545', explorer: 'https://testnet.bscscan.com', symbol: 'tBNB' },
} as const;

export function AdminBixToken({ saved, onMessage }: { saved?: Record<string, unknown>; onMessage: (m: string) => void }) {
  const [chainId, setChainId] = useState<56 | 97>(97);
  const [supply, setSupply] = useState('21000000');
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const save = useServerFn(updateSetting); const qc = useQueryClient();
  const eth = () => (globalThis as unknown as { ethereum?: Eth }).ethereum;
  const chain = CHAINS[chainId];

  const connect = async () => {
    const w = eth();
    if (!w) { setStatus('No wallet found. Open this admin page inside the TokenPocket in-app browser (DApp tab).'); return; }
    const [a] = await w.request({ method: 'eth_requestAccounts' }); setAccount(a);
  };

  const deploy = async () => {
    const w = eth(); const amount = Number(supply);
    if (!w || !account) return setStatus('Connect TokenPocket first.');
    if (!Number.isInteger(amount) || amount <= 0 || amount > 1e12) return setStatus('Supply must be a whole number between 1 and 1,000,000,000,000.');
    setBusy(true);
    try {
      try { await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.hex }] }); }
      catch { await w.request({ method: 'wallet_addEthereumChain', params: [{ chainId: chain.hex, chainName: chain.name, rpcUrls: [chain.rpc], nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 }, blockExplorerUrls: [chain.explorer] }] }); }
      const arg = BigInt(amount).toString(16).padStart(64, '0');
      setStatus('Confirm the transaction in TokenPocket…');
      const txHash: string = await w.request({ method: 'eth_sendTransaction', params: [{ from: account, data: BIXCOIN_BYTECODE + arg }] });
      setStatus('Waiting for BNB Chain confirmation…');
      let receipt: { contractAddress?: string; status?: string } | null = null;
      for (let i = 0; i < 90 && !receipt; i++) { await new Promise(r => setTimeout(r, 2000)); receipt = await w.request({ method: 'eth_getTransactionReceipt', params: [txHash] }); }
      if (!receipt?.contractAddress || receipt.status === '0x0') throw new Error('Deployment not confirmed. Check the transaction on the explorer.');
      await save({ data: { key: 'bix_token', value: { chainId, address: receipt.contractAddress, txHash, deployer: account, supply: amount, deployedAt: new Date().toISOString() } } });
      await qc.invalidateQueries();
      setStatus(''); onMessage(`BIXCOIN created on ${chain.name}.`);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Deployment cancelled.'); }
    finally { setBusy(false); }
  };

  const addToWallet = async () => {
    const w = eth(); if (!w || !saved?.address) return;
    await w.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: saved.address, symbol: 'BIX', decimals: 18 } } as unknown as unknown[] });
  };

  const savedChain = saved?.chainId === 56 || saved?.chainId === 97 ? CHAINS[saved.chainId as 56 | 97] : null;

  return <section className="mt-8 max-w-2xl rounded-[20px] border border-border bg-card p-5">
    <h3 className="flex items-center gap-2 font-display text-lg font-black"><Coins size={18}/> Create BIXCOIN (BEP-20)</h3>
    <p className="mt-1 text-xs text-muted-foreground">Name BIXCOIN · Symbol BIX · 18 decimals · fixed supply sent to your TokenPocket wallet. No extra minting possible. You sign and pay gas ({chain.symbol}) yourself; the app never holds your keys. Internal BIX balances are not converted automatically.</p>

    {savedChain && <div className="mt-4 rounded-xl border border-border bg-background/40 p-4 text-sm">
      <div className="font-bold">Deployed on {savedChain.name}</div>
      <div className="mt-1 break-all font-mono text-xs">{String(saved?.address)}</div>
      <div className="mt-1 text-xs text-muted-foreground">Supply {Number(saved?.supply).toLocaleString('en-US')} BIX</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild><a href={`${savedChain.explorer}/token/${saved?.address}`} target="_blank" rel="noreferrer">View on BscScan <ExternalLink size={14}/></a></Button>
        <Button size="sm" variant="outline" onClick={addToWallet}>Add BIX to wallet</Button>
      </div>
    </div>}

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold">Network
        <div className="mt-1 flex gap-2">{([97, 56] as const).map(id => <Button key={id} type="button" size="sm" variant={chainId === id ? 'default' : 'outline'} onClick={() => setChainId(id)}>{id === 97 ? 'Testnet (free)' : 'Mainnet'}</Button>)}</div>
      </label>
      <label className="text-xs font-bold">Total supply (BIX)
        <Input className="mt-1" inputMode="numeric" value={supply} onChange={e => setSupply(e.target.value.replace(/\D/g, ''))}/>
      </label>
    </div>
    {chainId === 56 && <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}/>I understand this is permanent on BNB Chain mainnet, costs real BNB gas, and I am responsible for legal compliance.</label>}
    <div className="mt-5 flex flex-wrap gap-2">
      <Button variant="outline" onClick={connect}><Wallet size={16}/> {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect TokenPocket'}</Button>
      <Button disabled={busy || !account || (chainId === 56 && !agree)} onClick={deploy}>{busy ? 'Creating…' : `Create BIXCOIN on ${chainId === 97 ? 'Testnet' : 'Mainnet'}`}</Button>
    </div>
    {status && <p className="mt-3 text-xs text-muted-foreground">{status}</p>}
  </section>;
}
