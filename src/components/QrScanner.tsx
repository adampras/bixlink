import { useEffect, useRef, useState } from 'react';
import { X, ImageUp, Flashlight, SwitchCamera, RotateCcw } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Detector = { detect: (s: unknown) => Promise<{ rawValue: string }[]> };
const getBD = () => (globalThis as unknown as { BarcodeDetector?: new (o: unknown) => Detector }).BarcodeDetector;
/** html5-qrcode throws synchronously when the camera is not running; swallow both sync and async failures. */
const safeStop = (s: any) => { try { const st = s?.getState?.(); if (st !== undefined && st !== 2 && st !== 3) return; void s?.stop?.()?.catch?.(() => {}); } catch { /* not running */ } };

/** Full-screen QR scanner: native BarcodeDetector on a live camera stream (fast in Android/APK), html5-qrcode fallback, torch + flip + retry. */
export function QrScanner({ onResult, onClose, title = 'Scan BIX PAY QR', hint = "Point the camera at a member's BIX PAY QR", continuous = false }: { onResult: (v: string) => void; onClose: () => void; title?: string; hint?: string; continuous?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const lib = useRef<any>(null);
  const stream = useRef<MediaStream | null>(null);
  const last = useRef({ t: '', at: 0 });
  const [err, setErr] = useState('');
  const [back, setBack] = useState(true);
  const [run, setRun] = useState(0);
  const [torch, setTorch] = useState(false);
  const [canTorch, setCanTorch] = useState(false);

  useEffect(() => {
    let stopped = false; let raf = 0; let paused = false;
    setErr(''); setTorch(false); setCanTorch(false);
    const hit = (text: string) => {
      try { navigator.vibrate?.(30); } catch { /* optional */ }
      if (!continuous) { stopped = true; onResult(text); return; }
      const now = Date.now(); if (text === last.current.t && now - last.current.at < 4000) return;
      last.current = { t: text, at: now }; paused = true; onResult(text); setTimeout(() => { paused = false; }, 1400);
    };
    const fail = () => setErr('Kamera belum bisa dibuka. Izinkan akses kamera di pengaturan HP, lalu ketuk Coba lagi — atau pilih QR dari galeri.');
    const facing = back ? 'environment' : 'user';
    const BD = getBD();
    const startLib = () => import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode('bix-scanner'); lib.current = s;
      s.start({ facingMode: facing }, { fps: 12, qrbox: (w: number, h: number) => { const m = Math.floor(Math.min(w, h) * 0.7); return { width: m, height: m }; } }, t => { if (!paused) hit(t); }, () => {})
        .then(() => { if (stopped) safeStop(s); }).catch(fail);
    }).catch(fail);
    (async () => {
      if (!BD || !navigator.mediaDevices?.getUserMedia) { void startLib(); return; }
      try {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
          .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
        if (stopped) { st.getTracks().forEach(t => t.stop()); return; }
        stream.current = st;
        const track = st.getVideoTracks()[0];
        setCanTorch(!!(track?.getCapabilities?.() as any)?.torch);
        const v = document.createElement('video'); v.className = 'qr-native'; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = st;
        box.current?.replaceChildren(v); await v.play();
        const det = new BD({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped) return;
          if (!paused && v.readyState >= 2) { try { const r = await det.detect(v); const t = r[0]?.rawValue; if (t) hit(t); } catch { /* frame */ } }
          if (!stopped) raf = window.setTimeout(() => void tick(), 120);
        };
        void tick();
      } catch { if (!stopped) void startLib(); }
    })();
    return () => { stopped = true; clearTimeout(raf); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; safeStop(lib.current); lib.current = null; box.current?.replaceChildren(); };
  }, [back, run]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0]; if (!track) return;
    try { await track.applyConstraints({ advanced: [{ torch: !torch } as any] }); setTorch(v => !v); } catch { setCanTorch(false); }
  };

  return <div className="qr-full" role="dialog" aria-label={title} style={{ maxHeight: 'none' }}>
    <div id="bix-scanner" ref={box} className="qr-full__cam"/>
    <div className="qr-full__mask" aria-hidden><div className="qr-full__frame"><i/><i/><i/><i/><span className="qr-full__laser"/></div></div>
    <div className="qr-full__top"><b className="font-display">{title}</b><button type="button" onClick={onClose} aria-label="Tutup" className="qr-full__x"><X size={20}/></button></div>
    <div className="qr-full__bottom">
      <p className="qr-full__hint">{err || hint}</p>
      <div className="qr-full__tools">
        {canTorch && <button type="button" className={torch ? 'is-on' : ''} onClick={() => void toggleTorch()}><Flashlight size={15}/> Senter</button>}
        <button type="button" onClick={() => setBack(v => !v)}><SwitchCamera size={15}/> Ganti kamera</button>
        {err && <button type="button" onClick={() => setRun(n => n + 1)}><RotateCcw size={15}/> Coba lagi</button>}
      </div>
      <label className="qr-full__gallery"><ImageUp size={16}/> Pilih QR dari galeri
        <input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setErr('');
          try {
            const BD = getBD();
            if (BD) { const bmp = await createImageBitmap(file); const r = await new BD({ formats: ['qr_code'] }).detect(bmp); if (r[0]?.rawValue) { onResult(r[0].rawValue); return; } }
            const { Html5Qrcode } = await import('html5-qrcode'); const reader = new Html5Qrcode('bix-file-reader'); const text = await reader.scanFile(file, false); reader.clear(); onResult(text);
          } catch { setErr('QR tidak ditemukan di gambar itu. Coba gambar yang lebih jelas.'); } }}/>
      </label>
    </div>
    <div id="bix-file-reader" className="hidden"/>
  </div>;
}
