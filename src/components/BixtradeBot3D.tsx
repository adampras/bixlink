import { useRef, useState } from 'react';
import type { BixtradeBotMood, BixtradeStrategy } from '@/lib/bixtrade';

const LABEL: Record<BixtradeBotMood, string> = {
  sleep: 'Standby · add capital',
  scan: 'Memindai 6 bursa',
  hunt: 'Rute profit terkunci',
  trade: 'Eksekusi otomatis',
};

/** Named AI bot persona per arbitrage strategy (visual identity only). */
export const BOT_PERSONA: Record<BixtradeStrategy, { name: string; role: string; variant: 'aegis' | 'nexus' | 'vortex' }> = {
  core: { name: 'AEGIS-01', role: 'Guardian · BTC ETH', variant: 'aegis' },
  active: { name: 'NEXUS-X', role: 'Quant · 4 pair', variant: 'nexus' },
  triangular: { name: 'CHRONO-VORTEX', role: 'Flash · multi-leg', variant: 'vortex' },
};

/** Interactive CSS-3D robot that tilts with the finger, morphs per status and wears a strategy persona. */
export function BixtradeBot3D({ mood, routes = 0, strategy = 'core', mini = false }: { mood: BixtradeBotMood; routes?: number; strategy?: BixtradeStrategy; mini?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [boost, setBoost] = useState(false);
  const p = BOT_PERSONA[strategy];
  const tilt = (x: number, y: number) => {
    const el = ref.current; if (!el || mini) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', `${((x - r.left) / r.width - 0.5) * 36}deg`);
    el.style.setProperty('--rx', `${-((y - r.top) / r.height - 0.5) * 24}deg`);
  };
  const reset = () => { ref.current?.style.setProperty('--ry', '0deg'); ref.current?.style.setProperty('--rx', '0deg'); };
  const tap = () => { if (boost || mini) return; setBoost(true); setTimeout(() => setBoost(false), 950); };
  return (
    <div
      ref={ref}
      className={`bot3d${mini ? ' is-mini' : ''}`}
      data-mood={mood}
      data-variant={p.variant}
      data-boost={boost ? '1' : '0'}
      role={mini ? 'img' : 'button'}
      tabIndex={mini ? -1 : 0}
      aria-label={`${p.name} — ${LABEL[mood]}`}
      onPointerMove={e => tilt(e.clientX, e.clientY)}
      onPointerLeave={reset}
      onClick={tap}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } }}
    >
      <span className="bot3d-grid" aria-hidden />
      <span className="bot3d-halo" /><span className="bot3d-orbit" /><span className="bot3d-orbit o2" /><span className="bot3d-orbit o3" />
      {!mini && <span className="bot3d-net" aria-hidden>{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}</span>}
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
      {!mini && <span className="bot3d-tag"><i />{p.name} · {LABEL[mood]}{mood === 'hunt' && routes ? ` · ${routes}` : ''}</span>}
    </div>
  );
}
