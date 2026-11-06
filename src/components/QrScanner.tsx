import { useEffect, useRef, useState } from 'react';
import { X, ImageUp } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function QrScanner({ onResult, onClose, title = 'Scan BIX PAY QR', hint = "Point the camera at a member's BIX PAY QR" }: { onResult: (v: string) => void; onClose: () => void; title?: string; hint?: string }) {
  const ref = useRef<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stopped = false;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return;
      const s = new Html5Qrcode('bix-scanner'); ref.current = s;
      s.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w: number, h: number) => { const m = Math.floor(Math.min(w, h) * 0.7); return { width: m, height: m }; } }, text => { s.stop().catch(() => {}); ref.current = null; navigator.vibrate?.(30); onResult(text); }, () => {})
        .catch(() => setErr('Camera unavailable. Choose a QR image from your gallery or enter the code manually.'));
    });
    return () => { stopped = true; ref.current?.stop().catch(() => {}); };
  }, [onResult]);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  return <div className="qr-full" role="dialog" aria-label={title}>
    <div id="bix-scanner" className="qr-full__cam"/>
    <div className="qr-full__mask" aria-hidden><div className="qr-full__frame"><i/><i/><i/><i/><span className="qr-full__laser"/></div></div>
    <div className="qr-full__top"><b className="font-display">{title}</b><button type="button" onClick={onClose} aria-label="Close" className="qr-full__x"><X size={20}/></button></div>
    <div className="qr-full__bottom">
      <p className="qr-full__hint">{err || hint}</p>
      <label className="qr-full__gallery"><ImageUp size={16}/> Choose QR from gallery
        <input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setErr(''); try { await ref.current?.stop().catch(() => {}); ref.current = null; const { Html5Qrcode } = await import('html5-qrcode'); const reader = new Html5Qrcode('bix-file-reader'); const text = await reader.scanFile(file, false); reader.clear(); onResult(text); } catch { setErr('No QR code found in that image. Try a clearer screenshot.'); } e.target.value = ''; }}/>
      </label>
    </div>
    <div id="bix-file-reader" className="hidden"/>
  </div>;
}

