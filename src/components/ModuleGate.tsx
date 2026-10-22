import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { usePublicConfig } from '@/lib/useMember';
import { moduleOpen, type ModuleKey } from '@/lib/readiness';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';

const LABEL: Record<ModuleKey, string> = { p2p: 'P2P Desk', arena: 'Fox Arena', nft: 'Marketplace', register: 'Registration' };

/** Owner master switch: a closed module shows a calm notice; owners still see it. */
export function ModuleGate({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data } = usePublicConfig();
  if (!data || data.isAdmin || moduleOpen(data.readiness, module)) return <>{children}</>;
  return <BixShell><main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
    <div className="eyebrow">{LABEL[module]}</div>
    <h1 className="section-title mt-2">TEMPORARILY <span>CLOSED</span></h1>
    <p className="mt-4 text-sm text-muted-foreground">This feature is being prepared and will reopen soon.</p>
    <Button asChild className="mt-6 rounded-full"><Link to="/">Back to HOME</Link></Button>
  </main></BixShell>;
}
