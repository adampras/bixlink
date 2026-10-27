import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LayoutGrid } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HUB_ITEMS, hubVisible } from '@/lib/dock-hub';

/** Mobile dock HUB (replaces HOME): opens owner-selected shortcuts. */
export function DockHub({ path, cfg }: { path: string; cfg?: Record<string, boolean> }) {
  const [open, setOpen] = useState(false);
  const items = HUB_ITEMS.filter(i => hubVisible(cfg, i.id));
  const on = open || items.some(i => i.to === path && !['/stake', '/wallet', '/profit', '/network'].includes(i.to));
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Open BIX HUB" className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-bold ${on ? 'mobile-nav-on' : 'text-muted-foreground'}`}>
      <LayoutGrid size={19} className="shrink-0"/><span>HUB</span>
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-3xl border-primary/40 pb-8">
        <SheetHeader><SheetTitle className="font-display tracking-widest text-primary">BIX HUB</SheetTitle></SheetHeader>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {items.map(i => <Link key={i.id} to={i.to} onClick={() => setOpen(false)} className={`rounded-2xl border px-2 py-3 text-center ${path === i.to ? 'border-primary bg-primary/10' : 'border-border bg-card/70'}`}>
            <div className="text-xs font-black">{i.label}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{i.note}</div>
          </Link>)}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}
