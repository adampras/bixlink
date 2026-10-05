import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export function MemberGate({ ready, signedIn, title, children }: { ready: boolean; signedIn: boolean; title: string; children: React.ReactNode }) {
  if (!ready) return <p className="py-24 text-center text-muted-foreground">Loading account…</p>;
  if (!signedIn) return <div className="py-24 text-center"><h1 className="section-title">{title}</h1><p className="mt-3 text-muted-foreground">Sign in to continue.</p><Button asChild className="mt-6 rounded-full bg-chart-3 text-background"><Link to="/auth">Sign in</Link></Button></div>;
  return <>{children}</>;
}
