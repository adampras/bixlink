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
import { FLAG_CODE, LANGUAGES, useI18n } from '@/lib/i18n';
function Button(props: ButtonProps) { return <BaseButton variant="wallet" size="wallet" {...props} />; }
import { useServerFn } from '@tanstack/react-start';
import { getMyWallet } from '@/lib/bixlink.functions';
import { getFiatRates } from '@/lib/market.functions';
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
type Tab = 'wallet' | 'market' | 'trade' | 'discover' | 'me';
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
const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { maximumFractionDigits: d });
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
  const { t, language } = useI18n();
  const curLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];
  const [asset, setAsset] = useState<string | null>(null);
  const [mode, setMode] = useState<'ledger' | 'web3'>('ledger');
  const member = useMember();
  const { data: swCfg } = usePublicConfig();
  const fetchWallet = useServerFn(getMyWallet);
  const walletQ = useQuery({ queryKey: ['my-wallet', member.user?.id], queryFn: () => fetchWallet(), enabled: !!member.user, staleTime: 15_000, refetchInterval: 30_000 });
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
    return () => { clearInterval(timer); };
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
    return <div className="sw-app" data-wtheme={swCfg?.readiness.walletTheme ?? "gold"}><main className="sw-main grid min-h-[70vh] place-items-center text-center">
      <div><img src={walletArt} alt="BIXLINK wallet" className="sw-emblem sw-emblem-xl mx-auto" /><b className="mt-4 block font-display text-2xl">Wallet under maintenance</b><p className="sw-note">BIXLINK Wallet is temporarily closed by the owner. Your account balance is safe in the BIXLINK app.</p><a href="/wallet" className="sw-gold-btn mt-4 inline-flex px-5 py-2">Back to BIXLINK</a></div>
    </main></div>;
  }

  if (asset && !screen && ledger) {
    const p = asset === 'BIX' ? bixRef : 1;
    const v = member.user ? (asset === 'BIX' ? lBix : lUsdt) : undefined;
    return <div className="sw-app" data-wtheme={swCfg?.readiness.walletTheme ?? "gold"}><main className="sw-main">
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
    return <div className="sw-app" data-wtheme={swCfg?.readiness.walletTheme ?? "gold"}><main className="sw-main">
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
    return <div className="sw-app" data-wtheme={swCfg?.readiness.walletTheme ?? "gold"}><main className="sw-main">
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

  return <div className="sw-app" data-wtheme={swCfg?.readiness.walletTheme ?? "gold"}>
    <main className="sw-main pb-28">
      {tab === 'wallet' && <>
        <header className="flex items-center gap-3">
          <Button type="button" className="sw-round" aria-label="Back" onClick={() => { if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back(); else window.location.assign('/wallet'); }}><ChevronLeft size={20} /></Button>
          <span className="sw-avatar"><img src={foxMark} alt="" width={44} height={44} /></span>
          <div className="min-w-0 flex-1">
            <b className="block truncate font-display text-lg">{ledger ? (bixId ?? 'BIXLINK Account') : addr ? short(addr) : 'BIXLINK Wallet'}</b>
            <span className={`sw-pill ${ledger ? 'sw-pill-live' : ''}`}><i aria-hidden /> {ledger ? 'Ledger · Gasless · Zero fee' : `BSC · Gas ${gas === null ? '—' : fmt(gas, 3) + ' Gwei'}`}</span>
          </div>
          <Button type="button" className="sw-round" aria-label="Notifications" onClick={() => setScreen('notify')}><Bell size={18} /></Button>
          <Button type="button" className="sw-lang-pill" aria-label="Language" onClick={() => setScreen('language')}><span className={`flag-symbol flag-${curLang.flag}`} aria-hidden /><b>{FLAG_CODE[curLang.flag]}</b></Button>
        </header>

        <div className="sw-mode mt-5" role="tablist" aria-label="Wallet mode">
          <span className="sw-mode-thumb" data-pos={ledger ? 'l' : 'r'} aria-hidden />
          <Button type="button" role="tab" aria-selected={ledger} onClick={() => pickMode('ledger')}><Zap size={15} /> BIXLINK Account</Button>
          <Button type="button" role="tab" aria-selected={!ledger} onClick={() => pickMode('web3')}><Globe size={15} /> Web3 On-Chain</Button>
        </div>

        <div className="sw-divider" aria-hidden />
        <section key={mode} className="sw-wallet sw-fade" aria-label="Wallet balance">
          <LuxCardTrigger label={ledger ? 'ACCOUNT' : 'ON-CHAIN'} holder={ledger ? (bixId ?? 'BIXLINK MEMBER') : (addr ? short(addr) : 'WEB3 WALLET')} />
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
          <FiatStrip usd={ledger ? (member.user ? ledgerTotal : 0) : (addr && bal ? total : 0)} hide={hide} split={ledger && member.user && ledgerTotal > 0 ? (lBix * bixRef) / ledgerTotal : null} />
        </section>

        <div className="sw-quad mt-5">
          {ledger ? <>
            <Button className="sw-action" data-tone="gold" onClick={() => { setSendToken('BIX'); accountGo('accountsend'); }}><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><span className="min-w-0 text-center"><b className="block">Send</b></span></Button>
            <Button type="button" className="sw-action" data-tone="emerald" onClick={() => accountGo('myid')}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><span className="min-w-0 text-center"><b className="block">Receive</b></span></Button>
            <Button className="sw-action" data-tone="violet" onClick={() => { setSendToken('BIX'); accountGo('scan'); }}><span className="sw-gold-dot"><ScanLine size={18} /></span><b>BIX PAY</b></Button>
            <Button className="sw-action" data-tone="cyan" onClick={() => accountGo('history')}><span className="sw-gold-dot"><FileText size={18}/></span><b>History</b></Button>
          </> : <>
            <Button className="sw-action" data-tone="gold" onClick={() => void need('send')}><span className="sw-gold-dot"><ArrowUpRight size={18}/></span><b>Send</b></Button>
            <Button className="sw-action" data-tone="emerald" onClick={() => void need('receive')}><span className="sw-gold-dot"><ArrowDownLeft size={18}/></span><b>Receive</b></Button>
            <BaseButton variant="wallet" size="wallet" asChild className="sw-action" data-tone="violet"><a href={addr ? `${SCAN}/address/${addr}` : SCAN} target="_blank" rel="noreferrer"><span className="sw-gold-dot"><Search size={18}/></span><b>Explorer</b></a></BaseButton>
            <Button className="sw-action" data-tone="cyan" onClick={() => void addToken()}><span className="sw-gold-dot"><Plus size={18}/></span><b>Add BIX</b></Button>
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
      {tab === 'trade' && <TradeTab px={px} />}
      {tab === 'discover' && <DiscoverTab />}
      {tab === 'me' && <><AccountProfile addr={addr} go={s => setScreen(s as Screen)} disconnect={() => { setAddr(''); setBal(null); }} /><div className="mt-6"><InstallAppButton wallet /></div></>}
    </main>

    <nav className="sw-dock" aria-label="Wallet navigation">
      {([['wallet', 'Assets', Wallet], ['market', 'Market', BarChart3], ['trade', 'Trade', RefreshCw], ['discover', 'Discover', Globe], ['me', 'Me', User]] as const).map(([k, l, I]) =>
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

type DApp = { n: string; d: string; to: string; ext?: boolean; tone: string; icon: ReactNode; cat: string };
const DAPPS: DApp[] = [
  { n: 'BIXLINK App', d: 'Staking, network and ledger dashboard', to: '/dashboard', tone: 'gold', icon: <img src={foxMark} alt="" className="h-7 w-7 object-contain" />, cat: 'Ecosystem' },
  { n: 'BIX Presale', d: 'Presale stages and confirmation', to: '/presale', tone: 'cyan', icon: <Star size={22} />, cat: 'Ecosystem' },
  { n: 'BIX Stake', d: 'Packages and staking history', to: '/stake', tone: 'emerald', icon: <Shield size={22} />, cat: 'Ecosystem' },
  { n: 'Quantum Exchange', d: 'Demo trading terminal', to: '/quantum-exchange', tone: 'blue', icon: <Zap size={22} />, cat: 'Ecosystem' },
  { n: 'Fox Arena', d: 'Missions and promo vBIX quests', to: '/arena', tone: 'magenta', icon: <Compass size={22} />, cat: 'GameFi' },
  { n: 'PancakeSwap', d: 'BNB Chain DEX (external)', to: 'https://pancakeswap.finance', ext: true, tone: 'gold', icon: <RefreshCw size={22} />, cat: 'DeFi' },
  { n: 'BscScan', d: 'BNB Chain explorer', to: 'https://bscscan.com', ext: true, tone: 'gold', icon: <Search size={22} />, cat: 'Tools' },
  { n: 'DeFiLlama', d: 'TVL, stablecoins and protocol data', to: 'https://defillama.com', ext: true, tone: 'violet', icon: <BarChart3 size={22} />, cat: 'Tools' },
  { n: 'CoinMarketCap', d: 'Market prices and rankings', to: 'https://coinmarketcap.com', ext: true, tone: 'blue', icon: <BarChart3 size={22} />, cat: 'Tools' },
];
const CATS = ['All', 'Ecosystem', 'DeFi', 'GameFi', 'Tools'];

function toUrl(raw: string): string | null {
  const v = raw.trim(); if (!v) return null;
  if (v.startsWith('/')) return v;
  const looksUrl = /^[\w-]+(\.[\w-]+)+(\/|$)/.test(v) || v.includes('://');
  try {
    if (looksUrl) { const u = new URL(v.includes('://') ? v : `https://${v}`); return u.protocol === 'https:' ? u.href : null; }
    return `https://duckduckgo.com/?q=${encodeURIComponent(v)}`;
  } catch { return null; }
}

function DiscoverTab() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [hist, setHist] = useState<string[]>([]);
  const [idx, setIdx] = useState(-1);
  const [nonce, setNonce] = useState(0);
  const [marks, setMarks] = useState<string[]>([]);
  useEffect(() => { try { setMarks(JSON.parse(localStorage.getItem('sov-bookmarks') || '[]')); } catch { /* ignore */ } }, []);
  const cur = idx >= 0 ? hist[idx] : null;
  const open = (url: string) => { const h = [...hist.slice(0, idx + 1), url]; setHist(h); setIdx(h.length - 1); setQ(url.startsWith('/') ? `bixlink.com${url}` : url); };
  const toggleMark = () => { if (!cur) return; const m = marks.includes(cur) ? marks.filter(x => x !== cur) : [...marks, cur]; setMarks(m); localStorage.setItem('sov-bookmarks', JSON.stringify(m)); };
  const host = cur ? (cur.startsWith('/') ? 'bixlink.com' : new URL(cur).host) : '';
  const internal = !!cur?.startsWith('/');

  if (cur) return <section className="sw-browser" aria-label="In-app browser">
    <div className="sw-browser-bar">
      <Button aria-label="Back to Discover" className="sw-round sw-exit" onClick={() => { setIdx(-1); setHist([]); setQ(''); }}><ChevronLeft size={18} /></Button>
      <Button aria-label="Back" className="sw-round" disabled={idx <= 0} onClick={() => setIdx(idx - 1)}><ChevronLeft size={14} /></Button>
      <Button aria-label="Forward" className="sw-round" disabled={idx >= hist.length - 1} onClick={() => setIdx(idx + 1)}><ChevronRight size={16} /></Button>
      <form className="sw-omni" onSubmit={(e) => { e.preventDefault(); const u = toUrl(q); if (u) open(u); }}>
        <ShieldCheck size={14} className="sw-up flex-none" /><input aria-label="Address" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
      </form>
      <Button aria-label="Reload" className="sw-round" onClick={() => setNonce(nonce + 1)}><RefreshCw size={16} /></Button>
    </div>
    <div className="sw-browser-tools">
      <span className="sw-muted truncate text-xs">🔒 {host}</span><span className="flex-1" />
      <Button aria-label="Bookmark" className="sw-round" onClick={toggleMark}><Star size={15} className={marks.includes(cur) ? 'sw-gold-text' : ''} fill={marks.includes(cur) ? 'currentColor' : 'none'} /></Button>
      <BaseButton variant="wallet" size="wallet" asChild className="sw-round"><a aria-label="Open in external browser" href={cur} target="_blank" rel="noreferrer"><ArrowUpRight size={15} /></a></BaseButton>
      <Button aria-label="Close browser" className="sw-round" onClick={() => { setIdx(-1); setHist([]); setQ(''); }}><Trash2 size={15} /></Button>
    </div>
    <iframe key={`${cur}-${nonce}`} src={cur} title={host} className="sw-browser-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" />
    {!internal && <p className="sw-note sw-browser-note">Some websites block in-app viewing. If the page stays blank, tap ↗ to open it in your browser.</p>}
  </section>;

  return <DiscoverHome q={q} setQ={setQ} cat={cat} setCat={setCat} marks={marks} open={open} />;
}

const BANNERS = [
  { t: 'Sovereign Web3, powered by BIXLINK', s: 'Browse BNB Chain DApps in one secure wallet', to: '/dashboard' },
  { t: 'BIX Presale is live', s: 'Review stages and confirm in-app', to: '/presale' },
  { t: 'Fox Arena missions', s: 'Play quests for promo vBIX rewards', to: '/arena' },
  { t: 'Stake with projections', s: 'Choose a package and duration', to: '/stake' },
];

function DiscoverHome({ q, setQ, cat, setCat, marks, open }: { q: string; setQ: (v: string) => void; cat: string; setCat: (v: string) => void; marks: string[]; open: (u: string) => void }) {
  const [b, setB] = useState(0);
  const [view, setView] = useState<'Trend' | 'Explorer' | 'Favorites'>('Trend');
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const t = setInterval(() => setB(x => (x + 1) % BANNERS.length), 4500); return () => clearInterval(t); }, []);
  const list = DAPPS.filter(i => (cat === 'All' || i.cat === cat) && (i.n + i.d).toLowerCase().includes(q.toLowerCase()));
  const fav = DAPPS.filter(d => marks.includes(d.to));
  const banner = BANNERS[b]!;
  const go = (e: React.FormEvent) => { e.preventDefault(); const u = toUrl(q); if (u) open(u); };
  return <div className="tp-discover">
    <form className="tp-search" onSubmit={go}>
      <Search size={18} className="sw-muted" /><input aria-label="Search DApps or URL" placeholder="Search Tokens, DApps, or URL" value={q} onChange={(e) => setQ(e.target.value)} />
      <span className="tp-tabs-count" aria-label="Bookmarks">{marks.length}</span>
    </form>
    <button type="button" className="tp-banner" onClick={() => open(banner.to)}>
      <b>{banner.t}</b><small>{banner.s}</small>
      <img src={foxMark} alt="" className="tp-banner-mark" />
      <span className="tp-dots">{BANNERS.map((_, k) => <i key={k} data-on={k === b} />)}</span>
    </button>
    <div className="tp-seg">{(['Trend', 'Explorer', 'Favorites'] as const).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v}</button>)}</div>
    {view === 'Trend' && <div className="tp-grid">{DAPPS.filter(d => d.n.toLowerCase().includes(q.toLowerCase())).map(i => <button key={i.n} type="button" onClick={() => open(i.to)}><span className="sw-app-icon" data-tone={i.tone}>{i.icon}</span><small>{i.n}</small></button>)}</div>}
    {view === 'Explorer' && <>
      <div className="sw-cats">{CATS.map(c => <Button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</Button>)}</div>
      <div className="mt-3 space-y-2">{list.map(i => <button type="button" key={i.n} className="tp-row" onClick={() => open(i.to)}>
        <span className="sw-app-icon" data-tone={i.tone}>{i.icon}</span>
        <span className="min-w-0 flex-1 text-left"><b className="block">{i.n}</b><small className="sw-muted block truncate">{i.d}</small></span>
        {i.ext && <em className="tp-tag">WEB3</em>}<ChevronRight size={16} className="sw-muted" />
      </button>)}</div>
    </>}
    {view === 'Favorites' && (marks.length ? <div className="space-y-2">{marks.map(m => <button type="button" key={m} className="tp-row" onClick={() => open(m)}><Star size={16} className="sw-gold-text" /><span className="flex-1 truncate text-left">{fav.find(f => f.to === m)?.n ?? (m.startsWith('/') ? `bixlink.com${m}` : new URL(m).host)}</span><ChevronRight size={16} className="sw-muted" /></button>)}</div>
      : <p className="sw-note">Tap ★ inside the browser to save favorites.</p>)}
    <div className="tp-promos">
      <button type="button" onClick={() => open('/stake')}><b>Stake BIX</b><small>Projected yield packages</small></button>
      <button type="button" onClick={() => open('https://bscscan.com')}><b>Verify on-chain</b><small>BscScan explorer</small></button>
    </div>
    <div className="tp-earn">
      <div className="flex items-center justify-between"><b>Earn</b><button type="button" className="sw-muted text-xs" onClick={() => setView('Explorer')}>More ›</button></div>
      {DAPPS.filter(d => ['BIX Stake', 'PancakeSwap', 'DeFiLlama'].includes(d.n)).map(i => <button type="button" key={i.n} className="tp-row" onClick={() => open(i.to)}><span className="sw-app-icon" data-tone={i.tone}>{i.icon}</span><span className="min-w-0 flex-1 text-left"><b className="block">{i.n}</b><small className="sw-muted block truncate">{i.d}</small></span><em className="tp-tag">HOT</em></button>)}
      <p className="sw-note">External DApps are third-party. Yields shown anywhere are projections; always verify contracts.</p>
    </div>
  </div>;
}

const SWAP_TOKENS: Record<string, string> = { BNB: 'BNB', USDT: USDT, BTC: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8' };
function TradeTab({ px }: { px: Record<string, { p: number; c: number }> }) {
  const [from, setFrom] = useState('USDT');
  const [to, setTo] = useState('BNB');
  const [amt, setAmt] = useState('');
  const [slip, setSlip] = useState(2);
  const price = (s: string) => (s === 'USDT' ? 1 : px[s]?.p ?? 0);
  const n = Number(amt) || 0;
  const est = price(to) ? (n * price(from)) / price(to) : 0;
  const ready = n > 0 && from !== to && est > 0;
  const url = `https://pancakeswap.finance/swap?chain=bsc&inputCurrency=${SWAP_TOKENS[from]}&outputCurrency=${SWAP_TOKENS[to]}${n ? `&exactAmount=${n}&exactField=input` : ''}`;
  const sel = (v: string, set: (s: string) => void) => <select aria-label="Token" value={v} onChange={(e) => set(e.target.value)} className="tp-token">{Object.keys(SWAP_TOKENS).map(k => <option key={k}>{k}</option>)}</select>;
  return <div className="tp-trade">
    <div className="tp-seg"><button type="button" aria-pressed>Swap & Bridge</button></div>
    <section className="sw-panel space-y-3">
      <small className="sw-muted">From</small>
      <div className="tp-swap-box">{sel(from, setFrom)}<input inputMode="decimal" aria-label="Amount" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} /></div>
      <button type="button" className="tp-flip" aria-label="Flip tokens" onClick={() => { setFrom(to); setTo(from); }}><RefreshCw size={16} /></button>
      <small className="sw-muted">To (estimated)</small>
      <div className="tp-swap-box">{sel(to, setTo)}<b className="numeric">{est ? fmt(est, 6) : '—'}</b></div>
      <dl className="tp-quote">
        <div><dt>Swap rate</dt><dd>{ready ? `1 ${from} ≈ ${fmt(price(from) / price(to), 6)} ${to}` : '—'}</dd></div>
        <div><dt>Min receive</dt><dd>{ready ? `${fmt(est * (1 - slip / 100), 6)} ${to}` : '—'}</dd></div>
        <div><dt>Slippage</dt><dd className="flex gap-1">{[0.5, 1, 2].map(s => <button type="button" key={s} aria-pressed={slip === s} className="tp-chip" onClick={() => setSlip(s)}>{s}%</button>)}</dd></div>
        <div><dt>Route</dt><dd>PancakeSwap · BNB Chain</dd></div>
      </dl>
      <BaseButton variant="wallet" size="wallet" asChild className="sw-gold-btn w-full justify-center !py-3" aria-disabled={!ready}>
        <a href={ready ? url : undefined} target="_blank" rel="noreferrer">{ready ? 'Continue in your wallet ↗' : 'Enter an amount'}</a>
      </BaseButton>
      <p className="sw-note">Estimate uses live public prices. The swap is signed in your own Web3 wallet on PancakeSwap; BIXLINK never holds your keys. BIX is not listed on a DEX — use BIX PAY for BIX.</p>
    </section>
  </div>;
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

function FiatStrip({ usd, hide, split }: { usd: number; hide: boolean; split: number | null }) {
  const fetchFiat = useServerFn(getFiatRates);
  const fx = useQuery({ queryKey: ['wallet-fiat-rates'], queryFn: () => fetchFiat(), staleTime: 3_600_000 });
  const rows = (fx.data ?? []).filter(r => ['IDR', 'MYR', 'CNY', 'SGD', 'AED', 'INR'].includes(r.code));
  return <div className="sw-fx" aria-label="Currency conversions">
    <div className="sw-fx-row">{rows.length ? rows.map(r => <span key={r.code}><small>{r.code}</small><b className="numeric">{hide ? '••••' : (usd * r.rate).toLocaleString('en-US', { maximumFractionDigits: r.code === 'IDR' || r.code === 'INR' ? 0 : 2 })}</b></span>)
      : Array.from({ length: 4 }, (_, k) => <span key={k} className="sw-skeleton inline-block h-6 w-20" />)}</div>
    {split !== null && <small className="sw-muted block text-[.65rem]">BIX {(split * 100).toFixed(1)}% · USDT {((1 - split) * 100).toFixed(1)}% · reference rates, display only</small>}
  </div>;
}

function LuxCardTrigger({ label, holder }: { label: string; holder: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => { timer.current = setTimeout(() => { setOpen(true); navigator.vibrate?.(30); }, 500); };
  const stop = () => { if (timer.current) clearTimeout(timer.current); };
  return <>
    <div className="sw-wallet-card select-none" role="button" tabIndex={0} aria-label="Hold to reveal BIXLINK LUX card" title="Press and hold"
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onContextMenu={e => e.preventDefault()}
      onKeyDown={e => { if (e.key === 'Enter') setOpen(true); }}><span>BIXLINK</span><small>{label}</small></div>
    {open && <div className="sw-lux-overlay select-none" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} role="dialog" aria-modal="true" aria-label="BIXLINK LUX card" onClick={() => setOpen(false)} onContextMenu={e => e.preventDefault()} onCopy={e => e.preventDefault()}>
      <div className="sw-lux-card [&_*]:pointer-events-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between"><b className="font-display tracking-[.3em]">BIXLINK LUX</b><small>APPS WALLET</small></div>
        <span className="sw-lux-chip" aria-hidden />
        <p className="font-mono tracking-[.25em]">•••• •••• •••• 2026</p>
        <div className="flex items-end justify-between"><div><small className="block opacity-70">CARD HOLDER</small><b className="font-mono text-sm">{holder}</b></div><span className="sw-lux-rings" aria-hidden><i /><i /></span></div>
      </div>
      <small className="sw-lux-hint">Digital identity card · not a payment card · tap to close</small>
    </div>}
  </>;
}
