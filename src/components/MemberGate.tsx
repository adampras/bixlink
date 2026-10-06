import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import headerMark from '@/assets/bixlink-header-mark.png.asset.json';

export function MemberGate({ ready, signedIn, title, children }: { ready: boolean; signedIn: boolean; title: string; children: React.ReactNode }) {
  if (!ready) return <MemberSkeleton />;
  if (!signedIn) return <div className="py-24 text-center"><h1 className="section-title">{title}</h1><p className="mt-3 text-muted-foreground">Sign in to continue.</p><Button asChild className="mt-6 rounded-full bg-chart-3 text-background"><Link to="/auth">Sign in</Link></Button></div>;
  return <>{children}</>;
}

// Layout-shaped placeholder: same panels the member pages use, so restoring a
// session never pushes the page around or shows a bare text line.
function MemberSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10" aria-busy="true">
      <span className="sr-only">Restoring your BIXLINK session</span>
      <div className="session-boot">
        <img src={headerMark.url} width={34} height={34} alt="" className="session-boot__mark" />
        <div className="min-w-0">
          <b>Restoring your session</b>
          <span>Opening the BIXLINK member terminal</span>
        </div>
        <div className="session-boot__track"><i /></div>
      </div>
      <div className="terminal-overview mt-4">
        <div className="terminal-balance">
          <span className="sk-line h-3 w-36" />
          <span className="sk-line mt-4 h-9 w-48 max-w-full" />
          <div className="mt-6 grid grid-cols-3 gap-2">{[0, 1, 2].map(i => <span className="sk-line h-8" key={i} />)}</div>
        </div>
        <div className="terminal-kpis">{[0, 1, 2].map(i => <div className="terminal-kpi" key={i}><span className="sk-line h-3 w-16" /><span className="sk-line mt-3 h-6 w-12" /></div>)}</div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="terminal-market">
          <span className="sk-line h-4 w-28" />
          <div className="terminal-chart"><span className="sk-fill" /></div>
        </div>
        <div className="terminal-market">
          <span className="sk-line h-4 w-24" />
          {[0, 1, 2, 3].map(i => <div className="sk-row" key={i}><span className="sk-line h-8 w-8 shrink-0 rounded-full" /><span className="sk-line h-3 min-w-0 flex-1" /><span className="sk-line h-3 w-14 shrink-0" /></div>)}
        </div>
      </div>
    </main>
  );
}
