import { CreditCard, ShieldCheck, Sparkles } from 'lucide-react';

/** Presentation-only roadmap showcase. No card issuing, payment or whitelist record exists yet. */
export function AuricCardShowcase() {
  return <section className="shop-section">
    <div className="shop-section-title"><div><p className="shop-eyebrow">03 / ROADMAP · PHASE 5</p><h2>BIXLINK Auric Metal Card</h2></div><CreditCard size={20}/></div>
    <div className="grid items-center gap-6 md:grid-cols-2">
      <div className="relative mx-auto aspect-[1.586] w-full max-w-sm overflow-hidden rounded-2xl border border-chart-3/60 bg-gradient-to-br from-background via-card to-background p-5 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-chart-3/15 to-transparent"/>
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between"><b className="font-display tracking-[0.3em] text-chart-3">BIXLINK</b><span className="text-[10px] font-bold tracking-widest text-muted-foreground">BLACK METAL</span></div>
          <div className="h-8 w-11 rounded-md bg-gradient-to-br from-chart-3 to-chart-3/40"/>
          <div><p className="numeric tracking-[0.25em] text-foreground">•••• •••• •••• 2026</p><div className="mt-2 flex items-end justify-between text-[10px] text-muted-foreground"><span>FOUNDER MEMBER</span><span className="font-bold text-chart-3">CONCEPT</span></div></div>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <span className="inline-flex items-center gap-1 rounded-full border border-chart-3 bg-chart-3/10 px-3 py-1 text-[11px] font-bold text-chart-3"><Sparkles size={12}/> ROADMAP · NOT YET AVAILABLE</span>
        <p className="text-muted-foreground">A metal debit card concept planned for VIP and presale founders, subject to a licensed card-issuing partner.</p>
        <ul className="space-y-2">{['Priority access for Presale & Sovereign holders','Planned for VIP members first','Issued only through a licensed partner'].map(t => <li key={t} className="flex items-center gap-2"><ShieldCheck size={14} className="text-chart-2"/>{t}</li>)}</ul>
        <p className="text-[11px] text-muted-foreground">Concept image. No card, payment or pre-order is processed in this app.</p>
      </div>
    </div>
  </section>;
}
