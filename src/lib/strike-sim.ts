// Cyber Strike rules — plain TS, no React/three.
export const ROUND_SECONDS = 60;
export const DRONE_SPEED = 2.2;
export const SPAWN_EVERY = 1.1;
export const HIT_RADIUS = 1.2;
export type Drone = { id: number; x: number; y: number; z: number; phase: number; alive: boolean; boom: number };
export type Strike = { t: number; hp: number; score: number; combo: number; drones: Drone[]; nextSpawn: number; seq: number; over: boolean };
export const newStrike = (): Strike => ({ t: ROUND_SECONDS, hp: 100, score: 0, combo: 0, drones: [], nextSpawn: 0.5, seq: 0, over: false });
export function step(s: Strike, dt: number, rnd: () => number = Math.random) {
  if (s.over) return;
  s.t -= dt; s.nextSpawn -= dt;
  if (s.nextSpawn <= 0) {
    const a = rnd() * Math.PI * 2, r = 26 + rnd() * 8;
    s.drones.push({ id: s.seq++, x: Math.cos(a) * r, y: 2 + rnd() * 6, z: Math.sin(a) * r, phase: rnd() * 6, alive: true, boom: 0 });
    s.nextSpawn = Math.max(0.45, SPAWN_EVERY - (ROUND_SECONDS - s.t) * 0.01);
  }
  for (const d of s.drones) {
    if (!d.alive) { d.boom += dt; continue; }
    const len = Math.hypot(d.x, d.z) || 1;
    d.x -= (d.x / len) * DRONE_SPEED * dt; d.z -= (d.z / len) * DRONE_SPEED * dt;
    d.phase += dt * 3;
    if (len < 2.5) { d.alive = false; d.boom = 0.6; s.hp -= 15; s.combo = 0; }
  }
  s.drones = s.drones.filter((d) => d.alive || d.boom < 0.6);
  if (s.t <= 0 || s.hp <= 0) { s.over = true; s.t = Math.max(0, s.t); s.hp = Math.max(0, s.hp); }
}
export function hit(s: Strike, id: number) {
  const d = s.drones.find((x) => x.id === id && x.alive);
  if (!d || s.over) return false;
  d.alive = false; s.combo += 1; s.score += 10 * Math.min(5, s.combo);
  return true;
}
