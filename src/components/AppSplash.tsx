import { useEffect, useState } from 'react';
import splashCoin from '@/assets/bixcoin-splash-coin.jpg';
import { Button } from '@/components/ui/button';

const SPLASH_DURATION_MS = 900;
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
      <div className="app-splash__frame">
      <div className="app-splash__topline">Official · BIXCOIN</div>
      <div className="app-splash__focus">
        <div className="app-splash__rings" aria-hidden="true"><i/><i/><i/></div>
        <img className="app-splash__coin" src={splashCoin} width={256} height={256} alt="Gold BIXCOIN emblem" decoding="async" />
      </div>
      <div className="app-splash__content">
        <div className="app-splash__brand">BIXCOIN</div>
        <div className="app-splash__tagline">
          <span>Ecosystem</span><i>|</i><span>Asset</span><i>|</i><span>Vault</span>
        </div>
        <div className="app-splash__loading">
          <div className="app-splash__status"><span>System status</span><b>Opening BIXCOIN…</b></div>
          <div className="app-splash__track" aria-hidden="true"><i /></div>
        </div>
        <Button type="button" variant="ghost" className="app-splash__skip" onClick={dismiss}>Enter Vault</Button>
      </div>
      </div>
    </div>
  );
}