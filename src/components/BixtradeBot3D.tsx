import { useRef, useState } from 'react';
import type { BixtradeBotMood } from '@/lib/bixtrade';

const LABEL: Record<BixtradeBotMood, string> = {
  sleep: 'Standby · add capital',
  scan: 'Scanning 6 venues',
  hunt: 'Route locked',
  trade: 'Executing trade',
};

/** Interactive CSS-3D robot that tilts with the finger and morphs per bot status. */
export function BixtradeBot3D({ mood, routes = 0 }: { mood: BixtradeBotMood; routes?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [boost, setBoost] = useState(false);
  const tilt = (x: number, y: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', `${((x - r.left) / r.width - 0.5) * 36}deg`);
    el.style.setProperty('--rx', `${-((y - r.top) / r.height - 0.5) * 24}deg`);
  };
  const reset = () => { ref.current?.style.setProperty('--ry', '0deg'); ref.current?.style.setProperty('--rx', '0deg'); };
  const tap = () => { if (boost) return; setBoost(true); setTimeout(() => setBoost(false), 950); };
  return (
    <div
      ref={ref}
      className="bot3d"
      data-mood={mood}
      data-boost={boost ? '1' : '0'}
      role="button"
      tabIndex={0}
      aria-label={`BIXTrade AI robot — ${LABEL[mood]}`}
      onPointerMove={e => tilt(e.clientX, e.clientY)}
      onPointerLeave={reset}
      onClick={tap}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } }}
    >
      <span className="bot3d-halo" /><span className="bot3d-orbit" /><span className="bot3d-orbit o2" />
      <div className="bot3d-rig">
        <div className="bot3d-body">
          <div className="bot3d-head">
            <span className="bot3d-ant l" /><span className="bot3d-ant r" />
            <span className="bot3d-ear l" /><span className="bot3d-ear r" />
            <div className="bot3d-visor"><i /><i /><b /></div>
          </div>
          <span className="bot3d-neck" />
          <div className="bot3d-torso">
            <span className="bot3d-plate l" /><span className="bot3d-plate r" />
            <span className="bot3d-core"><span /></span>
            <span className="bot3d-bars"><i /><i /><i /></span>
          </div>
          <div className="bot3d-arm l"><span className="bot3d-blade" /><span className="bot3d-hand" /></div>
          <div className="bot3d-arm r"><span className="bot3d-blade" /><span className="bot3d-hand" /></div>
          <span className="bot3d-jet" />
        </div>
      </div>
      <span className="bot3d-floor" />
      <span className="bot3d-tag"><i />{LABEL[mood]}{mood === 'hunt' && routes ? ` · ${routes}` : ''}</span>
    </div>
  );
}
