import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { hit, newStrike, step, type Strike } from '@/lib/strike-sim';

const GOLD = '#FFD700', PURPLE = '#A855F7';

function gridTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0c14'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#3b2a5e'; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d')!; g.fillStyle = '#12131c'; g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 10) for (let x = 4; x < 64; x += 10) { const r = Math.random(); g.fillStyle = r > 0.8 ? GOLD : r > 0.6 ? PURPLE : '#1d1f2b'; g.fillRect(x, y, 5, 6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function City() {
  const [ground, win] = useMemo(() => [gridTexture(), windowTexture()], []);
  const towers = useMemo(() => Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2, r = 42 + (i % 3) * 7; return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 10 + ((i * 37) % 22), w: 4 + (i % 3) * 2 }; }), []);
  return <>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial map={ground} roughness={0.35} metalness={0.6} /></mesh>
    {towers.map((t, i) => <mesh key={i} position={[t.x, t.h / 2, t.z]}><boxGeometry args={[t.w, t.h, t.w]} /><meshStandardMaterial map={win} emissiveMap={win} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.5} metalness={0.4} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position-y={0.02}><ringGeometry args={[2.3, 2.6, 48]} /><meshBasicMaterial color={GOLD} /></mesh>
  </>;
}

function DroneMesh({ s, id }: { s: Strike; id: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const d = s.drones.find((x) => x.id === id); if (!d || !g.current) return;
    g.current.position.set(d.x, d.y + Math.sin(d.phase) * 0.4, d.z);
    g.current.lookAt(0, d.y, 0);
    const k = d.alive ? 1 : 1 + d.boom * 4; g.current.scale.setScalar(k);
    g.current.rotation.z = d.alive ? Math.sin(d.phase) * 0.2 : d.boom * 8;
  });
  return <group ref={g} userData={{ droneId: id }}>
    <mesh userData={{ droneId: id }}><octahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#2a1745" metalness={0.9} roughness={0.2} emissive={PURPLE} emissiveIntensity={0.5} /></mesh>
    <mesh position-z={0.6}><sphereGeometry args={[0.22, 12, 12]} /><meshBasicMaterial color="#ff3355" /></mesh>
    <mesh rotation-x={Math.PI / 2}><torusGeometry args={[1.2, 0.07, 6, 24]} /><meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} emissive={GOLD} emissiveIntensity={0.4} /></mesh>
  </group>;
}

function Gun({ kick }: { kick: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    kick.current *= Math.exp(-12 * Math.min(dt, 0.05));
    if (!g.current) return;
    g.current.position.copy(camera.position); g.current.quaternion.copy(camera.quaternion);
    g.current.translateX(0.35); g.current.translateY(-0.32); g.current.translateZ(-0.7 + kick.current * 0.15);
    g.current.rotateX(kick.current * 0.25);
  });
  return <group ref={g}>
    <mesh><boxGeometry args={[0.12, 0.14, 0.6]} /><meshStandardMaterial color="#1a1a22" metalness={0.9} roughness={0.25} /></mesh>
    <mesh position={[0, 0.02, -0.38]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.3, 10]} /><meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} /></mesh>
    <mesh position={[0, -0.12, 0.12]} rotation-x={0.3}><boxGeometry args={[0.09, 0.2, 0.1]} /><meshStandardMaterial color="#2a1745" /></mesh>
  </group>;
}

function Laser({ tracer }: { tracer: React.MutableRefObject<{ to: THREE.Vector3; life: number }> }) {
  const { camera } = useThree();
  const m = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const tr = tracer.current; tr.life -= dt; if (!m.current) return;
    m.current.visible = tr.life > 0; if (tr.life <= 0) return;
    const from = new THREE.Vector3(0.35, -0.25, -1).applyQuaternion(camera.quaternion).add(camera.position);
    const mid = from.clone().add(tr.to).multiplyScalar(0.5);
    m.current.position.copy(mid); m.current.lookAt(tr.to); m.current.scale.set(1, 1, from.distanceTo(tr.to));
  });
  return <mesh ref={m} visible={false}><boxGeometry args={[0.05, 0.05, 1]} /><meshBasicMaterial color={GOLD} /></mesh>;
}

function World({ s, look, onTick, shootReq, kick }: { s: Strike; look: React.MutableRefObject<{ yaw: number; pitch: number }>; onTick: () => void; shootReq: React.MutableRefObject<{ x: number; y: number } | null>; kick: React.MutableRefObject<number> }) {
  const { camera, scene } = useThree();
  const [ids, setIds] = useState<number[]>([]);
  const tracer = useRef({ to: new THREE.Vector3(), life: 0 });
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const acc = useRef(0);
  useFrame((st, delta) => {
    const dt = Math.min(delta, 0.05);
    step(s, dt);
    camera.position.set(0, 1.7, 0);
    camera.rotation.set(look.current.pitch, look.current.yaw, 0, 'YXZ');
    const req = shootReq.current;
    if (req) {
      shootReq.current = null; kick.current = 1;
      ray.setFromCamera(new THREE.Vector2(req.x, req.y), camera);
      const hits = ray.intersectObjects(scene.children, true);
      const h = hits.find((x) => x.object.userData['droneId'] !== undefined);
      if (h) hit(s, h.object.userData['droneId'] as number); else s.combo = 0;
      tracer.current = { to: (h?.point ?? ray.ray.at(60, new THREE.Vector3())).clone(), life: 0.08 };
    }
    acc.current += dt;
    if (acc.current > 0.1) { acc.current = 0; const next = s.drones.map((d) => d.id); if (next.join() !== ids.join()) setIds(next); onTick(); st.gl.domElement.parentElement?.setAttribute('data-scene-ready', '1'); }
  });
  return <>
    {ids.map((id) => <DroneMesh key={id} s={s} id={id} />)}
    <Gun kick={kick} /><Laser tracer={tracer} />
  </>;
}

export default function CyberStrike({ onScore }: { onScore: (n: number) => void }) {
  const sim = useRef<Strike>(newStrike());
  const look = useRef({ yaw: 0, pitch: 0.05 });
  const shootReq = useRef<{ x: number; y: number } | null>(null);
  const kick = useRef(0);
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);
  const [hud, setHud] = useState({ t: 60, hp: 100, score: 0, combo: 0, over: false });
  const [run, setRun] = useState(false);
  const [key, setKey] = useState(0);
  const reported = useRef(false);
  const tick = () => { const s = sim.current; setHud({ t: s.t, hp: s.hp, score: s.score, combo: s.combo, over: s.over }); if (s.over && !reported.current) { reported.current = true; onScore(s.score); } };
  const start = () => { sim.current = newStrike(); reported.current = false; look.current = { yaw: 0, pitch: 0.05 }; setKey((k) => k + 1); setRun(true); };
  useEffect(() => () => { reported.current = true; }, []);
  const down = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, moved: 0 }; };
  const move = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy); look.current.yaw -= dx * 0.006; look.current.pitch = Math.max(-0.4, Math.min(0.9, look.current.pitch - dy * 0.005)); };
  const up = (e: React.PointerEvent) => { const d = drag.current; drag.current = null; if (!d || d.moved > 12 || sim.current.over) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); shootReq.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
  return <div className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-2xl border border-primary/40 bg-background shadow-[0_0_40px_-10px] shadow-accent/60">
    {run && <Canvas key={key} camera={{ fov: 70, position: [0, 1.7, 0] }} dpr={[1, 1.75]} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <color attach="background" args={['#07060d']} /><fog attach="fog" args={['#120a22', 25, 85]} />
      <ambientLight intensity={0.4} /><hemisphereLight args={[PURPLE, '#0b0c14', 0.8]} /><pointLight position={[0, 12, 0]} intensity={60} color={GOLD} />
      <Environment resolution={64}><Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} /><Lightformer intensity={1.5} color={PURPLE} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} /></Environment>
      <City /><World s={sim.current} look={look} onTick={tick} shootReq={shootReq} kick={kick} />
    </Canvas>}
    {run && <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2 font-mono text-xs">
        <div className="rounded-lg border border-primary/40 bg-background/70 px-2 py-1 text-primary">SCORE {hud.score}</div>
        <div className="rounded-lg border border-accent/40 bg-background/70 px-2 py-1">⏱ {Math.ceil(hud.t)}s</div>
      </div>
      <div className="absolute left-3 top-12 h-2 w-32 overflow-hidden rounded-full bg-background/70"><div className="h-full bg-gradient-to-r from-destructive to-primary transition-all" style={{ width: `${hud.hp}%` }} /></div>
      {hud.combo > 1 && <p className="absolute inset-x-0 top-20 text-center text-2xl font-black italic text-primary drop-shadow-lg">COMBO ×{Math.min(5, hud.combo)}</p>}
      <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/80"><div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" /></div>
      <p className="absolute inset-x-0 bottom-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">Geser untuk membidik · Ketuk drone untuk menembak</p>
    </div>}
    {(!run || hud.over) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 text-center backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-[0.3em] text-accent">3D Arena · Season 0</p>
      <h3 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-3xl font-black italic text-transparent">CYBER STRIKE</h3>
      {hud.over && run && <p className="font-mono text-lg">Skor: <span className="text-primary">{hud.score}</span></p>}
      <p className="text-xs text-muted-foreground">Pertahankan menara dari serbuan drone selama 60 detik.</p>
      <button onClick={start} className="rounded-xl bg-gradient-to-b from-primary to-primary/70 px-6 py-3 font-black tracking-wider text-primary-foreground shadow-lg shadow-primary/40 active:scale-95">{run ? 'MAIN LAGI' : 'MULAI'}</button>
    </div>}
  </div>;
}
