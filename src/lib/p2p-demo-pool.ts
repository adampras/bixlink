// Demo liquidity pool: deterministic, clock-seeded simulation shown with a DEMO tag.
// It never touches balances or the ledger; every member sees the same stream.
export const DEMO_POOL = { bix: 500_000, vusdt: 200_000, min: 0.3, max: 0.5, stepMs: 12_000 } as const;

export type DemoFill = { id: string; at: string; bix: number; price: number; side: 'BUY' | 'SELL'; who: string; demo: true };

const NODES = ['sin_node12', 'jkt_maker', 'dxb_p2p', 'kl_liquidity', 'hkg_maker', 'tyo_quant', 'lon_desk', 'syd_node3', 'bkk_trader', 'mnl_p2p', 'ist_flow', 'fra_node8'];

function rnd(seed: number) { let t = (seed + 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

/** Price always inside the 0.30–0.50 corridor, drifting smoothly over the day. */
export function demoPrice(slot: number) {
  const { min, max } = DEMO_POOL; const mid = (min + max) / 2, amp = (max - min) / 2;
  const wave = Math.sin(slot / 37) * 0.6 + Math.sin(slot / 11) * 0.25 + (rnd(slot) - 0.5) * 0.3;
  return Math.round(Math.min(max, Math.max(min, mid + amp * Math.max(-1, Math.min(1, wave)))) * 10000) / 10000;
}

export function demoFill(slot: number): DemoFill {
  const r = rnd(slot * 7 + 3); const price = demoPrice(slot);
  const bix = Math.round(150 + rnd(slot * 13 + 1) ** 2 * 6000);
  return { id: `demo-${slot}`, at: new Date(slot * DEMO_POOL.stepMs).toISOString(), bix, price, side: r < 0.5 ? 'BUY' : 'SELL', who: `@${NODES[Math.floor(rnd(slot * 5) * NODES.length)]}`, demo: true };
}

export function demoFeed(now: number, count = 12): DemoFill[] {
  const cur = Math.floor(now / DEMO_POOL.stepMs);
  return Array.from({ length: count }, (_, i) => demoFill(cur - i));
}

/** Pool inventory rotates around its starting size but never leaves the pool caps. */
export function demoPool(now: number) {
  const cur = Math.floor(now / DEMO_POOL.stepMs); let net = 0;
  for (let i = 0; i < 300; i++) { const f = demoFill(cur - i); net += f.side === 'BUY' ? -f.bix : f.bix; }
  const bix = Math.min(DEMO_POOL.bix, Math.max(DEMO_POOL.bix * 0.6, DEMO_POOL.bix * 0.8 + net));
  const price = demoPrice(cur);
  const vusdt = Math.min(DEMO_POOL.vusdt, Math.max(0, DEMO_POOL.vusdt - (bix - DEMO_POOL.bix * 0.8) * price));
  const day = demoFeed(now, 7200); const vol = day.reduce((s, f) => s + f.bix, 0);
  return { bix: Math.round(bix), vusdt: Math.round(vusdt), price, trades24h: day.length, volume24h: vol };
}
