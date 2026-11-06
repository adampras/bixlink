export type FleetConfig = { enabled: boolean; total: number; activePct: number; minPrice: number; maxPrice: number; minUsdt: number };
export const DEFAULT_FLEET: FleetConfig = { enabled: false, total: 50, activePct: 48, minPrice: 0.35, maxPrice: 0.5, minUsdt: 10 };

const A = ['Garuda', 'Nusa', 'Aurora', 'Titan', 'Orion', 'Zenith', 'Vega', 'Atlas', 'Nova', 'Sakura', 'Borneo', 'Celebes', 'Sumatra', 'Komodo', 'Phoenix', 'Falcon', 'Emerald', 'Onyx', 'Lumen', 'Apex'];
const B = ['Vault', 'Desk', 'Liquidity', 'Capital', 'Exchange', 'Trade'];

function rnd(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export type FleetMerchant = { name: string; price: number; stockBix: number; fills: number };

/** Deterministic Official Desk fleet: active count = total × activePct%, prices spread inside the owner corridor, re-shuffled hourly. */
export function fleetMerchants(cfg: FleetConfig, now = Date.now()): FleetMerchant[] {
  const active = Math.max(1, Math.round(cfg.total * cfg.activePct / 100));
  const hour = Math.floor(now / 3_600_000);
  const out: FleetMerchant[] = [];
  for (let i = 0; i < cfg.total; i++) {
    const r = rnd(i * 7919 + 17);
    const name = `${A[Math.floor(r() * A.length)]} ${B[Math.floor(r() * B.length)]} #${String(i + 1).padStart(2, '0')}`;
    const hr = rnd(i * 104729 + hour);
    const price = Number((cfg.minPrice + hr() * (cfg.maxPrice - cfg.minPrice)).toFixed(4));
    out.push({ name, price, stockBix: Math.round(800 + hr() * 2700), fills: Math.round(12 + r() * 56) });
  }
  const order = rnd(hour);
  return out.map(m => ({ m, k: order() })).sort((a, b) => a.k - b.k).slice(0, active).map(x => x.m).sort((a, b) => a.price - b.price);
}
