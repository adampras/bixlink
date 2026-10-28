import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/bixlink-logo-gold.webp';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = 'bix-install-dismissed';

/** Manifest-only install invitation shown a few seconds after opening: native prompt on Android, Share steps on iPhone, menu tip elsewhere. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || window.self !== window.top) return;
    const last = Number(localStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 864e5) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const t = setTimeout(() => setOpen(true), 3000);
    return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); };
  }, []);
  if (!open) return null;
  const close = () => { localStorage.setItem(KEY, String(Date.now())); setOpen(false); };
  const install = async () => { if (evt) { await evt.prompt(); await evt.userChoice; close(); } else setTip(true); };
  return <div className="install-pop-backdrop" onClick={close}><div role="dialog" aria-modal="true" aria-label="Install BIXLINK" className="install-pop" onClick={e => e.stopPropagation()}>
    <button type="button" aria-label="Close" onClick={close} className="install-pop-close"><X size={18}/></button>
    <div className="install-pop-avatar"><img src={logo} alt="BIXLINK fox emblem" width={80} height={80}/></div>
    <h2>Faster <em>BIXLINK</em> Access!</h2>
    <p>Tap <b>SAVE BIXLINK ACCESS</b> to add it to your home screen and open it instantly without your browser.</p>
    <button type="button" className="install-pop-cta" onClick={install}>SAVE BIXLINK ACCESS</button>
    {tip && <p className="!text-xs">{ios ? <>Tap <Share size={12} className="inline"/> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</> : <>Open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>.</>}</p>}
    <span className="install-pop-line" aria-hidden/>
  </div></div>;
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
