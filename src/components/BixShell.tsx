import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Home, Wallet, Layers, Zap, User, Network, LogIn, LogOut } from 'lucide-react';
import { useMember } from '@/lib/useMember';
import fox from '@/assets/bixlink-fox.png';

const NAV = [
  { to: '/', label: 'HOME', icon: Home },
  { to: '/wallet', label: 'WALLET', icon: Wallet },
  { to: '/stake', label: 'STAKE', icon: Layers },
  { to: '/boost', label: 'BOOST APY', icon: Zap },
  { to: '/network', label: 'NETWORK', icon: Network },
  { to: '/profile', label: 'PROFILE', icon: User },
] as const;

export function BixShell({ children }: { children: React.ReactNode }) {
  const { user } = useMember();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });

  return <div className="site-shell min-h-screen bg-background pb-20 text-foreground md:pb-0">
    <header className="site-header"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8">
      <Link to="/" className="flex items-center gap-2"><img src={fox} width={42} height={42} alt="BIXLINK blue fox" className="h-10 w-10 object-contain"/><span className="brand-mark text-xl font-black">BIXLINK</span></Link>
      <nav className="hidden items-center gap-3 md:flex">
        {NAV.map(n => <Link key={n.to} to={n.to} className={`nav-link ${path === n.to ? 'active' : ''}`}><n.icon size={15}/>{n.label}</Link>)}
      </nav>
      {user ? <Button title="Sign out" variant="ghost" size="icon" className="rounded-full" onClick={async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true }); }}><LogOut/></Button> : <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground"><Link to="/auth"><LogIn/> Sign in</Link></Button>}
    </div></header>{children}
    <footer className="border-t border-border py-9"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 text-xs text-muted-foreground md:flex-row md:px-8"><span>© 2026 BIXLINK. Staking preview • No live deposits or payouts.</span><span>bixlink.io &nbsp;·&nbsp; @bixlink_official</span></div></footer>
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV.map(n => { const on = path === n.to; return <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2 text-[9px] font-bold ${on ? 'text-chart-3' : 'text-muted-foreground'}`}><n.icon size={20}/>{n.label}</Link>; })}
    </nav>
  </div>;
}
