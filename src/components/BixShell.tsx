import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, Wallet, Layers, Zap, User, Network, LogIn, ShieldCheck, Lock, BadgeCheck, Bell, CheckCheck, ChevronDown, TrendingUp, ClipboardCheck } from 'lucide-react';
import { useMember, usePublicConfig, useReviewerAccess } from '@/lib/useMember';
import headerMark from '@/assets/bixlink-header-mark.png.asset.json';
import { LANGUAGES, type Language, useI18n } from '@/lib/i18n';
import { getMarketUpdates } from '@/lib/updates.functions';
import { resolvePresentationTheme } from '@/lib/presentation-theme';
import { TxFeedbackHost } from '@/components/TxFeedback';

const NAV = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/wallet', label: 'WALLET', icon: Wallet },
  { to: '/stake', label: 'STAKE', icon: Layers },
  { to: '/profit', label: 'PROFIT', icon: TrendingUp },
  { to: '/boost', label: 'BOOST APY', icon: Zap },
  { to: '/network', label: 'NETWORK', icon: Network },
] as const;

export function BixShell({ children }: { children: React.ReactNode }) {
  const { user } = useMember();
  const { data: publicConfig } = usePublicConfig();
  const presentationTheme = resolvePresentationTheme(publicConfig?.readiness.presentationTheme);
  useEffect(() => {
    document.documentElement.dataset['presentationTheme'] = presentationTheme;
  }, [presentationTheme]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });
  const { language, setLanguage, t, updates } = useI18n();
  const marketEnabled = publicConfig?.readiness.marketEnabled === true;
  const reviewerRole = useReviewerAccess(user?.id);
  const official = useQuery({ queryKey: ['bix-market-updates'], queryFn: () => getMarketUpdates(), enabled: Boolean(user) && marketEnabled, staleTime: 60_000, refetchInterval: 60_000 });
  const visibleUpdates = marketEnabled && official.data?.announcements.length ? official.data.announcements.map(post => ({ id: `${post.id}:${post.published_at}`, title: post.title, body: post.body })) : updates;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const [languagesOpen, setLanguagesOpen] = useState(false);

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
    const close = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
      if (!languageRef.current?.contains(event.target as Node)) setLanguagesOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const unread = useMemo(() => notificationsEnabled ? visibleUpdates.filter(item => !readIds.includes(item.id)).length : 0, [notificationsEnabled, readIds, visibleUpdates]);
  const markAllRead = () => {
    const ids = visibleUpdates.map(item => item.id);
    setReadIds(ids);
    window.localStorage.setItem('bixlink-read-updates', JSON.stringify(ids));
  };
  const selectedLanguage = LANGUAGES.find(item => item.code === language) ?? LANGUAGES[0];

  return <div data-presentation-theme={presentationTheme} className="site-shell min-h-screen bg-background pb-20 text-foreground md:pb-0">
    <header className="site-header" data-no-translate><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8">
      <Link to={"/"} className="header-brand"><img src={headerMark.url} width={42} height={42} alt="BIXLINK fox emblem" className="rounded-full object-cover"/><span className="brand-mark" aria-label="BIXLINK"><i>BIX</i><i>LI</i><i>NK</i></span></Link>
      {user && <nav className="hidden items-center gap-3 md:flex">
        {NAV.map(n => <Link key={n.to} to={n.to} className={`nav-link ${path === n.to ? 'active' : ''}`}><n.icon size={15}/>{n.to === '/profit' ? 'PROFIT' : t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : n.to === '/boost' ? 'boost' : 'network')}</Link>)}
      </nav>}
      <div className="header-tools">
        {user && reviewerRole.data && <Button asChild title="Owner 2 Panel" variant="outline" size="sm" className="header-reviewer"><Link to="/review" aria-label="Owner 2 Panel"><ClipboardCheck/><span>Owner 2</span></Link></Button>}
        {user && marketEnabled && <Button asChild title="Market & Updates" variant="ghost" size="icon" className="header-icon"><Link to="/market" aria-label="Market & Updates"><TrendingUp/></Link></Button>}
        <div className="language-control" ref={languageRef}><Button type="button" variant="ghost" className="language-trigger" aria-label={t('language')} aria-haspopup="menu" aria-expanded={languagesOpen} onClick={() => setLanguagesOpen(value => !value)}><span className={`flag-symbol flag-${selectedLanguage.flag}`} aria-hidden/><ChevronDown/></Button>{languagesOpen && <div className="language-menu" role="menu" aria-label={t('language')}>{LANGUAGES.map(item => <Button key={item.code} type="button" variant="ghost" role="menuitemradio" aria-checked={language === item.code} title={item.label} className={language === item.code ? 'is-active' : ''} onClick={() => { setLanguage(item.code as Language); setLanguagesOpen(false); }}><span className={`flag-symbol flag-${item.flag}`} aria-hidden/><span className="sr-only">{item.label}</span></Button>)}</div>}</div>
        {user ? <><div className="notification-control" ref={notificationRef}><Button title={t('notifications')} variant="ghost" size="icon" className="header-icon" aria-label={t('notifications')} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Bell/>{unread > 0 && <span className="notification-count">{unread}</span>}</Button>{notificationsOpen && <div className="notification-menu"><div className="notification-menu-head"><div><span>{t('latestUpdates')}</span><b>{t('notifications')}</b></div>{unread > 0 && <Button size="icon" variant="ghost" title={t('markRead')} onClick={markAllRead}><CheckCheck/></Button>}</div>{notificationsEnabled ? <div className="notification-list">{visibleUpdates.map(item => <article key={item.id} className={readIds.includes(item.id) ? 'is-read' : ''}><i/><div><b>{item.title}</b><p>{item.body}</p></div></article>)}{marketEnabled && <Link to="/market" className="block px-4 py-3 text-xs font-bold text-chart-3" onClick={() => setNotificationsOpen(false)}>Market &amp; Updates →</Link>}</div> : <p className="notification-empty">{t('noUpdates')}</p>}</div>}</div><Button asChild title={t('profile')} variant={path === '/profile' || path === '/settings' ? 'default' : 'ghost'} size="icon" className="header-icon"><Link to="/profile" aria-label={t('profile')}><User/></Link></Button></> : <Button asChild size="sm" className="header-signin max-[480px]:w-auto! max-[480px]:px-3!"><Link to="/auth" aria-label="LAUNCH APP"><LogIn/> <span className="max-[480px]:inline!">LAUNCH APP</span></Link></Button>}
      </div>
    </div></header>{children}
    <TxFeedbackHost/>
    <footer className="border-t border-border py-9"><div className="mx-auto max-w-7xl px-5 md:px-8">
      {publicConfig?.readiness.readinessEnabled && <div className="trust-panel text-xs">
        <div><ShieldCheck size={18} className="shrink-0 text-chart-2"/><div><strong className="block text-foreground">Automated staking ledger</strong><span className="text-muted-foreground">Staking, profit projections and internal transfers are processed automatically.</span></div></div>
        <div><Lock size={18} className="shrink-0 text-chart-3"/><div><strong className="block text-foreground">Withdrawal review</strong><span className="text-muted-foreground">Only withdrawal requests remain subject to owner review and network verification.</span></div></div>
        <div><BadgeCheck size={18} className="shrink-0 text-primary"/><div><strong className="block text-foreground">BIXCOIN · No SC</strong><span className="text-muted-foreground">BIX currently operates as an internal ledger asset without a deployed smart contract.</span></div></div>
      </div>}
      {publicConfig?.readiness.legalEnabled && <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><Link to="/terms" className="hover:text-foreground">Terms</Link><Link to="/privacy" className="hover:text-foreground">Privacy</Link><Link to="/risk" className="hover:text-foreground">Risk Disclosure</Link><Link to="/about" className="hover:text-foreground">About &amp; Support</Link></nav>}
      {publicConfig?.readiness.footerEnabled !== false && <div className="mt-3 text-[11px] leading-5 text-muted-foreground"><b className="block text-foreground">{publicConfig?.readiness.footerTitle}</b><p>{publicConfig?.readiness.footerBody}</p></div>}
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">No guarantee of profit. APY and rewards are projections; crypto assets can lose all value.</p>
      <div className="mt-4 flex flex-col justify-between gap-2 text-xs text-muted-foreground md:flex-row"><span>© 2026 BIXLINK · <span>21 MILLION BIX TOKEN</span></span>{publicConfig?.readiness.footerEnabled !== false && <span>{publicConfig?.readiness.footerContact}</span>}</div>
    </div></footer>
    {user && <nav aria-label="Main" data-no-translate className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV.map(n => { const on = path === n.to; return <Link key={n.to} to={n.to} className={`flex min-w-0 flex-col items-center gap-1 py-2 text-[8px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}><n.icon size={19}/>{n.to === '/profit' ? 'PROFIT' : t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : n.to === '/boost' ? 'boost' : 'network')}</Link>; })}
    </nav>}
  </div>;
}
