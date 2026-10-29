import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowDownLeft, ArrowUpRight, Bell, BarChart3, Camera, ChevronDown, ChevronLeft, ChevronRight, ClipboardPaste, Compass,
  Copy, Eye, EyeOff, Globe, ImageIcon, Languages, Moon, Network, Plus, ScanLine, Search, Shield, SlidersHorizontal, Star,
  Trash2, User, Wallet, FileText, Download, Zap, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMember } from '@/lib/useMember';
import { useQuery } from '@tanstack/react-query';
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

type Eth = { request: (a: { method: string; params?: unknown }) => Promise<any> };
type Tab = 'wallet' | 'market' | 'discover' | 'me';
type Screen = null | 'myid' | 'send' | 'receive' | 'scan' | 'book' | 'node' | 'security' | 'notify';
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const NODES = ['https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.defibit.io', 'https://bsc-dataseed1.ninicoin.io', 'https://bsc.publicnode.com'];
const SCAN = 'https://bscscan.com';
const getNode = () => (typeof localStorage !== 'undefined' && localStorage.getItem('sov_node')) || NODES[0]!;

async function rpc(method: string, params: unknown[]) {
  const r = await fetch(getNode(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return ((await r.json()) as { result?: string }).result ?? '0x0';
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
  const [hide, setHide] = useState(false);
  const [msg, setMsg] = useState('');
  const [prefillTo, setPrefillTo] = useState('');
  const [bixRef, setBixRef] = useState(0);
  const [asset, setAsset] = useState<string | null>(null);
  const [mode, setMode] = useState<'ledger' | 'web3'>('ledger');
  const member = useMember();
  const fetchWallet = useServerFn(getMyWallet);
  const walletQ = useQuery({ queryKey: ['my-wallet', member.user?.id], queryFn: () => fetchWallet(), enabled: !!member.user, staleTime: 15_000 });
  useEffect(() => { const s = localStorage.getItem('sov_mode'); if (s === 'web3' || s === 'ledger') setMode(s); }, []);
  const pickMode = (m: 'ledger' | 'web3') => { setMode(m); setMsg(''); localStorage.setItem('sov_mode', m); };
  const eth = () => (globalThis as unknown as { ethereum?: Eth }).ethereum;

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prev = link?.href;
    if (link) link.href = '/sovereign.webmanifest';
    void supabase.from('app_settings').select('value').eq('key', 'bix_token').maybeSingle().then(({ data }) => setBix(((data?.value as { address?: string }) ?? {}).address ?? ''));
    void supabase.from('app_settings').select('value').eq('key', 'bix_market').maybeSingle().then(({ data }) => {
      const n = Number((data?.value as { priceUsd?: number } | null)?.priceUsd ?? 0.84291);
      setBixRef(n > 0 ? n : 0.84291);
    });
    void (async () => {
      try {
        const syms = ['BNBUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'TRXUSDT', 'TONUSDT', 'LINKUSDT'];
        const r = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`);
        const j = (await r.json()) as { symbol: string; lastPrice: string; priceChangePercent: string }[];
        const m: Record<string, { p: number; c: number }> = {};
        j.forEach((t) => { m[t.symbol.replace('USDT', '')] = { p: Number(t.lastPrice), c: Number(t.priceChangePercent) }; });
        setPx(m);
      } catch { /* offline */ }
    })();
    return () => { if (link && prev) link.href = prev; };
  }, []);

  const load = async (a = addr) => {
    if (!a) return;
    try {
      const [b, u, n] = await Promise.all([bix ? balOf(bix, a) : 0, balOf(USDT, a), rpc('eth_getBalance', [a, 'latest'])]);
      setBal({ bix: b, usdt: u, bnb: toNum(n) }); setMsg('');
    } catch { setMsg('Could not reach BNB Chain. Try another node in Me → Node.'); }
  };
  useEffect(() => { if (addr) void load(addr); }, [addr, bix]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    const w = eth();
    if (!w) { setMsg('Open this page inside TokenPocket, Trust Wallet or MetaMask to connect your wallet.'); return false; }
    try {
      try { await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] }); } catch { /* already on BSC */ }
      const [a] = await w.request({ method: 'eth_requestAccounts' }); setAddr(a); return true;
    } catch { setMsg('Connection cancelled.'); return false; }
  };
  const need = async (s: Screen) => { if (addr || (await connect())) setScreen(s); };
  const addToken = async () => {
    if (!bix) return setMsg('BIX contract is not published yet.');
    try { await eth()?.request({ method: 'wallet_watchAsset', params: { type: 'ERC20', options: { address: bix, symbol: 'BIX', decimals: 18 } } }); } catch { setMsg('Token was not added.'); }
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
        <Link to={asset === 'BIX' ? '/pay' : '/transfer'} className="sw-action"><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><b>Send</b></Link>
        <button type="button" className="sw-action" onClick={() => { setAsset(null); if (member.user) setScreen('myid'); }}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><b>Receive</b></button>
        <Link to="/wallet" className="sw-action"><span className="sw-gold-dot"><FileText size={18} /></span><b>History</b></Link>
      </div>
      {asset === 'USDT' && <Link to="/wallet" className="sw-gold-btn mt-4 w-full justify-center"><Plus size={16} /> Deposit USDT</Link>}
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
      <Spark sym={asset === 'BNB' ? 'BNBUSDT' : null} flat={asset !== 'BNB'} />
      <div className="mt-5 grid grid-cols-3 gap-2">
        <button type="button" className="sw-action" onClick={() => { setAsset(null); void need('send'); }}><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><b>Send</b></button>
        <button type="button" className="sw-action" onClick={() => { setAsset(null); void need('receive'); }}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><b>Receive</b></button>
        <a className="sw-action" href={url} target="_blank" rel="noreferrer"><span className="sw-gold-dot"><Search size={18} /></span><b>Explorer</b></a>
      </div>
      {asset === 'BIX' && <button type="button" className="sw-gold-btn mt-4 w-full" onClick={() => void addToken()}><Plus size={16} /> Add BIX to wallet</button>}
      <p className="sw-note">{asset === 'BIX' ? 'BIX value uses the BIXLINK internal reference, not a traded market price.' : asset === 'USDT' ? 'USDT BEP-20 on BNB Chain.' : 'BNB is used for network fees on BNB Chain.'}</p>
      {msg && <p className="sw-note">{msg}</p>}
    </main></div>;
  }

  if (screen) {
    return <div className="sw-app"><main className="sw-main">
      {screen === 'send' && <SendScreen addr={addr} bix={bix} bal={bal} initialTo={prefillTo} onBack={() => { setScreen(null); setPrefillTo(''); }} onScan={() => setScreen('scan')} onBook={() => setScreen('book')} onDone={() => void load()} />}
      {screen === 'myid' && <MyIdScreen code={bixId ?? ''} onBack={() => setScreen(null)} />}
      {screen === 'receive' && <ReceiveScreen addr={addr} onBack={() => setScreen(null)} />}
      {screen === 'scan' && <ScanScreen onBack={() => setScreen(null)} onResult={(v) => { const m = v.match(/0x[a-fA-F0-9]{40}/); if (m) { setPrefillTo(m[0]); setScreen('send'); } else setMsg('QR code does not contain a BNB Chain address.'); }} />}
      {screen === 'book' && <BookScreen onBack={() => setScreen(prefillTo === '' && addr ? 'send' : null)} onPick={(a) => { setPrefillTo(a); setScreen('send'); }} />}
      {screen === 'node' && <NodeScreen onBack={() => { setScreen(null); void load(); }} />}
      {screen === 'security' && <InfoScreen title="Security & verification" onBack={() => setScreen(null)} />}
      {screen === 'notify' && <NotifyScreen onBack={() => setScreen(null)} />}
    </main></div>;
  }

  return <div className="sw-app">
    <main className="sw-main pb-28">
      {tab === 'wallet' && <>
        <header className="flex items-center gap-3">
          <span className="sw-avatar"><img src={foxMark} alt="" width={44} height={44} /></span>
          <div className="min-w-0 flex-1">
            <b className="block truncate font-display text-lg">{ledger ? (bixId ?? 'BIXLINK Account') : addr ? short(addr) : 'BIXLINK Wallet'}</b>
            <span className={`sw-pill ${ledger ? 'sw-pill-live' : ''}`}><i aria-hidden /> {ledger ? 'Internal ledger' : 'BSC Mainnet'}</span>
          </div>
          <button type="button" className="sw-round" aria-label="Notifications" onClick={() => setScreen('notify')}><Bell size={18} /></button>
          <Link to="/settings" className="sw-round" aria-label="Language"><Globe size={18} /></Link>
        </header>

        <div className="sw-mode mt-5" role="tablist" aria-label="Wallet mode">
          <span className="sw-mode-thumb" data-pos={ledger ? 'l' : 'r'} aria-hidden />
          <button type="button" role="tab" aria-selected={ledger} onClick={() => pickMode('ledger')}><Zap size={15} /> BIXLINK Account</button>
          <button type="button" role="tab" aria-selected={!ledger} onClick={() => pickMode('web3')}><Globe size={15} /> Web3 On-Chain</button>
        </div>

        <section key={mode} className="sw-wallet sw-fade mt-4" aria-label="Wallet balance">
          <div className="sw-wallet-card"><span>BIXLINK</span><small>{ledger ? 'ACCOUNT' : 'ON-CHAIN'}</small></div>
          <div className="sw-wallet-pocket">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="sw-chip">{ledger ? <><ShieldCheck size={13} /> Gasless</> : <><Network size={13} /> BEP-20</>}</span><small className="sw-muted">Total assets</small></div>
              <div className="mt-2 flex items-center gap-2">
                <b className="numeric font-display text-3xl">{ledger ? (member.user ? money(ledgerTotal) : '$0.00') : addr ? (bal ? money(total) : '…') : '$0.00'}</b>
                <button type="button" aria-label={hide ? 'Show balance' : 'Hide balance'} onClick={() => setHide(!hide)} className="sw-muted">{hide ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              {ledger
                ? (member.user
                  ? <button type="button" className="sw-muted mt-3 flex items-center gap-2 font-mono text-sm" onClick={() => { if (bixId) { void navigator.clipboard.writeText(bixId); setMsg('BIX ID copied.'); } }}>{bixId ?? '…'} <Copy size={14} /></button>
                  : <Link to="/auth" className="sw-gold-btn mt-3 !px-4 !py-2 text-sm"><User size={14} /> Sign in</Link>)
                : addr ? <button type="button" className="sw-muted mt-3 flex items-center gap-2 font-mono text-sm" onClick={() => { void navigator.clipboard.writeText(addr); setMsg('Address copied.'); }}>{short(addr)} <Copy size={14} /></button>
                  : <button type="button" className="sw-gold-btn mt-3 !px-4 !py-2 text-sm" onClick={() => void connect()}><Wallet size={14} /> Connect wallet</button>}
            </div>
            <img src={walletArt} alt="BIXLINK wallet" className="sw-emblem sw-emblem-xl" />
          </div>
        </section>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {ledger ? <>
            <Link to="/pay" className="sw-action"><span className="sw-gold-dot"><ArrowUpRight size={18} /></span><span className="min-w-0 text-center"><b className="block truncate">Transfer</b><small className="sw-muted block truncate">BIX PAY</small></span></Link>
            <button type="button" className="sw-action" onClick={() => (member.user ? setScreen('myid') : setMsg('Sign in to show your BIX ID.'))}><span className="sw-gold-dot"><ArrowDownLeft size={18} /></span><span className="min-w-0 text-center"><b className="block truncate">Receive</b><small className="sw-muted block truncate">My BIX ID</small></span></button>
            <Link to="/pay" className="sw-action"><span className="sw-gold-dot"><ScanLine size={18} /></span><span className="min-w-0 text-center"><b className="block truncate">Scan</b><small className="sw-muted block truncate">Pay by QR</small></span></Link>
          </> : ([['send', 'Transfer', 'Send crypto', ArrowUpRight], ['receive', 'Receive', 'Get crypto', ArrowDownLeft], ['scan', 'Scan', 'QR code', ScanLine]] as const).map(([s, t, d, I]) =>
            <button key={s} type="button" className="sw-action" onClick={() => (s === 'scan' ? setScreen('scan') : void need(s))}>
              <span className="sw-gold-dot"><I size={18} /></span><span className="min-w-0 text-center"><b className="block truncate">{t}</b><small className="sw-muted block truncate">{d}</small></span>
            </button>)}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="sw-tab-pill">{ledger ? 'Account assets' : 'On-chain assets'}</span><span className="flex-1" />
          <button type="button" className="sw-round" aria-label="Search market" onClick={() => setTab('market')}><Search size={16} /></button>
          {ledger ? <Link to="/wallet" className="sw-round" aria-label="Transaction history"><FileText size={16} /></Link>
            : <button type="button" className="sw-round" aria-label="Add BIX token to wallet" onClick={() => void addToken()}><Plus size={16} /></button>}
          <button type="button" className="sw-round" aria-label="Refresh balances" onClick={() => (ledger ? void member.refetch() : void load())}><RefreshCw size={16} /></button>
        </div>

        <section key={`a-${mode}`} className="sw-fade mt-3 space-y-3" aria-label="Assets">
          {(ledger ? [
            { s: 'BIX', icon: <img src={foxMark} alt="" width={40} height={40} />, p: bixRef, c: null as number | null, v: member.user ? lBix : undefined, cls: 'sw-coin-bix', note: 'Internal ref.' },
            { s: 'USDT', icon: <b>₮</b>, p: 1, c: null as number | null, v: member.user ? lUsdt : undefined, cls: 'sw-coin-usdt', note: 'App balance' },
          ] : [
            { s: 'BIX', icon: <img src={foxMark} alt="" width={40} height={40} />, p: bixRef, c: null as number | null, v: bix ? bal?.bix : undefined, cls: 'sw-coin-bix', note: 'Internal ref.' },
            { s: 'USDT', icon: <b>₮</b>, p: 1, c: 0, v: bal?.usdt, cls: 'sw-coin-usdt', note: '' },
            { s: 'BNB', icon: <b>◆</b>, p: bnbP, c: px['BNB']?.c ?? null, v: bal?.bnb, cls: 'sw-coin-bnb', note: '' },
          ]).map((a) => <button type="button" key={a.s} onClick={() => setAsset(a.s)} className="sw-row w-full text-left">
            <span className={`sw-coin ${a.cls}`}>{a.icon}</span>
            <div className="min-w-0 flex-1"><b className="block text-lg">{a.s}</b>
              <span className="sw-muted text-sm">{a.p ? `$${fmt(a.p, 4)}` : '—'}</span>{' '}
              {a.c !== null ? <span className={a.c >= 0 ? 'sw-up' : 'sw-down'}>{a.c >= 0 ? '+' : ''}{a.c.toFixed(2)}%</span> : <span className="sw-muted text-xs">{a.note}</span>}
            </div>
            <div className="text-right"><b className="numeric block text-lg">{hide ? '••••' : a.v === undefined ? '—' : fmt(a.v)}</b><small className="sw-muted">≈ {a.v === undefined ? '—' : money(a.v * a.p)}</small></div>
          </button>)}
        </section>
        {msg && <p className="sw-note">{msg}</p>}
        <p className="sw-note">{ledger
          ? 'BIXLINK Account shows your app ledger: instant, gas-free transfers between BIX IDs. These balances are not on-chain tokens and staking profit shown elsewhere is a projection.'
          : 'Self-custody: your keys stay in your own wallet app. On-chain balances are separate from your BIXLINK app ledger. BIX value uses the internal reference, not a market price.'}</p>
      </>}

      {tab === 'market' && <MarketTab px={px} bixRef={bixRef} />}
      {tab === 'discover' && <DiscoverTab />}
      {tab === 'me' && <MeTab addr={addr} go={setScreen} />}
    </main>

    <nav className="sw-dock" aria-label="Wallet navigation">
      {([['wallet', 'Wallet', Wallet], ['market', 'Market', BarChart3], ['discover', 'Discover', Compass], ['me', 'Me', User]] as const).map(([k, l, I]) =>
        <button key={k} type="button" data-tone={k} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); window.scrollTo(0, 0); }}><span className="sw-dock-orb"><I size={20} /></span><span>{l}</span></button>)}
    </nav>
  </div>;
}

function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return <header className="relative mb-6 flex items-center justify-center">
    <button type="button" className="sw-round absolute left-0" aria-label="Back" onClick={onBack}><ChevronLeft size={20} /></button>
    <b className="font-display text-xl">{title}</b>
    {right && <span className="absolute right-0">{right}</span>}
  </header>;
}

function SendScreen({ addr, bix, bal, initialTo, onBack, onScan, onBook, onDone }: { addr: string; bix: string; bal: { bix: number; usdt: number; bnb: number } | null; initialTo: string; onBack: () => void; onScan: () => void; onBook: () => void; onDone: () => void }) {
  const toks = bix ? ['BIX', 'USDT', 'BNB'] : ['USDT', 'BNB'];
  const [tok, setTok] = useState(toks[0]);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(initialTo);
  const [amt, setAmt] = useState('');
  const [fee, setFee] = useState(0);
  const [state, setState] = useState('');
  const avail = bal ? (tok === 'BIX' ? bal.bix : tok === 'USDT' ? bal.usdt : bal.bnb) : 0;
  useEffect(() => { void rpc('eth_gasPrice', []).then((g) => setFee((Number(BigInt(g)) * (tok === 'BNB' ? 21000 : 65000)) / 1e18)).catch(() => setFee(0)); }, [tok]);
  const ok = isAddr(to) && /^\d+(\.\d+)?$/.test(amt) && Number(amt) > 0 && Number(amt) <= avail;
  const send = async () => {
    if (!ok) return;
    if (!window.confirm(`Send ${amt} ${tok} to ${to}? On-chain transfers cannot be reversed.`)) return;
    try {
      const w = (globalThis as unknown as { ethereum: Eth }).ethereum;
      const tx = tok === 'BNB'
        ? { from: addr, to, value: '0x' + toWei(amt).toString(16) }
        : { from: addr, to: tok === 'BIX' ? bix : USDT, data: '0xa9059cbb' + to.slice(2).toLowerCase().padStart(64, '0') + toWei(amt).toString(16).padStart(64, '0') };
      const hash = await w.request({ method: 'eth_sendTransaction', params: [tx] });
      setState(`Submitted: ${hash}`); setTimeout(onDone, 6000);
    } catch { setState('Transaction cancelled or failed.'); }
  };
  return <>
    <TopBar title="Transfer" onBack={onBack} />
    <div className="flex items-center justify-between"><b className="sw-gold-text">Recipient address</b><button type="button" className="sw-gold-text" onClick={onBook}>Address book</button></div>
    <div className="sw-field mt-3 flex items-center gap-2">
      <input className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none" placeholder="Enter address 0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} />
      <button type="button" aria-label="Paste address" onClick={() => void navigator.clipboard.readText().then((t) => setTo(t.trim())).catch(() => setState('Clipboard not available.'))}><ClipboardPaste size={20} /></button>
      <button type="button" aria-label="Scan QR" onClick={onScan}><ScanLine size={20} /></button>
    </div>
    <div className="mt-6 flex items-center justify-between"><b className="sw-gold-text">Amount</b>
      <div className="relative"><button type="button" className="sw-gold-btn !py-2 text-sm" onClick={() => setOpen(!open)}>{tok} <ChevronDown size={14} /></button>
        {open && <div className="sw-menu">{toks.map((t) => <button key={t} type="button" onClick={() => { setTok(t); setOpen(false); }}>{t}</button>)}</div>}</div>
    </div>
    <div className="sw-field mt-3 !rounded-3xl !p-5">
      <div className="flex items-center gap-2"><input className="numeric min-w-0 flex-1 bg-transparent font-display text-4xl outline-none" inputMode="decimal" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <button type="button" className="sw-gold-btn !py-2 text-sm" onClick={() => setAmt(String(tok === 'BNB' ? Math.max(0, avail - fee) : avail))}>Max</button></div>
      <div className="mt-4 flex justify-between border-t border-border pt-4 text-sm"><span className="sw-muted">Balance</span><span><span className="sw-up">{fmt(avail, 8)}</span> {tok}</span></div>
    </div>
    <b className="mt-6 block">Network fee</b>
    <div className="sw-field mt-3 flex justify-between text-sm"><span>Estimated network fee</span><span className="sw-up">{fmt(fee, 6)} BNB</span></div>
    {state && <p className="sw-note break-all">{state}</p>}
    <button type="button" disabled={!ok} className="sw-gold-btn mt-10 w-full justify-center !py-4 text-lg disabled:opacity-40" onClick={() => void send()}>Confirm</button>
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
      <button type="button" className="sw-gold-btn mx-auto mt-6 w-4/5 justify-center !py-3" onClick={() => { void navigator.clipboard.writeText(addr); setC(true); }}><Copy size={18} /> {c ? 'Copied' : 'Copy'}</button>
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
        if (!alive || !video.current) return;
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
    if (!f || !BD) return setErr('QR reading from images is not supported in this browser.');
    try { const r = await new BD({ formats: ['qr_code'] }).detect(await createImageBitmap(f)); r[0] ? onResult(r[0].rawValue) : setErr('No QR code found in that image.'); } catch { setErr('Could not read that image.'); }
  };
  return <>
    <TopBar title="Scan" onBack={onBack} />
    <div className="sw-scan"><video ref={video} muted playsInline className="h-full w-full object-cover" /><span className="sw-scan-frame" aria-hidden /><Camera className="sw-scan-cam" size={28} aria-hidden /></div>
    {err && <p className="sw-note">{err}</p>}
    <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void fromFile(e.target.files?.[0])} />
    <button type="button" className="sw-action mx-auto mt-6 !w-auto !flex-row !px-8 !py-4" onClick={() => file.current?.click()}><ImageIcon size={20} /> <b>My album</b></button>
  </>;
}

function BookScreen({ onBack, onPick }: { onBack: () => void; onPick: (a: string) => void }) {
  const [book, setBook] = useState<Book>([]);
  const [name, setName] = useState(''); const [a, setA] = useState('');
  useEffect(() => setBook(readBook()), []);
  const save = (b: Book) => { setBook(b); localStorage.setItem('sov_book', JSON.stringify(b)); };
  return <>
    <TopBar title="Address book" onBack={onBack} />
    <div className="sw-panel space-y-2">
      <input className="sw-field w-full !py-3 text-sm" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="sw-field w-full !py-3 font-mono text-sm" placeholder="0x…" value={a} onChange={(e) => setA(e.target.value.trim())} />
      <button type="button" disabled={!name || !isAddr(a)} className="sw-gold-btn w-full justify-center disabled:opacity-40" onClick={() => { save([...book, { name, address: a }]); setName(''); setA(''); }}><Plus size={16} /> Save address</button>
    </div>
    <div className="mt-4 space-y-2">
      {book.length === 0 && <p className="sw-note text-center">No saved addresses yet.</p>}
      {book.map((e, i) => <div key={e.address + i} className="sw-row !py-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onPick(e.address)}><b className="block">{e.name}</b><small className="sw-muted font-mono">{short(e.address)}</small></button>
        <button type="button" aria-label={`Delete ${e.name}`} onClick={() => save(book.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
      </div>)}
    </div>
  </>;
}

function NodeScreen({ onBack }: { onBack: () => void }) {
  const [cur, setCur] = useState(NODES[0]!);
  const [ms, setMs] = useState<Record<string, number>>({});
  useEffect(() => {
    setCur(getNode());
    NODES.forEach((n) => { const t = performance.now(); void fetch(n, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' }).then(() => setMs((m) => ({ ...m, [n]: Math.round(performance.now() - t) }))).catch(() => setMs((m) => ({ ...m, [n]: -1 }))); });
  }, []);
  return <>
    <TopBar title="Node" onBack={onBack} />
    <div className="sw-panel !p-0">{NODES.map((n) => <button key={n} type="button" className="sw-list-item w-full" aria-pressed={cur === n} onClick={() => { localStorage.setItem('sov_node', n); setCur(n); }}>
      <Network size={18} /><span className="min-w-0 flex-1 truncate text-left text-sm">{n.replace('https://', '')}</span>
      <small className={ms[n] === -1 ? 'sw-down' : 'sw-up'}>{ms[n] === undefined ? '…' : ms[n] === -1 ? 'offline' : `${ms[n]} ms`}</small>
      {cur === n && <span className="sw-gold-text">●</span>}
    </button>)}</div>
  </>;
}

function NotifyScreen({ onBack }: { onBack: () => void }) {
  const [p, setP] = useState('default');
  useEffect(() => { if ('Notification' in window) setP(Notification.permission); }, []);
  return <>
    <TopBar title="Notifications" onBack={onBack} />
    <div className="sw-panel space-y-3">
      <p className="text-sm">Status: <b className="sw-gold-text">{p}</b></p>
      <button type="button" className="sw-gold-btn w-full justify-center" onClick={() => { if ('Notification' in window) void Notification.requestPermission().then(setP); }}><Bell size={16} /> Allow notifications</button>
      <p className="sw-note">Browser permission only. Transfer alerts depend on your wallet app.</p>
    </div>
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

const IV = ['1h', '4h', '1d'] as const;
function Spark({ sym, flat }: { sym: string | null; flat?: boolean }) {
  const [iv, setIv] = useState<(typeof IV)[number]>('1h');
  const [pts, setPts] = useState<number[]>([]);
  useEffect(() => {
    if (!sym) { setPts([]); return; }
    let on = true;
    void fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=${iv}&limit=48`).then((r) => r.json()).then((k: string[][]) => { if (on) setPts(k.map((x) => Number(x[4]))); }).catch(() => on && setPts([]));
    return () => { on = false; };
  }, [sym, iv]);
  const W = 320, Hh = 120;
  const data = pts.length > 1 ? pts : flat ? [1, 1] : [];
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1;
  const xy = data.map((v, i) => [(i / (data.length - 1)) * W, Hh - 8 - ((v - mn) / rg) * (Hh - 16)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x!.toFixed(1)},${y!.toFixed(1)}`).join(' ');
  const up = data.length > 1 && data[data.length - 1]! >= data[0]!;
  return <div className="mt-3">
    {data.length > 1 ? <svg viewBox={`0 0 ${W} ${Hh}`} className={`sw-spark ${up ? 'sw-spark-up' : 'sw-spark-down'}`} role="img" aria-label="Price chart">
      <defs><linearGradient id="swg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".35" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={Hh * g} y2={Hh * g} className="sw-grid" />)}
      <path d={`${line} L${W},${Hh} L0,${Hh} Z`} fill="url(#swg)" /><path d={line} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg> : <div className="sw-spark grid place-items-center sw-muted text-sm">Loading chart…</div>}
    {sym && <div className="mt-2 flex justify-center gap-2">{IV.map((i) => <button key={i} type="button" onClick={() => setIv(i)} className={`sw-chg ${iv === i ? 'sw-up-bg' : 'sw-muted'}`}>{i}</button>)}</div>}
  </div>;
}

function MarketTab({ px, bixRef }: { px: Record<string, { p: number; c: number }>; bixRef: number }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'n' | 'p' | 'c'>('n');
  const [dir, setDir] = useState(1);
  const rows = [{ s: 'BIX', p: bixRef, c: 0, ref: true }, ...Object.entries(px).map(([s, v]) => ({ s, p: v.p, c: v.c, ref: false }))]
    .filter((r) => r.s.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => dir * (sort === 'n' ? a.s.localeCompare(b.s) : sort === 'p' ? a.p - b.p : a.c - b.c));
  const H = ({ k, l }: { k: 'n' | 'p' | 'c'; l: string }) => <button type="button" className="sw-muted text-sm" onClick={() => { if (sort === k) setDir(-dir); else { setSort(k); setDir(1); } }}>{l} ⇅</button>;
  const [sel, setSel] = useState('BTC');
  const sp = px[sel];
  return <>
    <section className="sw-chart-card">
      <div className="flex items-end justify-between"><div><small className="sw-muted">{sel}/USDT</small><b className="numeric block font-display text-2xl">{sp ? `$${fmt(sp.p, sp.p < 1 ? 6 : 2)}` : '—'}</b></div>
        {sp && <span className={`sw-chg ${sp.c >= 0 ? 'sw-up-bg' : 'sw-down-bg'}`}>{sp.c >= 0 ? '+' : ''}{sp.c.toFixed(2)}%</span>}</div>
      <Spark sym={`${sel}USDT`} />
    </section>
    <div className="sw-field mt-4 flex items-center gap-3"><Search size={18} className="sw-gold-text" /><input className="flex-1 bg-transparent outline-none" placeholder="Search currency" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="mt-5 flex items-center justify-between px-2"><H k="n" l="Name" /><span className="flex gap-6"><H k="p" l="Last price" /><H k="c" l="24h" /></span></div>
    <div className="mt-2 space-y-1">
      {rows.length === 0 && <p className="sw-note mt-16 text-center">No matching currency found.</p>}
      {rows.map((r) => <button type="button" key={r.s} onClick={() => !r.ref && setSel(r.s)} aria-pressed={sel === r.s} className={`sw-row w-full text-left !py-3 ${sel === r.s ? 'sw-row-on' : ''}`}>
        <b className="flex-1">{r.s}<small className="sw-muted"> /USDT</small></b>
        <span className="numeric">{r.p ? `$${fmt(r.p, r.p < 1 ? 6 : 2)}` : '—'}</span>
        {r.ref ? <span className="sw-chg sw-muted text-xs">Ref.</span> : <span className={`sw-chg ${r.c >= 0 ? 'sw-up-bg' : 'sw-down-bg'}`}>{r.c >= 0 ? '+' : ''}{r.c.toFixed(2)}%</span>}
      </button>)}
    </div>
    <p className="sw-note">Prices from Binance public data. BIX shows the internal reference, not a traded market price.</p>
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
  const go = () => { const v = q.trim(); if (!v) return; window.open(/^https?:\/\//.test(v) ? v : `https://${v}`, '_blank', 'noopener'); };
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
          return i.ext ? <a key={i.n} href={i.to} target="_blank" rel="noreferrer" className="sw-row">{inner}</a> : <a key={i.n} href={i.to} className="sw-row">{inner}</a>;
        })}</div>
      </section>;
    })}
  </>;
}

function MeTab({ addr, go }: { addr: string; go: (s: Screen) => void }) {
  const Item = ({ i, t, d, on }: { i: ReactNode; t: string; d: string; on: () => void }) =>
    <button type="button" className="sw-list-item w-full" onClick={on}><span className="sw-icon-box">{i}</span><span className="min-w-0 flex-1 text-left"><b className="block">{t}</b><small className="sw-muted block truncate">{d}</small></span><ChevronRight size={18} className="sw-muted" /></button>;
  return <>
    <b className="block text-center font-display text-2xl">Personal Center</b>
    <div className="mt-6 flex flex-col items-center"><span className="sw-avatar !h-24 !w-24"><img src={foxMark} alt="" width={80} height={80} /></span>
      <small className="sw-muted mt-2 font-mono">{addr ? short(addr) : 'Not connected'}</small></div>
    <small className="sw-muted mt-6 block px-2">Account</small>
    <div className="sw-panel mt-2 !p-0"><Item i={<Shield size={18} />} t="Security & verification" d="Keep your wallet safe" on={() => go('security')} /></div>
    <small className="sw-muted mt-6 block px-2">Manage</small>
    <div className="sw-panel mt-2 !p-0">
      <Item i={<Moon size={18} />} t="Theme" d="Follows BIXLINK theme" on={() => { window.location.href = '/settings'; }} />
      <Item i={<Languages size={18} />} t="Language" d="Set language" on={() => { window.location.href = '/settings'; }} />
      <Item i={<Network size={18} />} t="Node" d="Choose BNB Chain RPC node" on={() => go('node')} />
      <Item i={<Star size={18} />} t="Address book" d="Manage saved wallet addresses" on={() => go('book')} />
      <Item i={<FileText size={18} />} t="Push notifications" d="Receive / send alerts" on={() => go('notify')} />
    </div>
    <small className="sw-muted mt-6 block px-2">More</small>
    <div className="sw-panel mt-2 !p-0">
      <Item i={<Download size={18} />} t="BIXLINK main app" d="Open staking & ledger dashboard" on={() => { window.location.href = '/dashboard'; }} />
    </div>
    <div className="mt-4"><InstallAppButton /></div>
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
      <button type="button" className="sw-gold-btn mx-auto mt-6 w-4/5 justify-center !py-3" disabled={!code} onClick={() => { void navigator.clipboard.writeText(code); setC(true); }}><Copy size={18} /> {c ? 'Copied' : 'Copy BIX ID'}</button>
    </section>
  </>;
}
