import { useEffect, useRef, useState } from 'react';
import logo from '@/assets/bixlink-logo-gold.webp';
import { usePublicConfig } from '@/lib/useMember';
import { splashDuration } from '@/lib/splash-settings';
import video from '@/assets/bixlink-splash.webm.asset.json';
import videoFallback from '@/assets/bixlink-splash.mp4.asset.json';
import poster from '@/assets/bixlink-splash-poster.jpg.asset.json';

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
    const buzz = window.setTimeout(() => { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([12, 40, 18]); } catch { /* unsupported */ } }, 2300);
    const duration = splashDuration(config?.splash);
    const leaveTimer = window.setTimeout(() => setLeaving(true), Math.max(duration - 180, 120));
    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => {
      window.clearTimeout(buzz);
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
          <video ref={videoRef} className="app-splash__video" poster={poster.url} muted autoPlay playsInline preload="auto" onError={() => setVideoFailed(true)} onPlaying={() => { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(14); } catch { /* unsupported */ } }} aria-hidden="true">
            <source src={video.url} type="video/webm" />
            <source src={videoFallback.url} type="video/mp4" />
          </video>
          <div className="app-splash__scrim" aria-hidden="true" />
          <div className="aix-stage aix-stage--over" aria-hidden="true">
            <i className="aix-flare" />
            <div className="aix-warp">{[0,1,2,3,4,5].map((n) => <i key={n} style={{ animationDelay: `${n * 0.18}s` }} />)}</div>
            <div className="aix-orbit"><i /><i /><i /></div>
            <div className="aix-emblem"><i className="aix-burst" /><img src={logo} width={120} height={120} alt="" /><i className="aix-eyes"><b /><b /></i></div>
          </div>
          <div className="app-splash__caption">
            <span className="splash-word aix-letters" aria-label="BIXLINK">{'BIXLINK'.split('').map((c, i) => <b key={i} style={{ animationDelay: `${2.1 + i * 0.08}s` }}>{c}</b>)}</span>
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
