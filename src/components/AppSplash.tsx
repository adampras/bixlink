import { useEffect, useRef, useState } from 'react';
import logo from '@/assets/bixlink-logo-gold.webp';
import splashWebm from '@/assets/bixlink-splash.webm.asset.json';
import splashMp4 from '@/assets/bixlink-splash.mp4.asset.json';
import splashPoster from '@/assets/bixlink-splash-poster.jpg.asset.json';
import { usePublicConfig } from '@/lib/useMember';
import { splashDuration } from '@/lib/splash-settings';

let startedThisLoad = false;

export function AppSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    const leaveTimer = window.setTimeout(() => setLeaving(true), Math.max(duration - 180, 120));
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

  const reduced = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const showVideo = !reduced && !videoFailed;

  return (
    <div
      className={`app-splash ${showVideo ? 'app-splash--video' : ''} ${leaving ? 'app-splash--leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="BIXLINK is loading"
    >
      {showVideo ? (
        <>
          <video
            ref={videoRef}
            className="app-splash__video"
            poster={splashPoster.url}
            muted
            playsInline
            autoPlay
            preload="auto"
            aria-hidden="true"
            onError={() => setVideoFailed(true)}
          >
            <source src={splashWebm.url} type="video/webm" />
            <source src={splashMp4.url} type="video/mp4" />
          </video>
          <div className="app-splash__scrim" aria-hidden="true" />
          <div className="app-splash__caption">
            <span className="splash-word">BIXLINK</span>
            <small className="splash-sub">GLOBAL CRYPTO ECOSYSTEM</small>
          </div>
        </>
      ) : (
        <button type="button" onClick={dismiss} className="splash-emblem" aria-label="Skip intro"><img src={logo} width={84} height={84} alt="BIXLINK fox emblem"/><span className="splash-word">BIXLINK</span><small className="splash-sub">GLOBAL CRYPTO ECOSYSTEM</small></button>
      )}
      <button type="button" onClick={dismiss} className="app-splash__skip" aria-label="Skip intro">Skip</button>
    </div>
  );
}
