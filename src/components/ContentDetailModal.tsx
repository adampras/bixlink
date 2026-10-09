import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContentImage } from '@/components/ContentImage';
import type { ContentItem } from '@/lib/landing-content';

export function ContentDetailModal({ item, eyebrow, fallbackSrc, onClose }: { item: ContentItem | null; eyebrow: string; fallbackSrc?: string | undefined; onClose: () => void }) {
  return <Dialog open={Boolean(item)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="content-detail-modal max-h-[88vh] overflow-y-auto border-chart-3/30 bg-card/90 p-0 backdrop-blur-xl sm:max-w-lg">
      {item && <>
        <ContentImage path={item.detailImage || item.image} fallbackSrc={fallbackSrc} alt={item.title} className="h-40 w-full object-cover"/>
        <div className="p-5">
          <DialogHeader className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-chart-3">{eyebrow}</span>
            <DialogTitle className="font-display text-xl font-bold">{item.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{item.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm leading-7 text-foreground/90">{item.detail}</div>
          <p className="mt-5 text-[11px] leading-5 text-muted-foreground">Narasi pengembangan, bukan jaminan hasil, harga, atau jadwal penyelesaian.</p>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
