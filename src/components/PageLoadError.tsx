import { useState } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageErrorRecovery } from '@/hooks/use-page-error-recovery';

/** Eager router fallback: it must not depend on the route chunk that failed. */
export function PageLoadError({ error, reset }: ErrorComponentProps) {
  const retry = usePageErrorRecovery(error, reset);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState('');

  const tryAgain = async () => {
    setRetrying(true);
    setNotice('');
    try {
      await retry();
    } catch {
      setNotice('Please check your connection and try again.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <div className="max-w-sm text-center" role="alert">
        <p className="text-xs font-semibold text-primary">BIXLINK</p>
        <h1 className="mt-3 text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check your connection, then try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => void tryAgain()} disabled={retrying}>
            <RefreshCw className={retrying ? 'motion-safe:animate-spin' : ''}/>
            {retrying ? 'Loading…' : 'Try again'}
          </Button>
          <Button asChild variant="outline"><a href="/">Go home</a></Button>
        </div>
        {notice && <p className="mt-3 text-sm text-muted-foreground" role="status">{notice}</p>}
      </div>
    </main>
  );
}