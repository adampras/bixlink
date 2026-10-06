import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, Wallet, Layers, Zap, User, Network, LogIn, ShieldCheck, Lock, BadgeCheck, Bell, Settings, CheckCheck, ChevronDown } from 'lucide-react';
import { useMember, usePublicConfig } from '@/lib/useMember';
import headerMark from '@/assets/bixlink-header-mark.png.asset.json';
import { LANGUAGES, type Language, useI18n } from '@/lib/i18n';

const NAV = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/wallet', label: 'WALLET', icon: Wallet },
  { to: '/stake', label: 'STAKE', icon: Layers },
  { to: '/boost', label: 'BOOST APY', icon: Zap },
  { to: '/network', label: 'NETWORK', icon: Network },
] as const;

export function BixShell({ children }: { children: React.ReactNode }) {
  const { user } = useMember();
  const { data: publicConfig } = usePublicConfig();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });
  const { language, setLanguage, t, updates } = useI18n();
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
  const unread = useMemo(() => notificationsEnabled ? updates.filter(item => !readIds.includes(item.id)).length : 0, [notificationsEnabled, readIds, updates]);
  const markAllRead = () => {
    const ids = updates.map(item => item.id);
    setReadIds(ids);
    window.localStorage.setItem('bixlink-read-updates', JSON.stringify(ids));
  };
  const selectedLanguage = LANGUAGES.find(item => item.code === language) ?? LANGUAGES[0];

  return <div className="site-shell min-h-screen bg-background pb-20 text-foreground md:pb-0">
    <header className="site-header"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8">
      <Link to={user ? "/" : "/auth"} className="header-brand"><img src={headerMark.url} width={42} height={42} alt="BIXLINK fox emblem" className="rounded-full object-cover"/><span className="brand-mark" aria-label="BIXLINK"><i>BIX</i><i>LI</i><i>NK</i></span></Link>
      {user && <nav className="hidden items-center gap-3 md:flex">
        {NAV.map(n => <Link key={n.to} to={n.to} className={`nav-link ${path === n.to ? 'active' : ''}`}><n.icon size={15}/>{t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : n.to === '/boost' ? 'boost' : 'network')}</Link>)}
      </nav>}
      <div className="header-tools">
        <div className="language-control" ref={languageRef}><Button type="button" variant="ghost" className="language-trigger" aria-label={t('language')} aria-haspopup="menu" aria-expanded={languagesOpen} onClick={() => setLanguagesOpen(value => !value)}><span className={`flag-symbol flag-${selectedLanguage.flag}`} aria-hidden/><ChevronDown/></Button>{languagesOpen && <div className="language-menu" role="menu" aria-label={t('language')}>{LANGUAGES.map(item => <Button key={item.code} type="button" variant="ghost" role="menuitemradio" aria-checked={language === item.code} title={item.label} className={language === item.code ? 'is-active' : ''} onClick={() => { setLanguage(item.code as Language); setLanguagesOpen(false); }}><span className={`flag-symbol flag-${item.flag}`} aria-hidden/><span className="sr-only">{item.label}</span></Button>)}</div>}</div>
        {user ? <><div className="notification-control" ref={notificationRef}><Button title={t('notifications')} variant="ghost" size="icon" className="header-icon" aria-label={t('notifications')} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Bell/>{unread > 0 && <span className="notification-count">{unread}</span>}</Button>{notificationsOpen && <div className="notification-menu"><div className="notification-menu-head"><div><span>{t('latestUpdates')}</span><b>{t('notifications')}</b></div>{unread > 0 && <Button size="icon" variant="ghost" title={t('markRead')} onClick={markAllRead}><CheckCheck/></Button>}</div>{notificationsEnabled ? <div className="notification-list">{updates.map(item => <article key={item.id} className={readIds.includes(item.id) ? 'is-read' : ''}><i/><div><b>{item.title}</b><p>{item.body}</p></div></article>)}</div> : <p className="notification-empty">{t('noUpdates')}</p>}<Button asChild variant="ghost" className="notification-settings"><Link to="/settings"><Settings/>{t('settings')}</Link></Button></div>}</div><Button asChild title={t('settings')} variant={path === '/settings' ? 'default' : 'ghost'} size="icon" className="header-icon"><Link to="/settings" aria-label={t('settings')}><Settings/></Link></Button><Button asChild title={t('profile')} variant={path === '/profile' ? 'default' : 'ghost'} size="icon" className="header-icon"><Link to="/profile" aria-label={t('profile')}><User/></Link></Button></> : <Button asChild size="sm" className="header-signin"><Link to="/auth"><LogIn/> <span>{t('signIn')}</span></Link></Button>}
      </div>
    </div></header>{children}
    <footer className="border-t border-border py-9"><div className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="trust-panel text-xs">
        <div><ShieldCheck size={18} className="shrink-0 text-chart-2"/><div><strong className="block text-foreground">Admin-verified</strong><span className="text-muted-foreground">Every deposit, withdrawal and swap is reviewed manually.</span></div></div>
        <div><Lock size={18} className="shrink-0 text-chart-3"/><div><strong className="block text-foreground">Non-custodial preview</strong><span className="text-muted-foreground">No live funds are held or paid out automatically.</span></div></div>
        <div><BadgeCheck size={18} className="shrink-0 text-primary"/><div><strong className="block text-foreground">Internal reference</strong><span className="text-muted-foreground">Owner-managed BIX ledger reference at ${Number(publicConfig?.bixMarket.priceUsd ?? 0.84291).toFixed(6)}.</span></div></div>
      </div>
      <div className="mt-6 flex flex-col justify-between gap-2 text-xs text-muted-foreground md:flex-row"><span>© 2026 BIXLINK · 21 JUTA BIX TOKEN</span><span>bixlink.io &nbsp;·&nbsp; @bixlink_official</span></div>
    </div></footer>
    {user && <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV.map(n => { const on = path === n.to; return <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2 text-[9px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}><n.icon size={20}/>{t(n.to === '/' ? 'home' : n.to === '/wallet' ? 'wallet' : n.to === '/stake' ? 'stake' : n.to === '/boost' ? 'boost' : 'network')}</Link>; })}
    </nav>}
  </div>;
}
