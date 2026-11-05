import { useEffect } from 'react';

/** App-wide battery saver: pauses CSS motion while the app is hidden, flags low-power devices
 *  (Battery API / save-data / few cores) so heavy glass blur and looping effects are reduced,
 *  and stops off-screen animations via IntersectionObserver. Presentation only. */
export function PowerSaver() {
  useEffect(() => {
    const root = document.documentElement;
    const vis = () => { root.dataset['appHidden'] = document.hidden ? '1' : '0'; };
    vis();
    document.addEventListener('visibilitychange', vis);

    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void }> };
    const setLow = (low: boolean) => { root.dataset['lowPower'] = low ? '1' : '0'; };
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || !!nav.connection?.saveData;
    setLow(weak);
    nav.getBattery?.().then(b => {
      const upd = () => setLow(weak || (!b.charging && b.level <= 0.3));
      upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
    }).catch(() => {});

    // Pause looping animations of elements that are scrolled off-screen.
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
      for (const e of es) (e.target as HTMLElement).classList.toggle('ps-off', !e.isIntersecting);
    }, { rootMargin: '120px' }) : null;
    const sel = '.robot-stage,.robot-fox,.hero-fox,.robot-core,.robot-ring-one,.robot-ring-two,.pulse-dot,.terminal-live,.tokenomics-donut';
    const seen = new WeakSet<Element>();
    const scan = () => document.querySelectorAll(sel).forEach(el => { if (!seen.has(el)) { seen.add(el); io?.observe(el); } });
    let mo: MutationObserver | null = null;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      scan();
      mo = new MutationObserver(() => scan());
      mo.observe(document.body, { childList: true, subtree: true });
    };
    // Toggling a class on a server-rendered node before React finishes hydrating makes
    // hydration compare a className it never rendered, so wait until the tree is hydrated.
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = ric ? ric(start, { timeout: 600 }) : window.setTimeout(start, 300);
    return () => { document.removeEventListener('visibilitychange', vis); io?.disconnect(); mo?.disconnect(); window.clearTimeout(handle); };
  }, []);
  return null;
}
