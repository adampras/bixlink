import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'bix-install-dismissed';

/** Manifest-only install invitation: Android uses the native prompt, iPhone gets Share → Add to Home Screen steps. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || window.self !== window.top) return;
    const last = Number(localStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 3 * 864e5) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setTimeout(() => setOpen(true), 6000); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { setIos(true); const t = setTimeout(() => setOpen(true), 6000); return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); }; }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (!open) return null;
  const close = () => { localStorage.setItem(KEY, String(Date.now())); setOpen(false); };
  return <div role="dialog" aria-label="Install BIXLINK" className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-sm rounded-[20px] border border-primary/60 bg-card/95 p-4 shadow-2xl backdrop-blur">
    <button aria-label="Tutup" onClick={close} className="absolute right-3 top-3 text-muted-foreground"><X size={16}/></button>
    <div className="font-display text-sm font-black text-primary">Pasang aplikasi BIXLINK</div>
    {ios
      ? <p className="mt-2 text-xs text-muted-foreground">Tekan <Share size={12} className="inline"/> <b>Bagikan</b> di Safari, lalu pilih <b>Tambahkan ke Layar Utama</b>.</p>
      : <><p className="mt-2 text-xs text-muted-foreground">Buka BIXLINK langsung dari layar utama ponsel, seperti aplikasi.</p>
        <Button className="mt-3 w-full rounded-full" onClick={async () => { if (!evt) return; await evt.prompt(); await evt.userChoice; close(); }}><Download/> Install sekarang</Button></>}
  </div>;
}

/** Always-available Profile install action (manifest-only; no offline caching). */
export function InstallAppButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [mode, setMode] = useState<'hidden' | 'ios' | 'android' | 'manual'>('hidden');
  const [tip, setTip] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone) return;
    setMode(/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'manual');
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setMode('android'); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (mode === 'hidden') return null;
  return <div className="rounded-2xl border border-primary/40 bg-card/70 p-3">
    <Button variant="outline" className="w-full" onClick={async () => { if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); } else setTip(true); }}><Download/> Install BIXLINK app</Button>
    {tip && <p className="mt-2 text-xs text-muted-foreground">{mode === 'ios' ? <>Tap <Share size={12} className="inline"/> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</> : <>Open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.</>}</p>}
  </div>;
}
