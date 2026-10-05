import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Shield, LogIn, LogOut } from 'lucide-react';
import fox from '@/assets/bixlink-fox.png';

export function BixShell({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: s => s.location.pathname });
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);
  return <div className="site-shell min-h-screen bg-background text-foreground">
    <header className="site-header"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8">
      <Link to="/" className="flex items-center gap-2"><img src={fox} width={42} height={42} alt="BIXLINK blue fox" className="h-10 w-10 object-contain"/><span className="brand-mark text-xl font-black">BIXLINK</span></Link>
      <nav className="flex items-center gap-1 md:gap-4">
        <Link to="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>Explore</Link>
        <Link to="/dashboard" className={`nav-link ${path === '/dashboard' ? 'active' : ''}`}><LayoutDashboard size={15}/><span className="hidden sm:inline">Dashboard</span></Link>
        {signedIn && <Link to="/admin" className={`nav-link ${path === '/admin' ? 'active' : ''}`}><Shield size={15}/><span className="hidden sm:inline">Admin</span></Link>}
        {signedIn ? <Button title="Sign out" variant="ghost" size="icon" className="rounded-full" onClick={async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); navigate({to:'/auth',replace:true}); }}><LogOut/></Button> : <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground"><Link to="/auth"><LogIn/> <span className="hidden sm:inline">Sign in</span></Link></Button>}
      </nav>
    </div></header>{children}
    <footer className="border-t border-border py-9"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 text-xs text-muted-foreground md:flex-row md:px-8"><span>© 2026 BIXLINK. Staking preview • No live deposits or payouts.</span><span>bixlink.io &nbsp;·&nbsp; @bixlink_official</span></div></footer>
  </div>;
}
