import { useEffect, useState } from 'react';
import logo from '@/assets/bixlink-logo-gold.webp';
import { usePublicConfig } from '@/lib/useMember';
import { splashDuration } from '@/lib/splash-settings';

let startedThisLoad = false;

export function AppSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { data: config, isFetched } = usePublicConfig();

  useEffect(() => {
    if (!isFetched || !['/', '/auth', '/register'].includes(window.location.pathname)) return;
    let seen = false;
    try { seen = window.sessionStorage.getItem('bixlink-splash-seen') === '1'; } catch { /* Storage can be restricted. */ }
    if (startedThisLoad || seen) return;
    startedThisLoad = true;
    try { window.sessionStorage.setItem('bixlink-splash-seen', '1'); } catch { /* In-memory guard covers this load. */ }
    setVisible(true);
    const duration = splashDuration(config?.splash);
    const leaveTimer = window.setTimeout(() => setLeaving(true), duration - 180);
    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, [isFetched]);

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
      <button type="button" onClick={dismiss} className="splash-emblem" aria-label="Skip intro"><img src={logo} width={84} height={84} alt="BIXLINK fox emblem"/><span className="splash-word">BIXLINK</span><small className="splash-sub">GLOBAL CRYPTO ECOSYSTEM</small></button>
    </div>
  );
}