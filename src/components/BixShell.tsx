import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, Wallet, Layers, Zap, User, Network, LogIn, ShieldCheck, Lock, BadgeCheck, Bell, CheckCheck, ChevronDown, TrendingUp, ClipboardCheck, Crown } from 'lucide-react';
import { useMember, usePublicConfig, useReviewerAccess } from '@/lib/useMember';
import { usePresaleStatus, presaleOpen } from '@/components/PresaleEntry';
import headerLogo from '@/assets/bixlink-logo-gold.webp';
const headerMark = { url: headerLogo };
import { LANGUAGES, type Language, useI18n } from '@/lib/i18n';
import { getMarketUpdates } from '@/lib/updates.functions';
import { resolvePresentationTheme } from '@/lib/presentation-theme';
import { isBlockedByMaintenance } from '@/lib/site-control';
import { TxFeedbackHost } from '@/components/TxFeedback';
import { MarketTicker } from '@/components/TradingFlair';
import { createPortal } from 'react-dom';
import { Sun, Moon } from 'lucide-react';
import { SiteSearch } from '@/components/SiteSearch';
import { SitePopup } from '@/components/SitePopup';

const NAV = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/stake', label: 'STAKE', icon: Layers },
  { to: '/wallet', label: 'WALLET', icon: Wallet },
  { to: '/profit', label: 'PROFIT', icon: TrendingUp },
  { to: '/boost', label: 'BOOST APY', icon: Zap },
  { to: '/network', label: 'NETWORK', icon: Network },
] as const;

export function BixShell({ children }: { children: React.ReactNode }) {
  const { user } = useMember();
  const { data: publicConfig } = usePublicConfig();
  const presentationTheme = resolvePresentationTheme(publicConfig?.readiness.presentationTheme);
  useEffect(() => {
    document.documentElement.dataset['presentationTheme'] = presentationTheme; if (publicConfig) localStorage.setItem('bixlink-theme', presentationTheme);
  }, [presentationTheme]);
  const rd = publicConfig?.readiness as { animGlow?: boolean; animShimmer?: boolean; animFloat?: boolean } | undefined;
  useEffect(() => {
    const ds = document.documentElement.dataset;
    ds['animGlow'] = rd?.animGlow ? 'on' : 'off';
    ds['animShimmer'] = rd?.animShimmer ? 'on' : 'off';
    ds['animFloat'] = rd?.animFloat ? 'on' : 'off';
  }, [rd?.animGlow, rd?.animShimmer, rd?.animFloat]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });
  const navLoading = useRouterState({ select: s => s.status === 'pending' });
  const { language, setLanguage, t, updates } = useI18n();
  const marketEnabled = publicConfig?.readiness.marketEnabled === true;
  const reviewerRole = useReviewerAccess(user?.id);
  const presale = usePresaleStatus(user?.id);
  const presaleOn = Boolean(user) && presaleOpen(presale.data);
  const official = useQuery({ queryKey: ['bix-market-updates'], queryFn: () => getMarketUpdates(), enabled: Boolean(user) && marketEnabled, staleTime: 60_000, refetchInterval: 60_000 });
  const visibleUpdates = marketEnabled && official.data?.announcements.length ? official.data.announcements.map(post => ({ id: `${post.id}:${post.published_at}`, title: post.title, body: post.body })) : updates;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark');
  useEffect(() => { setColorMode(localStorage.getItem('bixlink-color-mode') === 'light' ? 'light' : 'dark'); }, []);
  useEffect(() => { document.documentElement.dataset['colorMode'] = colorMode; }, [colorMode]);
  const toggleMode = () => setColorMode(m => { const next = m === 'dark' ? 'light' : 'dark'; localStorage.setItem('bixlink-color-mode', next); return next; });

  useEffect(() => {
    const syncPreferences = () => {
      setNotificationsEnabled(window.localStorage.getItem('bixlink-notifications') !== 'off');
      try { setReadIds(JSON.parse(window.localStorage.getItem('bixlink-read-updates') ?? '[]')); } catch { setReadIds([]); }
    };
    syncPreferences();
    window.addEventListener('bixlink-preferences', syncPreferences);
    return () => window.removeEventListener('bixlink-preferences', syncPreferences);
  }, []);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
      if (!languageRef.current?.contains(event.target as Node) && !languageMenuRef.current?.contains(event.target as Node)) setLanguagesOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const unread = useMemo(() => notificationsEnabled ? visibleUpdates.filter(item => !readIds.includes(item.id)).length : 0, [notificationsEnabled, readIds, visibleUpdates]);
  const markAllRead = () => {
    const ids = visibleUpdates.map(item => item.id);
    setReadIds(ids);
    window.localStorage.setItem('bixlink-read-updates', JSON.stringify(ids));
  };
  const selectedLanguage = LANGUAGES.find(item => item.code === language) ?? LANGUAGES[0];

  return <div data-presentation-theme={presentationTheme} style={{ ["--brand-watermark" as string]: `url(${headerMark.url})` }} className="site-shell min-h-screen bg-background pb-24 text-foreground xl:pb-0">
    {navLoading && <div className="route-progress" aria-hidden/>}<header className="site-header" data-no-translate><div className="mx-auto grid grid-cols-[auto_minmax(0,1fr)] max-w-7xl items-center gap-2 px-5 py-3 xl:flex xl:justify-between md:px-8">
      <Link to={"/"} className="header-brand"><img src={headerMark.url} width={42} height={42} alt="BIXLINK fox emblem" className="rounded-full object-cover"/><span className="brand-mark" aria-label="BIXLINK"><i>BIX</i><i>LI</i><i>NK</i></span></Link>
      {user && <nav className="hidden items-center gap-2 xl:flex">
        {NAV.map(n => <Link key={n.to} to={n.to} className={`nav-link ${path === n.to ? 'active' : ''}`}><n.icon size={15}/>{n.to === '/profit' ? 'PROFIT' : t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : n.to === '/boost' ? 'boost' : 'network')}</Link>)}
        {presaleOn && <Link to="/presale" className={`nav-link ${path === '/presale' ? 'active' : ''}`}><Crown size={15}/>PRESALE</Link>}
      </nav>}
      <div className="header-tools">
        {user && reviewerRole.data && <Button asChild title="ADMIN PANEL BIX" variant="outline" size="sm" className="header-reviewer"><Link to="/review" aria-label="ADMIN PANEL BIX"><ClipboardCheck/><span>ADMIN PANEL BIX</span></Link></Button>}
        {user && marketEnabled && <Button asChild title="Market & Updates" variant="ghost" size="icon" className="header-icon"><Link to="/market" aria-label="Market & Updates"><TrendingUp/></Link></Button>}
        <SiteSearch member={Boolean(user)}/>
        {user && <ViewSwitch/>}
        <div className="header-island"><Button type="button" variant="ghost" size="icon" className="mode-toggle" aria-label={colorMode === 'dark' ? 'Switch to day mode' : 'Switch to night mode'} onClick={toggleMode}>{colorMode === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</Button><div className="language-control" ref={languageRef}><Button type="button" variant="ghost" className="language-trigger" aria-label={t('language')} aria-haspopup="menu" aria-expanded={languagesOpen} onClick={() => setLanguagesOpen(value => !value)}><span className={`flag-symbol flag-${selectedLanguage.flag}`} aria-hidden/><ChevronDown/></Button>{languagesOpen && typeof document !== 'undefined' && createPortal(<div ref={languageMenuRef} data-no-translate className="language-menu language-menu--portal" role="menu" aria-label={t('language')}>{LANGUAGES.map(item => <Button key={item.code} type="button" variant="ghost" role="menuitemradio" aria-checked={language === item.code} title={item.label} className={language === item.code ? 'is-active' : ''} onClick={() => { setLanguage(item.code as Language); setLanguagesOpen(false); }}><span className={`flag-symbol flag-${item.flag}`} aria-hidden/><span className="sr-only">{item.label}</span></Button>)}</div>, document.body)}</div></div>
        {user ? <><div className="notification-control" ref={notificationRef}><Button title={t('notifications')} variant="ghost" size="icon" className="header-icon" aria-label={t('notifications')} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Bell/>{unread > 0 && <span className="notification-count">{unread}</span>}</Button>{notificationsOpen && <div className="notification-menu"><div className="notification-menu-head"><div><span>{t('latestUpdates')}</span><b>{t('notifications')}</b></div>{unread > 0 && <Button size="icon" variant="ghost" title={t('markRead')} onClick={markAllRead}><CheckCheck/></Button>}</div>{notificationsEnabled ? <div className="notification-list">{visibleUpdates.map(item => <article key={item.id} className={readIds.includes(item.id) ? 'is-read' : ''}><i/><div><b>{item.title}</b><p>{item.body}</p></div></article>)}{marketEnabled && <Link to="/market" className="block px-4 py-3 text-xs font-bold text-chart-3" onClick={() => setNotificationsOpen(false)}>Market &amp; Updates →</Link>}</div> : <p className="notification-empty">{t('noUpdates')}</p>}</div>}</div><Button asChild title={t('profile')} variant={path === '/profile' || path === '/settings' ? 'default' : 'ghost'} size="icon" className="header-icon"><Link to="/profile" aria-label={t('profile')}><User/></Link></Button></> : <Button asChild size="sm" className="header-signin max-[480px]:w-auto! max-[480px]:px-3!"><Link to="/auth" aria-label="LAUNCH APP"><LogIn/> <span className="max-[480px]:inline!">LAUNCH APP</span></Link></Button>}
      </div>
    </div></header>
    <MarketTicker/>
    {publicConfig?.isAdmin && (publicConfig.siteControl.maintenance || publicConfig.siteControl.staging) && <div role="status" className="border-b border-chart-3 bg-card px-5 py-2 text-center text-[11px] font-bold text-chart-3">{publicConfig.siteControl.maintenance ? 'MAINTENANCE ON · ' : ''}{publicConfig.siteControl.staging ? 'PRATINJAU ADMIN ON — perubahan hanya terlihat oleh admin' : 'Hanya admin yang dapat membuka aplikasi'}</div>}
    {publicConfig && isBlockedByMaintenance(publicConfig.siteControl, publicConfig.isAdmin, path) ? <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 py-16 text-center"><img src={headerMark.url} width={72} height={72} alt="" className="rounded-full"/><div className="eyebrow mt-6">SYSTEM MAINTENANCE</div><h1 className="section-title mt-3">BIXLINK <span>MAINTENANCE</span></h1><p className="mt-4 text-sm leading-6 text-muted-foreground">{publicConfig.siteControl.message || 'Sistem BIXLINK sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.'}</p></main> : children}
    <TxFeedbackHost/>
    <SitePopup path={path} popups={publicConfig?.landingContent.popups} signedIn={!!user}/>
    <footer className="border-t border-border py-4"><p className="mx-auto max-w-7xl px-5 text-center text-[10px] text-muted-foreground md:px-8">No guarantee of profit. APY and rewards are projections.</p></footer>
    {user && <nav aria-label="Main" data-no-translate className={`glass-dock fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-xl grid-cols-5 rounded-2xl border border-border bg-card/80 backdrop-blur-xl xl:hidden`}>
      {NAV.filter(n => n.to !== '/boost').map(n => { const on = path === n.to; return <Link key={n.to} to={n.to} title={n.to === '/profit' ? 'PROFIT' : t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : 'network')} className={`${n.to === '/wallet' ? 'dock-wallet ' : ''}flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}><n.icon size={19} className="shrink-0"/><span className="max-w-full truncate">{n.to === '/profit' ? 'PROFIT' : t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : 'network')}</span></Link>; })}
    </nav>}
  </div>;
}

function ViewSwitch() {
  const [view, setView] = useState<'pro' | 'zen'>('pro');
  useEffect(() => { const v = localStorage.getItem('bixlink-view') === 'zen' ? 'zen' : 'pro'; setView(v); document.documentElement.dataset['view'] = v; }, []);
  const toggle = () => { const next = view === 'pro' ? 'zen' : 'pro'; setView(next); localStorage.setItem('bixlink-view', next); document.documentElement.dataset['view'] = next; };
  return <button type="button" className="view-switch" onClick={toggle} aria-label={view === 'pro' ? 'Switch to Zen mode' : 'Switch to Pro terminal'} title={view === 'pro' ? 'Pro terminal · tap for Zen' : 'Zen mode · tap for Pro'}>{view === 'pro' ? 'PRO' : 'ZEN'}</button>;
}
