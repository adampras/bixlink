import { useEffect, useState } from 'react';
import { Wallet, ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { useServerFn } from '@tanstack/react-start';
import { createWalletLinkChallenge, linkVerifiedWallet } from '@/lib/wallet-login.functions';
import { bnbWalletAddress, injectedWallet, signWalletProof, type WalletProvider } from '@/lib/wallet-provider';

type Eth = WalletProvider;
const CHAINS: Record<string, string> = { '0x1': 'Ethereum', '0x38': 'BNB Smart Chain', '0x89': 'Polygon', '0xa4b1': 'Arbitrum' };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Owner-switchable Web3 wallet connect. Read-only: it never signs withdrawals; payouts stay owner-reviewed. */
export function Web3Connect() {
  const { data: cfg } = usePublicConfig();
  const { user } = useMember();
  const create = useServerFn(createWalletLinkChallenge);
  const link = useServerFn(linkVerifiedWallet);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState('');
  const [eth, setEth] = useState<Eth | null>(null);
  const [addr, setAddr] = useState('');
  const [chain, setChain] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    const e = injectedWallet();
    setEth(e);
    if (!e) return;
    e.request({ method: 'eth_accounts' }).then(a => setAddr((a as string[])[0] ?? '')).catch(() => {});
    e.request({ method: 'eth_chainId' }).then(c => setChain(String(c))).catch(() => {});
    const accountsChanged = (a: unknown) => { setAddr((a as string[])[0] ?? ''); setLinked(''); };
    const chainChanged = (c: unknown) => setChain(String(c));
    e.on?.('accountsChanged', accountsChanged);
    e.on?.('chainChanged', chainChanged);
    return () => { e.removeListener?.('accountsChanged', accountsChanged); e.removeListener?.('chainChanged', chainChanged); };
  }, []);
  if (!cfg?.readiness.web3WalletEnabled) return null;
  async function connect() {
    setErr('');
    if (!eth) { setErr('Open BIXLINK inside TokenPocket, Trust Wallet, Bitget or MetaMask browser.'); return; }
    try { const a = await eth.request({ method: 'eth_requestAccounts' }) as string[]; setAddr(a[0] ?? ''); setChain(String(await eth.request({ method: 'eth_chainId' }))); }
    catch { setErr('Connection was cancelled.'); }
  }
  async function enroll() {
    setBusy(true); setErr('');
    try {
      if (!eth) throw new Error('Open BIXLINK in your wallet browser.');
      const address = await bnbWalletAddress(eth);
      setAddr(address); setChain('0x38');
      const challenge = await create({ data: { address } });
      const signature = await signWalletProof(eth, challenge.message, address);
      const result = await link({ data: { id: challenge.id, signature } });
      setLinked(result.address);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Wallet linking cancelled.'); }
    finally { setBusy(false); }
  }
  return <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-primary/40 bg-card/80 px-4 py-3">
    <div className="flex min-w-0 items-center gap-3"><Wallet className="shrink-0 text-primary" size={20}/>
      <div className="min-w-0"><b className="block text-sm">{addr ? short(addr) : 'Web3 Wallet'}</b>
        <span className="text-[11px] text-muted-foreground">{addr ? `${CHAINS[chain] ?? 'Unknown network'} · connected` : 'Connect TokenPocket, MetaMask or Trust Wallet'}</span>
        {err && <span className="block text-[11px] text-destructive">{err}</span>}</div></div>
    {addr ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setAddr('')}><LogOut size={14}/>Disconnect</Button>
      : <Button size="sm" className="rounded-full" onClick={connect}>Connect Wallet</Button>}
    {user && addr && <Button size="sm" variant="outline" disabled={busy || linked === addr.toLowerCase()} onClick={enroll}>{busy ? 'Verifying…' : linked === addr.toLowerCase() ? 'Linked for sign-in' : 'Link BNB wallet for sign-in'}</Button>}
    {linked && <p role="status" className="w-full text-xs text-chart-2">Wallet linked to your existing account. No funds or token approvals were requested.</p>}
    <p className="flex w-full items-center gap-1 text-[10px] text-muted-foreground"><ShieldCheck size={11}/>Deposits are recorded as PENDING by TxID. Withdrawals and bonuses are always reviewed by the admin.</p>
  </section>;
}
