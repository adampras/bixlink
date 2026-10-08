import { useEffect, useState } from 'react';
import splashImage from '@/assets/bixcoin-reactor-splash.jpg.asset.json';
import { SPLASH_DURATION_MS } from '@/lib/booster-visual';

let startedThisLoad = false;

export function AppSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = window.sessionStorage.getItem('bixlink-splash-seen') === '1'; } catch { /* Storage can be restricted. */ }
    if (startedThisLoad || seen) return;
    startedThisLoad = true;
    try { window.sessionStorage.setItem('bixlink-splash-seen', '1'); } catch { /* In-memory guard covers this load. */ }
    if (!['/', '/auth', '/register'].includes(window.location.pathname)) return;
    setVisible(true);
    const leaveTimer = window.setTimeout(() => setLeaving(true), SPLASH_DURATION_MS - 180);
    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={`app-splash ${leaving ? 'app-splash--leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="BIXCOIN is loading"
    >
      <img className="h-auto max-h-[85dvh] w-full max-w-4xl object-contain" src={splashImage.url} width={1152} height={768} alt="BIXCOIN reactor" loading="eager" onClick={dismiss}/>
    </div>
  );
}