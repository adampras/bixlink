import { useEffect, useState } from 'react';
import splashBackground from '@/assets/bixlink-splash-bg.jpg';

const SPLASH_DURATION_MS = 2800;

export function AppSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem('bixlink-splash-seen') === '1') return;

    setVisible(true);

    const leaveTimer = window.setTimeout(() => setLeaving(true), SPLASH_DURATION_MS - 450);
    const removeTimer = window.setTimeout(() => {
      window.sessionStorage.setItem('bixlink-splash-seen', '1');
      setVisible(false);
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  const dismiss = () => {
    window.sessionStorage.setItem('bixlink-splash-seen', '1');
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 420);
  };

  if (!visible) return null;

  return (
    <div
      className={`app-splash ${leaving ? 'app-splash--leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="BIXLINK is loading"
    >
      <img className="app-splash__art" src={splashBackground} alt="" />
      <div className="app-splash__shade" />
      <div className="app-splash__topline">BIXLINK · SECURE ACCESS</div>
      <div className="app-splash__content">
        <div className="app-splash__brand">BIXLINK</div>
        <div className="app-splash__tagline">
          <span>STAKE BIXCOIN</span><i>•</i><span>EXCHANGE</span><i>•</i><span>DEFI</span><i>•</i><span>RWA NARRATIVE</span>
        </div>
        <div className="app-splash__status"><span /> Initializing secure member experience</div>
        <div className="app-splash__track"><i /></div>
        <button type="button" className="app-splash__skip" onClick={dismiss}>Skip</button>
      </div>
    </div>
  );
}