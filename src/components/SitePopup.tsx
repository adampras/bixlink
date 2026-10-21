import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ContentImage } from '@/components/ContentImage';
import { popupPlacementForPath, type PopupItem } from '@/lib/landing-content';

const seenKey = (item: PopupItem) => `bix-popup-seen:${item.placement}:${item.title}:${item.image ?? ''}`;

/** Owner-edited announcement pop-up, shown once per browser session per placement. */
export function SitePopup({ path, popups, signedIn }: { path: string; popups?: PopupItem[] | undefined; signedIn: boolean }) {
  const [item, setItem] = useState<PopupItem | null>(null);
  useEffect(() => {
    const placement = popupPlacementForPath(path, signedIn);
    const next = placement ? (popups ?? []).find(p => p.enabled !== false && p.placement === placement) : undefined;
    if (!next) { setItem(null); return; }
    try { if (sessionStorage.getItem(seenKey(next))) return; } catch { /* storage unavailable */ }
    const timer = window.setTimeout(() => setItem(next), 900);
    return () => window.clearTimeout(timer);
  }, [path, popups, signedIn]);
  const close = () => { if (item) { try { sessionStorage.setItem(seenKey(item), '1'); } catch { /* ignore */ } } setItem(null); };
  const external = item?.url?.startsWith('https://');
  return <Dialog open={item !== null} onOpenChange={open => { if (!open) close(); }}>
    <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"/><div className="site-popup-wrap"><DialogPrimitive.Content className="site-popup bg-card text-card-foreground"><DialogPrimitive.Close className="site-popup-close" aria-label="Close"><X className="h-4 w-4"/></DialogPrimitive.Close>
      {item && <>
        {item.image && <div className="site-popup__art"><ContentImage path={item.image} alt={item.title} className="site-popup__img"/></div>}
        <div className="site-popup__body">
          <span className="site-popup__eyebrow">BIXLINK ANNOUNCEMENT</span>
          <DialogTitle className="font-display text-lg font-black leading-snug">{item.title}</DialogTitle>
          {item.description ? <DialogDescription className="mt-2 text-xs leading-relaxed">{item.description}</DialogDescription> : <DialogDescription className="sr-only">Announcement</DialogDescription>}
          <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
            <Button variant="outline" size="sm" onClick={close}>Close</Button>
            {item.url ? <Button size="sm" asChild><a href={item.url} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onClick={close}>{item.ctaLabel || 'Learn more'}</a></Button> : <Button size="sm" onClick={close}>{item.ctaLabel || 'Got it'}</Button>}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Announcement only. Not a guarantee of profit, price or delivery.</p>
        </div>
      </>}
    </DialogPrimitive.Content></div></DialogPrimitive.Portal>
  </Dialog>;
}
