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
  const isLinked = !!addr && linked === addr.toLowerCase();
  return <section aria-label="Web3 wallet" className="mb-4 flex flex-wrap items-center justify-end gap-1.5">
    {addr && <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-card/60 px-3 text-[11px] font-bold backdrop-blur-md"><i className="size-1.5 rounded-full bg-chart-2"/>{CHAINS[chain] ?? 'Network'} · {short(addr)}</span>}
    {user && addr && <button type="button" disabled={busy || isLinked} onClick={enroll} className="inline-flex h-8 items-center gap-1 rounded-full border border-chart-3/40 bg-card/60 px-3 text-[11px] font-bold text-chart-3 backdrop-blur-md disabled:opacity-70"><ShieldCheck size={12}/>{busy ? 'Verifying…' : isLinked ? 'Linked' : 'Link'}</button>}
    {addr ? <button type="button" aria-label="Disconnect wallet" onClick={() => setAddr('')} className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground"><LogOut size={13}/></button>
      : <button type="button" onClick={connect} title="Withdrawals and bonuses are always reviewed by the admin." className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-card/60 px-3 text-[11px] font-bold text-primary backdrop-blur-md"><Wallet size={13}/>Connect Web3</button>}
    {err && <p role="alert" className="w-full text-right text-[10px] text-destructive">{err}</p>}
    {linked && <p role="status" className="w-full text-right text-[10px] text-chart-2">Linked for sign-in. No funds or approvals requested.</p>}
  </section>;
}
