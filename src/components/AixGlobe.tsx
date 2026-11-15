import { useEffect, useRef } from 'react';

type V = [number, number, number];

/** Display-only constellation globe (canvas 2D). Smooth depth falloff, no binary front/back switching, so nothing flickers. */
export function AixGlobe({ labels = ['BIX', 'USDT', 'BTC', 'ETH', 'BNB', 'SOL'] }: { labels?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = 220; const pts: V[] = [];
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(1 - y * y); const t = i * 2.399963; pts.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
    const hubs: V[] = labels.map((_, i) => { const lat = (i % 2 ? -0.35 : 0.4) * (i === 0 ? 0 : 1); const lon = (i / labels.length) * Math.PI * 2; const r = Math.cos(lat); return [Math.cos(lon) * r, Math.sin(lat), Math.sin(lon) * r]; });
    const rings = [0.45, -0.55].map(tilt => Array.from({ length: 72 }, (_, k) => { const a = (k / 72) * Math.PI * 2; const x = Math.cos(a) * 1.18, z = Math.sin(a) * 1.18; return [x, z * Math.sin(tilt), z * Math.cos(tilt)] as V; }));
    let rot = 0, vel = 0, last = 0, raf = 0, down: number | null = null, w = 0, h = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); const nw = c.clientWidth, nh = c.clientHeight; if (nw === w && nh === h) return; w = nw; h = nh; c.width = Math.round(w * d); c.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(c);
    const TILT = 0.32, ct = Math.cos(TILT), st = Math.sin(TILT);
    const proj = (p: V, R: number, cx: number, cy: number) => { const ca = Math.cos(rot), sa = Math.sin(rot); const x = p[0] * ca - p[2] * sa, z = p[0] * sa + p[2] * ca; const y = p[1] * ct - z * st; const z2 = p[1] * st + z * ct; return { x: cx + x * R, y: cy - y * R, z: z2 }; };
    const depth = (z: number) => { const k = (z + 1) / 2; return k * k; };
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
      if (down == null) { rot += (reduce ? 0 : dt * 0.1) + vel; vel *= 0.94; }
      const R = Math.min(w, h) * 0.36, cx = w / 2, cy = h / 2;
      ctx.clearRect(0, 0, w, h);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.5); halo.addColorStop(0, 'rgba(45,212,191,0.10)'); halo.addColorStop(0.6, 'rgba(124,58,237,0.08)'); halo.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
      const core = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R); core.addColorStop(0, 'rgba(124,58,237,0.22)'); core.addColorStop(1, 'rgba(3,5,10,0.6)'); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(45,212,191,0.22)'; ctx.lineWidth = 1; ctx.stroke();
      // back ring halves, dots, front ring halves — painter's order by depth
      const ringPts = rings.map(r => r.map(p => proj(p, R, cx, cy)));
      const drawRing = (front: boolean) => ringPts.forEach((rp, ri) => rp.forEach((q, k) => { if ((q.z > 0) !== front) return; ctx.globalAlpha = 0.08 + 0.5 * depth(q.z); ctx.fillStyle = ri ? '#2dd4bf' : '#FFD700'; ctx.beginPath(); ctx.arc(q.x, q.y, k % 6 === 0 ? 1.6 : 0.9, 0, 6.283); ctx.fill(); }));
      drawRing(false);
      const qs = pts.map(p => proj(p, R, cx, cy)).sort((a, b) => a.z - b.z);
      for (const q of qs) { const d = depth(q.z); ctx.globalAlpha = 0.1 + 0.7 * d; ctx.fillStyle = d > 0.55 ? '#e9d5ff' : '#7c3aed'; ctx.beginPath(); ctx.arc(q.x, q.y, 0.6 + d * 0.9, 0, 6.283); ctx.fill(); }
      const hp = hubs.map(p => proj(p, R * 1.0, cx, cy));
      for (let i = 1; i < hp.length; i++) { const a = hp[0]!, b = hp[i]!; const vis = Math.min(depth(a.z), depth(b.z)); if (vis < 0.15) continue; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - R * 0.18; ctx.globalAlpha = 0.25 * vis; ctx.strokeStyle = '#2dd4bf'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
        const k = ((t / 4200) + i * 0.2) % 1; const px = (1 - k) ** 2 * a.x + 2 * (1 - k) * k * mx + k * k * b.x, py = (1 - k) ** 2 * a.y + 2 * (1 - k) * k * my + k * k * b.y; ctx.globalAlpha = 0.7 * vis * Math.sin(k * Math.PI); ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 6.283); ctx.fill(); }
      drawRing(true);
      ctx.font = '700 9px ui-monospace, monospace'; ctx.textBaseline = 'middle';
      hp.map((q, i) => ({ q, i })).sort((a, b) => a.q.z - b.q.z).forEach(({ q, i }) => { const d = depth(q.z); if (d < 0.08) return; const txt = labels[i]!; const tw = ctx.measureText(txt).width + 12; ctx.globalAlpha = d; ctx.fillStyle = 'rgba(3,5,10,0.78)'; ctx.strokeStyle = i === 0 ? 'rgba(255,215,0,0.7)' : 'rgba(45,212,191,0.5)'; ctx.beginPath(); ctx.roundRect(q.x + 6, q.y - 8, tw, 16, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = i === 0 ? '#FFD700' : '#ccfbf1'; ctx.fillText(txt, q.x + 12, q.y); ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, 6.283); ctx.fill(); });
      ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const pd = (e: PointerEvent) => { down = e.clientX; vel = 0; };
    const pm = (e: PointerEvent) => { if (down == null) return; const d = (e.clientX - down) / 160; rot += d; vel = d * 0.25; down = e.clientX; };
    const pu = () => { down = null; };
    c.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); };
  }, [labels]);
  return <section className="aix-globe relative overflow-hidden rounded-3xl p-3">
    <p className="aix-globe__kicker relative z-10 text-[9px] font-black tracking-[0.3em]">BIXLINK GLOBAL LIQUIDITY RADAR</p>
    <canvas ref={ref} className="aix-globe__canvas block h-64 w-full touch-pan-y" aria-label="Bola konstelasi pasar, geser untuk memutar" role="img"/>
    <p className="relative z-10 text-center text-[9px] text-muted-foreground">Visual ilustrasi · bukan data eksekusi</p>
  </section>;
}
