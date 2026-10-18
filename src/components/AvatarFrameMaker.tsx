import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FRAMES = [
  { id: 'genesis', label: 'Genesis VIP', text: 'BIXLINK VERIFIED MEMBER', a: '#FFD700', b: '#8a6a12' },
  { id: 'founder', label: 'Founder 2026', text: 'FOUNDER 2026 · 21M CLUB', a: '#f5d27a', b: '#A855F7' },
  { id: 'fox', label: 'Fox Ambassador', text: 'BIXLINK FOX AMBASSADOR', a: '#38bdf8', b: '#FFD700' },
] as const;

export function AvatarFrameMaker({ logo }: { logo: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLImageElement>();
  const [frame, setFrame] = useState<typeof FRAMES[number]>(FRAMES[0]);
  const [logoImg, setLogoImg] = useState<HTMLImageElement>();
  useEffect(() => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => setLogoImg(i); i.src = logo; }, [logo]);
  useEffect(() => {
    const c = canvas.current; const x = c?.getContext('2d'); if (!c || !x) return;
    const S = 1080, R = 470; x.clearRect(0, 0, S, S);
    x.fillStyle = '#0b0b10'; x.fillRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, R, 0, Math.PI * 2); x.clip();
    if (photo) { const s = Math.max((R * 2) / photo.width, (R * 2) / photo.height); const w = photo.width * s, h = photo.height * s; x.drawImage(photo, (S - w) / 2, (S - h) / 2, w, h); }
    else { x.fillStyle = '#16161f'; x.fillRect(0, 0, S, S); x.fillStyle = '#888'; x.font = '600 40px sans-serif'; x.textAlign = 'center'; x.fillText('Upload your photo', S / 2, S / 2); }
    x.restore();
    const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, frame.a); g.addColorStop(0.5, frame.b); g.addColorStop(1, frame.a);
    x.lineWidth = 46; x.strokeStyle = g; x.beginPath(); x.arc(S / 2, S / 2, R + 22, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(S / 2, S / 2, R, 0, Math.PI * 2); x.stroke();
    x.fillStyle = g; x.beginPath(); x.roundRect(S / 2 - 330, S - 150, 660, 84, 42); x.fill();
    x.fillStyle = '#0b0b10'; x.font = '800 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(frame.text, S / 2, S - 108);
    if (logoImg) { x.save(); x.beginPath(); x.arc(S - 170, 170, 92, 0, Math.PI * 2); x.fillStyle = '#0b0b10'; x.fill(); x.lineWidth = 10; x.strokeStyle = g; x.stroke(); x.clip(); x.drawImage(logoImg, S - 250, 90, 160, 160); x.restore(); }
  }, [photo, frame, logoImg]);
  const upload = (f?: File) => { if (!f) return; const i = new Image(); i.onload = () => setPhoto(i); i.src = URL.createObjectURL(f); };
  const download = () => { try { const a = document.createElement('a'); a.download = `bixlink-${frame.id}-avatar.png`; a.href = canvas.current!.toDataURL('image/png'); a.click(); } catch { /* tainted canvas */ } };
  return <section className="mt-6 rounded-2xl border border-primary/30 bg-card p-4">
    <div className="eyebrow">BRAND MAKER</div><h2 className="font-display text-lg font-bold">BIXLINK avatar frame</h2>
    <canvas ref={canvas} width={1080} height={1080} className="mx-auto mt-3 block aspect-square w-full max-w-[300px] rounded-full"/>
    <div className="mt-3 grid grid-cols-3 gap-2">{FRAMES.map(f => <button key={f.id} type="button" onClick={() => setFrame(f)} className={`rounded-lg border px-2 py-2 text-[11px] font-bold ${frame.id === f.id ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{f.label}</button>)}</div>
    <div className="mt-3 grid grid-cols-2 gap-2"><Button asChild variant="outline"><label className="cursor-pointer"><ImagePlus/> Upload photo<input type="file" accept="image/*" className="sr-only" onChange={e => upload(e.target.files?.[0])}/></label></Button><Button disabled={!photo} onClick={download}><Download/> Download HD</Button></div>
  </section>;
}
