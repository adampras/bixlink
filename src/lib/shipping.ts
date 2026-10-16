export type Region = 'local' | 'international';
export type Courier = { id: string; name: string; region: Region; baseUsd: number; perItemUsd: number; eta: string };
export const COURIERS: Courier[] = [
  { id: 'jne-reg', name: 'JNE Reguler', region: 'local', baseUsd: 1.5, perItemUsd: 0.5, eta: '2–4 days' },
  { id: 'jne-yes', name: 'JNE YES', region: 'local', baseUsd: 3, perItemUsd: 0.8, eta: '1 day' },
  { id: 'jnt', name: 'J&T Express', region: 'local', baseUsd: 1.4, perItemUsd: 0.5, eta: '2–3 days' },
  { id: 'sicepat', name: 'SiCepat', region: 'local', baseUsd: 1.3, perItemUsd: 0.5, eta: '2–3 days' },
  { id: 'dhl', name: 'DHL Express', region: 'international', baseUsd: 35, perItemUsd: 6, eta: '3–6 days' },
  { id: 'fedex', name: 'FedEx Priority', region: 'international', baseUsd: 32, perItemUsd: 5.5, eta: '4–7 days' },
];
export type CartLine = { id: string; name: string; priceUsd: number; qty: number };
export const cartUnits = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) => Math.round(lines.reduce((s, l) => s + l.priceUsd * l.qty, 0) * 100) / 100;
export function shippingCost(courierId: string, units: number) {
  const c = COURIERS.find(x => x.id === courierId);
  if (!c || units <= 0) return 0;
  return Math.round((c.baseUsd + c.perItemUsd * Math.max(0, units - 1)) * 100) / 100;
}
export const ORDER_STEPS = ['pending', 'processing', 'shipped', 'completed'] as const;
/** P2P price corridor: dev buyback floor to presale ceiling. */
export const P2P_FLOOR = 0.35;
export const P2P_CEILING = 0.5;
export const p2pPriceAllowed = (p: number) => Number.isFinite(p) && p >= P2P_FLOOR && p <= P2P_CEILING;
