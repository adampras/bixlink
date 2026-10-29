import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowDownLeft, ArrowUpRight, Bell, BarChart3, Camera, ChevronDown, ChevronLeft, ChevronRight, ClipboardPaste, Compass,
  Copy, Eye, EyeOff, Globe, ImageIcon, Languages, Moon, Network, Plus, ScanLine, Search, Shield, SlidersHorizontal, Star,
  Trash2, User, Wallet, FileText, Download, Zap, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { useQuery } from '@tanstack/react-query';
import { Button as BaseButton, type ButtonProps } from '@/components/ui/button';
import { AccountLogin, AccountTransfer, AccountHistory, AccountProfile, WalletLanguage } from '@/components/sovereign/AccountScreens';
import { MarketChart, MarketTerminal } from '@/components/sovereign/MarketTerminal';
import { readMarketSnapshot, type MarketQuote } from '@/lib/sovereign-market';
import { parseWalletRecipient } from '@/lib/sovereign-flow';
import { useI18n } from '@/lib/i18n';
function Button(props: ButtonProps) { return <BaseButton variant="wallet" size="wallet" {...props} />; }
import { useServerFn } from '@tanstack/react-start';
import { getMyWallet } from '@/lib/bixlink.functions';
import { InstallAppButton } from '@/components/InstallPrompt';
import walletArt from '@/assets/bix-lux-wallet.png';
import foxIcon from '@/assets/fox-icon-512.png.asset.json';
const foxMark = foxIcon.url;

export const Route = createFileRoute('/sovereign-wallet')({
  head: () => ({
    meta: [
      { title: 'BIX Sovereign Wallet · BNB Chain' },
      { name: 'description', content: 'Self-custody BIX Sovereign Wallet: real BIX, USDT and BNB balances, transfer, receive, scan, market and DApps on BNB Smart Chain.' },
      { property: 'og:title', content: 'BIX Sovereign Wallet' },
      { property: 'og:description', content: 'Real BIX and USDT on BNB Smart Chain, verifiable on BscScan.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: SovereignApp,
});

import { CustomTokens } from '@/components/sovereign/CustomTokens';
type Eth = { request: (a: { method: string; params?: unknown }) => Promise<any> };
type Tab = 'wallet' | 'market' | 'discover' | 'me';
type Screen = 'login' | 'accountsend' | 'history' | 'language' | null | 'myid' | 'send' | 'receive' | 'scan' | 'book' | 'node' | 'security' | 'notify';
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const NODES = ['https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.defibit.io', 'https://bsc-dataseed1.ninicoin.io', 'https://bsc.publicnode.com'];
const SCAN = 'https://bscscan.com';
const getNode = () => (typeof localStorage !== 'undefined' && localStorage.getItem('sov_node')) || (NODES[0] ?? 'https://bsc.publicnode.com');

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(getNode(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const data = await r.json() as { result?: string; error?: unknown };
  if (!r.ok || data.error || typeof data.result !== 'string') throw new Error('BNB Chain unavailable');
  return data.result;
}
const toNum = (hex: string) => (hex && hex !== '0x' ? Number(BigInt(hex) / 10n ** 12n) / 1e6 : 0);
const balOf = async (token: string, a: string) => toNum(await rpc('eth_call', [{ to: token, data: '0x70a08231' + a.slice(2).toLowerCase().padStart(64, '0') }, 'latest']));
function toWei(v: string) {
  const [i, f = ''] = v.trim().split('.');
  return BigInt(i || '0') * 10n ** 18n + BigInt((f + '0'.repeat(18)).slice(0, 18) || '0');
}
const short = (a: string) => `${a.slice(0, 8)}••••${a.slice(-6)}`;
const fmt = (n: number, d = 4) => n.toLocaleString('en-US', { maximumFractionDigits: d });
const isAddr = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
type Book = { name: string; address: string }[];
const readBook = (): Book => { try { return JSON.parse(localStorage.getItem('sov_book') || '[]'); } catch { return []; } };

function SovereignApp() {
  const [tab, setTab] = useState<Tab>('wallet');
  const [screen, setScreen] = useState<Screen>(null);
  const [bix, setBix] = useState('');
  const [addr, setAddr] = useState('');
  const [bal, setBal] = useState<{ bix: number; usdt: number; bnb: number } | null>(null);
  const [px, setPx] = useState<Record<string, { p: number; c: number }>>({});
  const [gas, setGas] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState('Connecting…');
  const [hide, setHide] = useState(false);
  const [msg, setMsg] = useState('');
  const [prefillTo, setPrefillTo] = useState('');
  const [bixRef, setBixRef] = useState(0);
  const [sendToken, setSendToken] = useState('BIX');
  const { t } = useI18n();
  const [asset, setAsset] = useState<string | null>(null);
  const [mode, setMode] = useState<'ledger' | 'web3'>('ledger');
  const member = useMember();
  const { data: swCfg } = usePublicConfig();
  const fetchWallet = useServerFn(getMyWallet);
  const walletQ = useQuery({ queryKey: ['my-wallet', member.user?.id], queryFn: () => fetchWallet(), enabled: !!member.user, staleTime: 15_000 });
  useEffect(() => { const s = localStorage.getItem('sov_mode'); if (s === 'web3' || s === 'ledger') setMode(s); }, []);
  const accountGo = (s: Screen) => { setAsset(null); setScreen(member.user ? s : 'login'); };
  const pickMode = (m: 'ledger' | 'web3') => { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(8); setMode(m); setMsg(''); localStorage.setItem('sov_mode', m); };
  const eth = () => (globalThis as unknown as { ethereum?: Eth }).ethereum;
  useEffect(() => { document.querySelector('.sw-app')?.scrollTo(0, 0); }, [screen, asset, tab]);
  useEffect(() => {
    const onTap = (e: PointerEvent) => { if ((e.target as HTMLElement | null)?.closest('.sw-action, .sw-dock button, .sw-gold-btn') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(6); };
    document.addEventListener('pointerdown', onTap);
    return () => document.removeEventListener('pointerdown', onTap);
  }, []);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prev = link?.href;
    if (link) link.href = '/sovereign.webmanifest';
    void supabase.from('app_settings').select('value').eq('key', 'bix_token').maybeSingle().then(({ data }) => setBix(((data?.value as { address?: string }) ?? {}).address ?? ''));
    void supabase.from('app_settings').select('value').eq('key', 'bix_market').maybeSingle().then(({ data }) => {
      const n = Number((data?.value as { priceUsd?: number } | null)?.priceUsd ?? 0.84291);
      setBixRef(n > 0 ? n : 0.84291);
    });
    const cached = readMarketSnapshot<Record<string, MarketQuote>>(localStorage.getItem('sov-quotes'));
    if (cached) { setPx(cached.data); setSnapshot(`Saved ${new Date(cached.savedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`); }
    const prices = async () => {
      try {
        const syms = ['BNBUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'TRXUSDT', 'TONUSDT', 'LINKUSDT'];
        const r = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`);
        const j = (await r.json()) as { symbol: string; lastPrice: string; priceChangePercent: string }[];
        const m: Record<string, { p: number; c: number }> = {};
        j.forEach((t) => { m[t.symbol.replace('USDT', '')] = { p: Number(t.lastPrice), c: Number(t.priceChangePercent) }; });
        setPx(m); setSnapshot(`Updated ${new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`);
        try { localStorage.setItem('sov-quotes', JSON.stringify({ savedAt: Date.now(), data: m })); } catch {}
      } catch { setSnapshot(cached ? 'Offline snapshot' : 'Data unavailable'); }
    };
    void prices(); const timer = setInterval(() => void prices(), 30000);
    return () => { clearInterval(timer); if (link && prev) link.href = prev; };
  }, []);

  const load = async (a = addr) => {
    if (!a) return;
    try {
      const [b, u, n] = await Promise.all([bix ? balOf(bix, a) : 0, balOf(USDT, a), rpc('eth_getBalance', [a, 'latest'])]);
      setBal({ bix: b, usdt: u, bnb: toNum(n) }); setMsg('');
    } catch { setMsg('Could not reach BNB Chain. Try another node in Me → Node.'); }
  };
  useEffect(() => { let active = true; const update = () => { void rpc('eth_gasPrice', []).then(g => { if (active) setGas(Number(BigInt(g)) / 1e9); }).catch(() => { if (active) setGas(null); }); }; if (mode === 'web3') update(); const timer = setInterval(() => { if (mode === 'web3') update(); }, 30000); return () => { active = false; clearInterval(timer); }; }, [mode]);
  useEffect(() => { if (addr) void load(addr); }, [addr, bix]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    const w = eth();
    if (!w) { setMsg('Open this page inside TokenPocket, Trust Wallet or MetaMask to connect your wallet.'); return false; }
    try {
      await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
      const [a] = await w.request({ method: 'eth_requestAccounts' });
      if (typeof a !== 'string' || !isAddr(a)) return false;
      setAddr(a); return true;
    } catch { setMsg('Connection cancelled.'); return false; }
  };
  const need = async (s: Screen) => { if (addr || (await connect())) setScreen(s); };
  const addToken = async () => {
    if (!bix) return setMsg('BIX contract is not published yet.');
    if (!eth()) { await connect(); return; }
    try { const added = await eth()?.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: bix, symbol: 'BIX', decimals: 18 } } }); setMsg(added ? 'BIX added to wallet.' : 'Token was not added.'); } catch { setMsg('Token was not added.'); }
  };

  const bnbP = px['BNB']?.p ?? 0;
  const total = bal ? bal.bix * bixRef + bal.usdt + bal.bnb * bnbP : 0;
  const money = (n: number) => (hide ? '••••' : `$${fmt(n, 2)}`);
  const ledger = mode === 'ledger';
  const md = member.data as { bixBalance?: number; usdtBalance?: number; referral?: { code?: string } | null } | undefined;
  const lBix = Number(walletQ.data?.bixBalance ?? md?.bixBalance ?? 0);
  const lUsdt = Number(walletQ.data?.usdtBalance ?? md?.usdtBalance ?? 0);
  const bixId = md?.referral?.code;
  const ledgerTotal = lBix * bixRef + lUsdt;

  if (swCfg && swCfg.readiness.sovereignWalletEnabled === false && !member.data?.isAdmin) {
    return <div className="sw-app"><main className="sw-main grid min-h-[70vh] place-items-center text-center">
      <div><img src={walletArt} alt="BIXLINK wallet" className="sw-emblem sw-emblem-xl mx-auto" /><b className="mt-4 block font-display text-2xl">Wallet under maintenance</b><p className="sw-note">BIXLINK Wallet is temporarily closed by the owner. Your account balance is safe in the BIXLINK app.</p><a href="/wallet" className="sw-gold-btn mt-4 inline-flex px-5 py-2">Back to BIXLINK</a></div>
    </main></div>;
  }

  if (asset && !screen && ledger) {
    const p = asset === 'BIX' ? bixRef : 1;
    const v = member.user ? (asset === 'BIX' ? lBix : lUsdt) : undefined;
    return <div className="sw-app"><main className="sw-main">
      <TopBar title={`${asset} · Account`} onBack={() => setAsset(null)} />
      <div className="sw-asset-hero text-center">
        <span className={`sw-coin sw-coin-lg sw-coin-${asset.toLowerCase()}`}>{asset === 'BIX' ? <img src={foxMark} alt="" /> : <b>₮</b>}</span>
        <b className="numeric mt-3 block font-display text-3xl">{hide ? '••••' : v === undefined ? '—' : fmt(v)} {asset}</b>
        <small className="sw-muted">≈ {v === undefined ? '—' : money(v * p)} · {asset === 'BIX' ? `$${fmt(p, 4)} internal ref.` : 'BIXLINK app balance'}</small>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button className="sw-action" onClick={() => { setSendToken(asset); accountGo('accountsend'); }}><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><b>Send</b></Button>
        <Button type="button" className="sw-action" onClick={() => { accountGo('myid'); }}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><b>Receive</b></Button>
        <Button className="sw-action" onClick={() => accountGo('history')}><span className="sw-gold-dot"><FileText size={18} /></span><b>History</b></Button>
      </div>
      <p className="sw-note">USDT deposits and withdrawal requests remain in the BIXLINK main app. Virtual USDT transfers use a separate test balance.</p>
      <p className="sw-note">{asset === 'BIX' ? 'Account BIX moves instantly between BIX IDs via BIX PAY, without gas. It is an internal ledger balance, not an on-chain token.' : 'Account USDT is your BIXLINK app balance. Deposits and withdrawals are reviewed by the owner.'}</p>
    </main></div>;
  }

  if (asset && !screen) {
    const p = asset === 'BIX' ? bixRef : asset === 'USDT' ? 1 : bnbP;
    const v = asset === 'BIX' ? (bix ? bal?.bix : undefined) : asset === 'USDT' ? bal?.usdt : bal?.bnb;
    const url = asset === 'BIX' ? (bix ? `${SCAN}/token/${bix}${addr ? `?a=${addr}` : ''}` : SCAN) : asset === 'USDT' ? `${SCAN}/token/${USDT}${addr ? `?a=${addr}` : ''}` : addr ? `${SCAN}/address/${addr}` : SCAN;
    return <div className="sw-app"><main className="sw-main">
      <TopBar title={asset} onBack={() => setAsset(null)} />
      <div className="sw-asset-hero text-center">
        <span className={`sw-coin sw-coin-lg sw-coin-${asset.toLowerCase()}`}>{asset === 'BIX' ? <img src={foxMark} alt="" /> : <b>{asset === 'USDT' ? '₮' : '◆'}</b>}</span>
        <b className="numeric mt-3 block font-display text-3xl">{hide ? '••••' : v === undefined ? '—' : fmt(v)} {asset}</b>
        <small className="sw-muted">≈ {v === undefined ? '—' : money(v * p)} · {p ? `$${fmt(p, 4)}` : '—'}{asset === 'BIX' ? ' internal ref.' : ''}</small>
      </div>
      <MarketChart symbol={asset === 'BNB' ? 'BNBUSDT' : null} />
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button type="button" className="sw-action" onClick={() => { setSendToken(asset); setAsset(null); void need('send'); }}><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><b>Send</b></Button>
        <Button type="button" className="sw-action" onClick={() => { setAsset(null); void need('receive'); }}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><b>Receive</b></Button>
        <a className="sw-action" href={url} target="_blank" rel="noreferrer"><span className="sw-gold-dot"><Search size={18} /></span><b>Explorer</b></a>
      </div>
      {asset === 'BIX' && <Button type="button" className="sw-gold-btn mt-4 w-full" onClick={() => void addToken()}><Plus size={16} /> Add BIX to wallet</Button>}
      <p className="sw-note">{asset === 'BIX' ? 'BIX value uses the BIXLINK internal reference, not a traded market price.' : asset === 'USDT' ? 'USDT BEP-20 on BNB Chain.' : 'BNB is used for network fees on BNB Chain.'}</p>
      {msg && <p className="sw-note">{msg}</p>}
    </main></div>;
  }

  if (screen) {
    return <div className="sw-app"><main className="sw-main">
      {screen === 'login' && <AccountLogin back={() => setScreen(null)} done={() => { setScreen(null); setTab('wallet'); }} />}
      {screen === 'accountsend' && <AccountTransfer initialCode={prefillTo} initialToken={sendToken} back={() => { setScreen(null); setPrefillTo(''); }} scan={() => setScreen('scan')} done={() => { setScreen('history'); setPrefillTo(''); }} />}
      {screen === 'history' && <AccountHistory back={() => setScreen(null)} />}
      {screen === 'language' && <WalletLanguage back={() => setScreen(null)} />}
      {screen === 'send' && <SendScreen initialToken={sendToken} addr={addr} bix={bix} bal={bal} initialTo={prefillTo} onBack={() => { setScreen(null); setPrefillTo(''); }} onScan={() => setScreen('scan')} onBook={() => setScreen('book')} onDone={() => void load()} />}
      {screen === 'myid' && <MyIdScreen code={bixId ?? ''} onBack={() => setScreen(null)} />}
      {screen === 'receive' && <ReceiveScreen addr={addr} onBack={() => setScreen(null)} />}
      {screen === 'scan' && <ScanScreen onBack={() => setScreen(null)} onResult={(v) => { const recipient = parseWalletRecipient(v, ledger); if (recipient) { setPrefillTo(recipient); setScreen(ledger ? 'accountsend' : 'send'); } else { setMsg(ledger ? 'QR code does not contain a valid BIX ID.' : 'QR code does not contain a BNB Chain address.'); setScreen(null); } }} />}
      {screen === 'book' && <BookScreen ledger={ledger} onBack={() => setScreen(null)} onPick={(a) => { setPrefillTo(a); if (ledger) accountGo('accountsend'); else void need('send'); }} />}
      {screen === 'node' && <NodeScreen onBack={() => { setScreen(null); void load(); }} />}
      {screen === 'security' && <InfoScreen title="Security & verification" onBack={() => setScreen(null)} />}
      {screen === 'notify' && <AccountHistory alerts back={() => setScreen(null)} />}
    </main></div>;
  }

  return <div className="sw-app">
    <main className="sw-main pb-28">
      {tab === 'wallet' && <>
        <header className="flex items-center gap-3">
          <span className="sw-avatar"><img src={foxMark} alt="" width={44} height={44} /></span>
          <div className="min-w-0 flex-1">
            <b className="block truncate font-display text-lg">{ledger ? (bixId ?? 'BIXLINK Account') : addr ? short(addr) : 'BIXLINK Wallet'}</b>
            <span className={`sw-pill ${ledger ? 'sw-pill-live' : ''}`}><i aria-hidden /> {ledger ? 'Ledger · Gasless · Zero fee' : `BSC · Gas ${gas === null ? '—' : fmt(gas, 3) + ' Gwei'}`}</span>
          </div>
          <Button type="button" className="sw-round" aria-label="Notifications" onClick={() => setScreen('notify')}><Bell size={18} /></Button>
          <Button className="sw-round" aria-label="Scan QR" onClick={() => ledger ? accountGo('scan') : setScreen('scan')}><ScanLine size={18} /></Button>
        </header>

        <div className="sw-mode mt-5" role="tablist" aria-label="Wallet mode">
          <span className="sw-mode-thumb" data-pos={ledger ? 'l' : 'r'} aria-hidden />
          <Button type="button" role="tab" aria-selected={ledger} onClick={() => pickMode('ledger')}><Zap size={15} /> BIXLINK Account</Button>
          <Button type="button" role="tab" aria-selected={!ledger} onClick={() => pickMode('web3')}><Globe size={15} /> Web3 On-Chain</Button>
        </div>

        <section key={mode} className="sw-wallet sw-fade mt-4" aria-label="Wallet balance">
          <div className="sw-wallet-card"><span>BIXLINK</span><small>{ledger ? 'ACCOUNT' : 'ON-CHAIN'}</small></div>
          <div className="sw-wallet-pocket">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="sw-chip">{ledger ? <><ShieldCheck size={13} /> Gasless</> : <><Network size={13} /> BEP-20</>}</span><small className="sw-muted">Total assets</small></div>
              <div className="mt-2 flex items-center gap-2">
                <b className="numeric font-display text-3xl">{ledger ? (member.user ? walletQ.isPending ? <span className="sw-skeleton inline-block h-9 w-24" aria-label="Loading balance"/> : walletQ.isError ? '—' : money(ledgerTotal) : '$0.00') : addr ? (bal ? money(total) : <span className="sw-skeleton inline-block h-9 w-24" aria-label="Loading balance"/>) : '$0.00'}</b>
                <Button type="button" aria-label={hide ? 'Show balance' : 'Hide balance'} onClick={() => setHide(!hide)} className="sw-muted">{hide ? <EyeOff size={18} /> : <Eye size={18} />}</Button>
              </div>
              {ledger
                ? (member.user
                  ? <Button type="button" className="sw-muted mt-3 flex items-center gap-2 font-mono text-sm" onClick={() => { if (bixId) { void navigator.clipboard.writeText(bixId); setMsg('BIX ID copied.'); } }}>{bixId ?? '…'} <Copy size={14} /></Button>
                  : <Button className="sw-gold-btn mt-3 !px-4 !py-2 text-sm" onClick={() => setScreen('login')}><User size={14} />{t('signIn')}</Button>)
                : addr ? <Button type="button" className="sw-muted mt-3 flex items-center gap-2 font-mono text-sm" onClick={() => { void navigator.clipboard.writeText(addr); setMsg('Address copied.'); }}>{short(addr)} <Copy size={14} /></Button>
                  : <Button type="button" className="sw-gold-btn mt-3 !px-4 !py-2 text-sm" onClick={() => void connect()}><Wallet size={14} /> Connect wallet</Button>}
            </div>
            <img src={walletArt} alt="BIXLINK wallet" className="sw-emblem sw-emblem-xl" />
          </div>
        </section>

        <div className="sw-quad mt-5">
          {ledger ? <>
            <Button className="sw-action" onClick={() => { setSendToken('BIX'); accountGo('accountsend'); }}><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><span className="min-w-0 text-center"><b className="block">Send</b></span></Button>
            <Button type="button" className="sw-action" onClick={() => accountGo('myid')}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><span className="min-w-0 text-center"><b className="block">Receive</b></span></Button>
            <Button className="sw-action" onClick={() => { setSendToken('BIX'); accountGo('scan'); }}><span className="sw-gold-dot"><ScanLine size={18} /></span><b>BIX PAY</b></Button>
            <Button className="sw-action" onClick={() => accountGo('history')}><span className="sw-gold-dot"><FileText size={18}/></span><b>History</b></Button>
          </> : <>
            <Button className="sw-action" onClick={() => void need('send')}><span className="sw-gold-dot"><ArrowUpRight size={18}/></span><b>Send</b></Button>
            <Button className="sw-action" onClick={() => void need('receive')}><span className="sw-gold-dot"><ArrowDownLeft size={18}/></span><b>Receive</b></Button>
            <BaseButton variant="wallet" size="wallet" asChild className="sw-action"><a href={addr ? `${SCAN}/address/${addr}` : SCAN} target="_blank" rel="noreferrer"><span className="sw-gold-dot"><Search size={18}/></span><b>Explorer</b></a></BaseButton>
            <Button className="sw-action" onClick={() => void addToken()}><span className="sw-gold-dot"><Plus size={18}/></span><b>Add BIX</b></Button>
          </>}
        </div>

        {ledger && member.user && <div className="sw-stake-strip mt-4"><ShieldCheck size={14}/><span>Active stakes</span><b>{member.data?.stakes.filter(s => s.status === 'active').length ?? 0}</b><small>Projection stays separate</small></div>}
        {!ledger && addr && <p className="sw-note">Portfolio 24h P&L unavailable without verified historical holdings.</p>}
        <div className="mt-5 flex items-center gap-2">
          <span className="sw-tab-pill">{ledger ? 'Account assets' : 'On-chain assets'}</span><span className="flex-1" />
          <Button type="button" className="sw-round" aria-label="Search market" onClick={() => setTab('market')}><Search size={16} /></Button>
          {ledger ? <Button className="sw-round" aria-label="Transaction history" onClick={() => accountGo('history')}><FileText size={16} /></Button>
            : <Button type="button" className="sw-round" aria-label="Add BIX token to wallet" onClick={() => void addToken()}><Plus size={16} /></Button>}
          <Button type="button" className="sw-round" aria-label="Refresh balances" onClick={() => (ledger ? void walletQ.refetch() : void load())}><RefreshCw size={16} /></Button>
        </div>

        <section key={`a-${mode}`} className="sw-fade mt-3 space-y-3" aria-label="Assets">
          {(ledger ? [
            { s: 'BIX', icon: <img src={foxMark} alt="" width={40} height={40} />, p: bixRef, c: null as number | null, v: member.user ? lBix : undefined, cls: 'sw-coin-bix', note: 'Internal ref.' },
            { s: 'USDT', icon: <b>₮</b>, p: 1, c: null as number | null, v: member.user ? lUsdt : undefined, cls: 'sw-coin-usdt', note: 'App balance' },
          ] : [
            { s: 'BIX', icon: <img src={foxMark} alt="" width={40} height={40} />, p: bixRef, c: null as number | null, v: bix ? bal?.bix : undefined, cls: 'sw-coin-bix', note: 'Internal ref.' },
            { s: 'USDT', icon: <b>₮</b>, p: 1, c: 0, v: bal?.usdt, cls: 'sw-coin-usdt', note: '' },
            { s: 'BNB', icon: <b>◆</b>, p: bnbP, c: px['BNB']?.c ?? null, v: bal?.bnb, cls: 'sw-coin-bnb', note: '' },
          ]).map((a) => <Button type="button" key={a.s} onClick={() => setAsset(a.s)} className="sw-row w-full text-left">
            <span className={`sw-coin ${a.cls}`}>{a.icon}</span>
            <div className="min-w-0 flex-1"><b className="block text-lg">{a.s}</b>
              <span className="sw-muted text-sm">{a.p ? `$${fmt(a.p, 4)}` : '—'}</span>{' '}
              {a.c !== null ? <span className={a.c >= 0 ? 'sw-up' : 'sw-down'}>{a.c >= 0 ? '+' : ''}{a.c.toFixed(2)}%</span> : <span className="sw-muted text-xs">{a.note}</span>}
            </div>
            <div className="text-right"><b className="numeric block text-lg">{hide ? '••••' : a.v === undefined ? '—' : fmt(a.v)}</b><small className="sw-muted">≈ {a.v === undefined ? '—' : money(a.v * a.p)}</small></div>
          </Button>)}
        </section>
        {!ledger && <CustomTokens addr={addr} node={getNode()} hide={hide} />}
        {msg && <p className="sw-note">{msg}</p>}
        {ledger && walletQ.isError && <p role="alert" className="sw-note">Balance unavailable. <Button className="sw-gold-text" onClick={() => void walletQ.refetch()}>Retry</Button></p>}
        <p className="sw-note">{ledger
          ? 'BIXLINK Account shows your app ledger: instant, gas-free transfers between BIX IDs. These balances are not on-chain tokens and staking profit shown elsewhere is a projection.'
          : 'Self-custody: your keys stay in your own wallet app. On-chain balances are separate from your BIXLINK app ledger. BIX value uses the internal reference, not a market price.'}</p>
      </>}

      {tab === 'market' && <MarketTerminal px={px} bixRef={bixRef} snapshot={snapshot} />}
      {tab === 'discover' && <DiscoverTab />}
      {tab === 'me' && <><AccountProfile addr={addr} go={s => setScreen(s as Screen)} disconnect={() => { setAddr(''); setBal(null); }} /><div className="mt-6"><InstallAppButton /></div></>}
    </main>

    <nav className="sw-dock" aria-label="Wallet navigation">
      {([['wallet', 'Wallet', Wallet], ['market', 'Market', BarChart3], ['discover', 'Discover', Compass], ['me', 'Me', User]] as const).map(([k, l, I]) =>
        <Button key={k} type="button" data-tone={k} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); window.scrollTo(0, 0); }}><span className="sw-dock-orb"><I size={20} /></span><span>{l}</span></Button>)}
    </nav>
  </div>;
}

function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return <header className="relative mb-6 flex items-center justify-center">
    <Button type="button" className="sw-round absolute left-0" aria-label="Back" onClick={onBack}><ChevronLeft size={20} /></Button>
    <b className="font-display text-xl">{title}</b>
    {right && <span className="absolute right-0">{right}</span>}
  </header>;
}

function SendScreen({ initialToken, addr, bix, bal, initialTo, onBack, onScan, onBook, onDone }: { initialToken: string; addr: string; bix: string; bal: { bix: number; usdt: number; bnb: number } | null; initialTo: string; onBack: () => void; onScan: () => void; onBook: () => void; onDone: () => void }) {
  const toks = bix ? ['BIX', 'USDT', 'BNB'] : ['USDT', 'BNB'];
  const [tok, setTok] = useState(toks.includes(initialToken) ? initialToken : (toks[0] ?? 'BNB'));
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(initialTo);
  const [amt, setAmt] = useState('');
  const [fee, setFee] = useState(0);
  const [state, setState] = useState('');
  const avail = bal ? (tok === 'BIX' ? bal.bix : tok === 'USDT' ? bal.usdt : bal.bnb) : 0;
  useEffect(() => { void rpc('eth_gasPrice', []).then((g) => setFee((Number(BigInt(g)) * (tok === 'BNB' ? 21000 : 65000)) / 1e18)).catch(() => setFee(0)); }, [tok]);
  const ok = isAddr(to) && /^\d+(\.\d+)?$/.test(amt) && Number(amt) > 0 && Number(amt) <= avail;
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!ok || sending) return;
    if (!window.confirm(`Send ${amt} ${tok} to ${to}? On-chain transfers cannot be reversed.`)) return;
    setSending(true);
    try {
      const w = (globalThis as unknown as { ethereum: Eth }).ethereum;
      if (!w) throw new Error('Wallet disconnected');
      const chain = await w.request({ method: 'eth_chainId' });
      if (chain !== '0x38') throw new Error('Switch your wallet to BNB Chain before sending.');
      const accounts = await w.request({ method: 'eth_accounts' });
      if (!accounts?.[0] || accounts[0].toLowerCase() !== addr.toLowerCase()) throw new Error('Wallet account changed. Reconnect first.');
      const tx = tok === 'BNB'
        ? { from: addr, to, value: '0x' + toWei(amt).toString(16) }
        : { from: addr, to: tok === 'BIX' ? bix : USDT, data: '0xa9059cbb' + to.slice(2).toLowerCase().padStart(64, '0') + toWei(amt).toString(16).padStart(64, '0') };
      const hash = await w.request({ method: 'eth_sendTransaction', params: [tx] });
      setState(`Submitted: ${hash}`); setTimeout(onDone, 6000);
    } catch (e) { setState(e instanceof Error ? e.message : 'Transaction cancelled or failed.'); } finally { setSending(false); }
  };
  return <>
    <TopBar title="Transfer" onBack={onBack} />
    <div className="flex items-center justify-between"><b className="sw-gold-text">Recipient address</b><Button type="button" className="sw-gold-text" onClick={onBook}>Address book</Button></div>
    <div className="sw-field mt-3 flex items-center gap-2">
      <input className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none" placeholder="Enter address 0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} />
      <Button type="button" aria-label="Paste address" onClick={() => void navigator.clipboard.readText().then((t) => setTo(t.trim())).catch(() => setState('Clipboard not available.'))}><ClipboardPaste size={20} /></Button>
      <Button type="button" aria-label="Scan QR" onClick={onScan}><ScanLine size={20} /></Button>
    </div>
    <div className="mt-6 flex items-center justify-between"><b className="sw-gold-text">Amount</b>
      <div className="relative"><Button type="button" className="sw-gold-btn !py-2 text-sm" onClick={() => setOpen(!open)}>{tok} <ChevronDown size={14} /></Button>
        {open && <div className="sw-menu">{toks.map((t) => <Button key={t} type="button" onClick={() => { setTok(t); setOpen(false); }}>{t}</Button>)}</div>}</div>
    </div>
    <div className="sw-field mt-3 !rounded-3xl !p-5">
      <div className="flex items-center gap-2"><input className="numeric min-w-0 flex-1 bg-transparent font-display text-4xl outline-none" inputMode="decimal" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <Button type="button" className="sw-gold-btn !py-2 text-sm" onClick={() => setAmt(String(tok === 'BNB' ? Math.max(0, avail - fee) : avail))}>Max</Button></div>
      <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm"><span className="sw-muted">Balance</span><span><span className="sw-up">{fmt(avail, 8)}</span> {tok}</span></div>
    </div>
    <b className="mt-6 block">Network fee</b>
    <div className="sw-field mt-3 flex justify-between text-sm"><span>Estimated network fee</span><span className="sw-up">{fmt(fee, 6)} BNB</span></div>
    {state && <p className="sw-note break-all">{state}</p>}
    <Button type="button" disabled={!ok || sending} className="sw-gold-btn mt-10 w-full justify-center !py-4 text-lg disabled:opacity-40" onClick={() => void send()}>{sending ? 'Submitting…' : 'Confirm'}</Button>
  </>;
}

function ReceiveScreen({ addr, onBack }: { addr: string; onBack: () => void }) {
  const [c, setC] = useState(false);
  return <>
    <TopBar title="Receive" onBack={onBack} />
    <section className="sw-panel">
      <p className="sw-gold-banner">This address only supports receiving BNB Smart Chain (BEP-20) assets: BIX, USDT and BNB.</p>
      <div className="sw-qr mx-auto mt-6"><QRCodeSVG value={addr} size={210} /></div>
      <b className="mt-6 block text-center text-lg">Receiving address</b>
      <p className="mt-2 break-all text-center font-mono text-sm">{addr}</p>
      <Button type="button" className="sw-gold-btn mx-auto mt-6 w-4/5 justify-center !py-3" onClick={() => { void navigator.clipboard.writeText(addr); setC(true); }}><Copy size={18} /> {c ? 'Copied' : 'Copy'}</Button>
    </section>
  </>;
}

function ScanScreen({ onBack, onResult }: { onBack: () => void; onResult: (v: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let alive = true;
    const BD = (globalThis as unknown as { BarcodeDetector?: new (o: unknown) => { detect: (s: unknown) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!alive || !video.current) { stream.getTracks().forEach(t => t.stop()); return; }
        video.current.srcObject = stream; await video.current.play();
        if (!BD) { setErr('Live scanning is not supported in this browser. Use My album.'); return; }
        const det = new BD({ formats: ['qr_code'] });
        const tick = async () => { if (!alive || !video.current) return; try { const r = await det.detect(video.current); if (r[0]) { onResult(r[0].rawValue); return; } } catch { /* frame */ } raf = requestAnimationFrame(() => void tick()); };
        void tick();
      } catch { setErr('Camera access was denied. Use My album instead.'); }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onResult]);
  const fromFile = async (f?: File) => {
    const BD = (globalThis as unknown as { BarcodeDetector?: new (o: unknown) => { detect: (s: unknown) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!f) return;
    if (!BD) {
      try { const { Html5Qrcode } = await import('html5-qrcode'); const reader = new Html5Qrcode('sw-file-reader'); const text = await reader.scanFile(f, false); reader.clear(); onResult(text); }
      catch { setErr('No QR code found in that image.'); }
      return;
    }
    try { const r = await new BD({ formats: ['qr_code'] }).detect(await createImageBitmap(f)); r[0] ? onResult(r[0].rawValue) : setErr('No QR code found in that image.'); } catch { setErr('Could not read that image.'); }
  };
  return <>
    <TopBar title="Scan" onBack={onBack} />
    <div className="sw-scan"><video ref={video} muted playsInline className="h-full w-full object-cover" /><span className="sw-scan-frame" aria-hidden /><Camera className="sw-scan-cam" size={28} aria-hidden /></div>
    {err && <p className="sw-note">{err}</p>}
    <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void fromFile(e.target.files?.[0])} />
    <div id="sw-file-reader" className="hidden" />
    <Button type="button" className="sw-action mx-auto mt-6 !w-auto !flex-row !px-8 !py-4" onClick={() => file.current?.click()}><ImageIcon size={20} /> <b>My album</b></Button>
  </>;
}

function BookScreen({ ledger, onBack, onPick }: { ledger: boolean; onBack: () => void; onPick: (a: string) => void }) {
  const [book, setBook] = useState<Book>([]);
  const [name, setName] = useState(''); const [a, setA] = useState('');
  useEffect(() => setBook(readBook().filter(b => !!parseWalletRecipient(b.address, ledger))), []);
  const save = (b: Book) => { setBook(b); localStorage.setItem('sov_book', JSON.stringify([...readBook().filter(e => !parseWalletRecipient(e.address, ledger)), ...b])); };
  return <>
    <TopBar title="Address book" onBack={onBack} />
    <div className="sw-panel space-y-2">
      <input className="sw-field w-full !py-3 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="sw-field w-full !py-3 font-mono text-sm" placeholder={ledger ? 'BIX-123456' : '0x…'} value={a} onChange={(e) => setA(e.target.value.trim())} />
      <Button type="button" disabled={!name || !parseWalletRecipient(a, ledger)} className="sw-gold-btn w-full justify-center disabled:opacity-40" onClick={() => { save([...book, { name, address: parseWalletRecipient(a, ledger) ?? a }]); setName(''); setA(''); }}><Plus size={16} /> Save address</Button>
    </div>
    <div className="mt-4 space-y-2">
      {book.length === 0 && <p className="sw-note text-center">No saved addresses yet.</p>}
      {book.map((e, i) => <div key={e.address + i} className="sw-row !py-3">
        <Button type="button" className="min-w-0 flex-1 text-left" onClick={() => onPick(e.address)}><b className="block">{e.name}</b><small className="sw-muted font-mono">{short(e.address)}</small></Button>
        <Button type="button" aria-label={`Delete ${e.name}`} onClick={() => save(book.filter((_, j) => j !== i))}><Trash2 size={16} /></Button>
      </div>)}
    </div>
  </>;
}

function NodeScreen({ onBack }: { onBack: () => void }) {
  const [cur, setCur] = useState((NODES[0] ?? 'https://bsc.publicnode.com'));
  const [ms, setMs] = useState<Record<string, number>>({});
  useEffect(() => {
    setCur(getNode());
    NODES.forEach((n) => { const t = performance.now(); void fetch(n, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' }).then(() => setMs((m) => ({ ...m, [n]: Math.round(performance.now() - t) }))).catch(() => setMs((m) => ({ ...m, [n]: -1 }))); });
  }, []);
  return <>
    <TopBar title="Node" onBack={onBack} />
    <div className="sw-panel !p-0">{NODES.map((n) => <Button key={n} type="button" className="sw-list-item w-full" aria-pressed={cur === n} onClick={() => { localStorage.setItem('sov_node', n); setCur(n); }}>
      <Network size={18} /><span className="min-w-0 flex-1 truncate text-left text-sm">{n.replace('https://', '')}</span>
      <small className={ms[n] === -1 ? 'sw-down' : 'sw-up'}>{ms[n] === undefined ? '…' : ms[n] === -1 ? 'offline' : `${ms[n]} ms`}</small>
      {cur === n && <span className="sw-gold-text">●</span>}
    </Button>)}</div>
  </>;
}

function InfoScreen({ title, onBack }: { title: string; onBack: () => void }) {
  return <>
    <TopBar title={title} onBack={onBack} />
    <div className="sw-panel space-y-3 text-sm">
      <p><b className="sw-gold-text">Self-custody.</b> Your recovery phrase and private key live only in TokenPocket, Trust Wallet or MetaMask. BIXLINK never asks for them.</p>
      <p><b className="sw-gold-text">Biometrics.</b> Turn on fingerprint / face lock inside your wallet app's security settings.</p>
      <p><b className="sw-gold-text">Verify.</b> Always check the BIX contract address on BscScan before sending or adding tokens.</p>
      <p><b className="sw-gold-text">Final.</b> Blockchain transfers cannot be reversed.</p>
    </div>
  </>;
}

function DiscoverTab() {
  const [q, setQ] = useState('');
  const groups: { title: string; items: { n: string; d: string; to: string; ext?: boolean; g: string }[] }[] = [
    { title: 'BIXLINK Ecosystem', items: [
      { n: 'BIXLINK App', d: 'Staking, network and ledger dashboard', to: '/dashboard', g: '🦊' },
      { n: 'BIX Presale', d: 'Presale stages and confirmation', to: '/presale', g: '💎' },
      { n: 'BIX Stake', d: 'Packages and staking history', to: '/stake', g: '🔒' },
      { n: 'Quantum Exchange', d: 'Demo trading terminal', to: '/quantum-exchange', g: '⚡' },
    ] },
    { title: 'Game-Fi', items: [{ n: 'Fox Arena', d: 'Missions and promo vBIX quests', to: '/arena', g: '🎮' }] },
    { title: 'Data & analytics', items: [
      { n: 'BscScan', d: 'BNB Chain explorer', to: 'https://bscscan.com', ext: true, g: '🔎' },
      { n: 'DeFiLlama', d: 'TVL, stablecoins and protocol data', to: 'https://defillama.com', ext: true, g: '🦙' },
      { n: 'CoinMarketCap', d: 'Market prices and rankings', to: 'https://coinmarketcap.com', ext: true, g: '📊' },
    ] },
  ];
  const go = () => { const v = q.trim(); if (!v) return; try { const url = new URL(v.includes('://') ? v : `https://${v}`); if (url.protocol !== 'https:') return; window.open(url.href, '_blank', 'noopener,noreferrer'); } catch { /* invalid URL */ } };
  return <>
    <section className="sw-panel sw-discover">
      <b className="font-display text-3xl">Discover</b>
      <p className="sw-muted mt-1 text-sm">Explore popular apps and on-chain services</p>
      <form className="sw-field mt-4 flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <Search size={18} className="sw-gold-text" /><input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search DApp or enter URL" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
    </section>
    {groups.map((g) => {
      const items = g.items.filter((i) => (i.n + i.d).toLowerCase().includes(q.toLowerCase()));
      if (!items.length) return null;
      return <section key={g.title} className="mt-6">
        <div className="mb-3 flex items-center justify-between"><b className="sw-section-title">{g.title}</b><span className="sw-count">{items.length}</span></div>
        <div className="space-y-3">{items.map((i) => {
          const inner = <><span className="sw-app-icon">{i.g}</span><span className="min-w-0 flex-1"><b className="block">{i.n}</b><small className="sw-muted block truncate">{i.d}</small></span><ChevronRight size={18} className="sw-muted" /></>;
          return i.ext ? <a key={i.n} href={i.to} target="_blank" rel="noreferrer" className="sw-row">{inner}</a> : <a key={i.n} href={i.to} target="_blank" rel="noreferrer" className="sw-row">{inner}</a>;
        })}</div>
      </section>;
    })}
  </>;
}

function MyIdScreen({ code, onBack }: { code: string; onBack: () => void }) {
  const [c, setC] = useState(false);
  return <>
    <TopBar title="Receive · BIX ID" onBack={onBack} />
    <section className="sw-panel">
      <p className="sw-gold-banner">Share this BIX ID to receive BIX instantly from other BIXLINK members. Gas-free, inside the BIXLINK ledger.</p>
      <div className="sw-qr mx-auto mt-6"><QRCodeSVG value={code || 'BIXLINK'} size={210} /></div>
      <b className="mt-6 block text-center font-display text-2xl tracking-widest">{code || '—'}</b>
      <Button type="button" className="sw-gold-btn mx-auto mt-6 w-4/5 justify-center !py-3" disabled={!code} onClick={() => { void navigator.clipboard.writeText(code); setC(true); }}><Copy size={18} /> {c ? 'Copied' : 'Copy BIX ID'}</Button>
    </section>
  </>;
}
