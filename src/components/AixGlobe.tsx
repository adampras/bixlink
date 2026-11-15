import { useEffect, useRef } from 'react';

/** Display-only rotating constellation globe (canvas 2D, no market data implied). */
export function AixGlobe({ labels = ['BIX', 'USDT', 'BTC', 'ETH', 'BNB', 'SOL'] }: { labels?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = getComputedStyle(document.documentElement);
    const gold = css.getPropertyValue('--aix-gold').trim() || '#FFD700';
    const violet = css.getPropertyValue('--aix-violet').trim() || '#A855F7';
    const N = 260; const pts: [number, number, number][] = [];
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(1 - y * y); const t = i * 2.399963; pts.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
    const hubs = labels.map((_, i) => pts[Math.floor((i + 0.5) * N / labels.length)]!);
    let rot = 0, drag = 0, last = 0, raf = 0, down: number | null = null;
    const size = () => { const w = c.clientWidth, h = c.clientHeight, d = Math.min(2, devicePixelRatio || 1); c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(c);
    const proj = (p: [number, number, number], R: number, cx: number, cy: number) => { const ca = Math.cos(rot), sa = Math.sin(rot); const x = p[0] * ca - p[2] * sa, z = p[0] * sa + p[2] * ca; const tilt = 0.35; const y = p[1] * Math.cos(tilt) - z * Math.sin(tilt); const z2 = p[1] * Math.sin(tilt) + z * Math.cos(tilt); return { x: cx + x * R, y: cy + y * R, z: z2 }; };
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
      if (!reduce && down == null) rot += dt * 0.25 + drag; drag *= 0.92;
      const w = c.clientWidth, h = c.clientHeight, R = Math.min(w, h) * 0.38, cx = w / 2, cy = h / 2;
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25); g.addColorStop(0, violet + '33'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (const p of pts) { const q = proj(p, R, cx, cy); const a = q.z > 0 ? 0.85 : 0.18; ctx.fillStyle = q.z > 0 ? gold : violet; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q.x, q.y, q.z > 0 ? 1.3 : 0.9, 0, 6.283); ctx.fill(); }
      const hp = hubs.map(p => proj(p, R, cx, cy));
      ctx.lineWidth = 1; for (let i = 0; i < hp.length; i++) for (let j = i + 1; j < hp.length; j++) { const a = hp[i]!, b = hp[j]!; if (a.z < -0.2 && b.z < -0.2) continue; ctx.globalAlpha = 0.35; ctx.strokeStyle = violet; ctx.beginPath(); ctx.moveTo(a.x, a.y); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - R * 0.25; ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
        const k = ((t / 1600) + i * 0.17 + j * 0.11) % 1; const px = (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * mx + k * k * b.x, py = (1 - k) * (1 - k) * a.y + 2 * (1 - k) * k * my + k * k * b.y; ctx.globalAlpha = 0.9; ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill(); }
      ctx.font = '700 10px ui-monospace, monospace'; hp.forEach((q, i) => { if (q.z < -0.1) return; ctx.globalAlpha = 1; ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(q.x, q.y, 3.2, 0, 6.283); ctx.fill(); ctx.fillText(labels[i]!, q.x + 6, q.y - 5); });
      ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const pd = (e: PointerEvent) => { down = e.clientX; }; const pm = (e: PointerEvent) => { if (down == null) return; const d = (e.clientX - down) / 120; rot += d; drag = d * 0.2; down = e.clientX; }; const pu = () => { down = null; };
    c.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); };
  }, [labels]);
  return <section className="aix-globe relative overflow-hidden rounded-3xl p-3">
    <p className="relative z-10 text-[9px] font-black tracking-[0.3em] text-primary">BIXLINK GLOBAL LIQUIDITY RADAR</p>
    <canvas ref={ref} className="aix-globe__canvas block h-64 w-full touch-pan-y" aria-label="Bola konstelasi pasar, geser untuk memutar" role="img"/>
    <p className="relative z-10 text-center text-[9px] text-muted-foreground">Visual ilustrasi · bukan data eksekusi</p>
  </section>;
}
