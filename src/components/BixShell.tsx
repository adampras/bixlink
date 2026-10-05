import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, Wallet, Layers, Zap, User, Network, LogIn, ShieldCheck, Lock, BadgeCheck, Languages } from 'lucide-react';
import { useMember } from '@/lib/useMember';
import fox from '@/assets/bixlink-fox.png';

const NAV = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/wallet', label: 'WALLET', icon: Wallet },
  { to: '/stake', label: 'STAKE', icon: Layers },
  { to: '/boost', label: 'BOOST APY', icon: Zap },
  { to: '/network', label: 'NETWORK', icon: Network },
] as const;

const LANGUAGES = [
  { code: 'id', short: 'ID', label: 'Indonesia' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'zh', short: '中文', label: '中文' },
  { code: 'ja', short: '日本語', label: '日本語' },
  { code: 'ko', short: '한국어', label: '한국어' },
] as const;

export function BixShell({ children }: { children: React.ReactNode }) {
  const { user } = useMember();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });
  const [language, setLanguage] = useState('id');

  useEffect(() => {
    const saved = window.localStorage.getItem('bixlink-language');
    if (saved && LANGUAGES.some(item => item.code === saved)) setLanguage(saved);
  }, []);

  const chooseLanguage = (value: string) => {
    setLanguage(value);
    window.localStorage.setItem('bixlink-language', value);
    document.documentElement.lang = value;
  };

  return <div className="site-shell min-h-screen bg-background pb-20 text-foreground md:pb-0">
    <header className="site-header"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8">
      <Link to={user ? "/" : "/auth"} className="flex items-center gap-2"><img src={fox} width={42} height={42} alt="BIXLINK blue fox" className="h-10 w-10 object-contain"/><span className="brand-mark text-xl font-black">BIXLINK</span></Link>
      {user && <nav className="hidden items-center gap-3 md:flex">
        {NAV.map(n => <Link key={n.to} to={n.to} className={`nav-link ${path === n.to ? 'active' : ''}`}><n.icon size={15}/>{n.label}</Link>)}
      </nav>}
      {user ? <div className="flex items-center gap-1.5"><label className="language-picker"><Languages size={15}/><span className="sr-only">Language</span><select aria-label="Language" value={language} onChange={event => chooseLanguage(event.target.value)}>{LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.short}</option>)}</select></label><Button asChild title="Profile" variant={path === '/profile' ? 'default' : 'ghost'} size="icon" className="rounded-full"><Link to="/profile" aria-label="Profile"><User/></Link></Button></div> : <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground"><Link to="/auth"><LogIn/> Sign in</Link></Button>}
    </div></header>{children}
    <footer className="border-t border-border py-9"><div className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="trust-panel text-xs">
        <div><ShieldCheck size={18} className="shrink-0 text-chart-2"/><div><strong className="block text-foreground">Admin-verified</strong><span className="text-muted-foreground">Every deposit, withdrawal and swap is reviewed manually.</span></div></div>
        <div><Lock size={18} className="shrink-0 text-chart-3"/><div><strong className="block text-foreground">Non-custodial preview</strong><span className="text-muted-foreground">No live funds are held or paid out automatically.</span></div></div>
        <div><BadgeCheck size={18} className="shrink-0 text-primary"/><div><strong className="block text-foreground">Fixed reference price</strong><span className="text-muted-foreground">BIX internal ledger at $0.10 per BIX.</span></div></div>
      </div>
      <div className="mt-6 flex flex-col justify-between gap-2 text-xs text-muted-foreground md:flex-row"><span>© 2026 BIXLINK · 21 JUTA BIX TOKEN</span><span>bixlink.io &nbsp;·&nbsp; @bixlink_official</span></div>
    </div></footer>
    {user && <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV.map(n => { const on = path === n.to; return <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2 text-[9px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}><n.icon size={20}/>{n.label}</Link>; })}
    </nav>}
  </div>;
}
