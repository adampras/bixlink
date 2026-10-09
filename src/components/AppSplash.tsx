import { useEffect, useState } from 'react';
import splashVideo from '@/assets/booster-orbital.webm.asset.json';
import fallbackVideo from '@/assets/booster-orbital.mp4.asset.json';
import splashPoster from '@/assets/booster-orbital-poster.jpg.asset.json';
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
      <video className="h-auto max-h-[85dvh] w-full max-w-4xl object-contain" poster={splashPoster.url} muted autoPlay loop playsInline onClick={dismiss} aria-label="BIXCOIN splash video"><source src={splashVideo.url} type="video/webm"/><source src={fallbackVideo.url} type="video/mp4"/></video>
    </div>
  );
}