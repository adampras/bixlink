import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Save, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';
import { LANGUAGES, type Language } from '@/lib/i18n';
import { defaultMarketing, type MarketingPlan } from '@/lib/marketing';
import { saveMarketing } from '@/lib/marketing.functions';
export function AdminMarketing({ initial, onMessage }: { initial?: MarketingPlan; onMessage: (message: string) => void }) {
  const [plan, setPlan] = useState(initial ?? defaultMarketing()); const [lang, setLang] = useState<Language>('en'); const [busy, setBusy] = useState(false);
  const save = useServerFn(saveMarketing); const qc = useQueryClient(); const current = plan.locales[lang];
  return <section className="mt-8 max-w-3xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Marketing materials</h2><Button variant="outline" aria-pressed={plan.enabled} onClick={() => setPlan({ ...plan, enabled: !plan.enabled })}>{plan.enabled ? <Eye/> : <EyeOff/>}{plan.enabled ? 'OPEN' : 'CLOSED'}</Button></div>
    <p className="text-sm text-muted-foreground">PDF uses saved package, presale and referral settings at download time. Video is a dated overview; editing this copy updates the PDF, not the rendered video. Copyright notice is not patent registration.</p>
    <select className="form-input" aria-label="Marketing language" value={lang} onChange={e => setLang(e.target.value as Language)}>{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
    <label className="block text-sm">Introduction<textarea className="form-input mt-2" maxLength={500} value={current.intro} onChange={e => setPlan({ ...plan, locales: { ...plan.locales, [lang]: { ...current, intro: e.target.value } } })}/></label>
    {current.sections.map((s, i) => <div key={i} className="space-y-2 border-t border-border pt-4"><input aria-label={`Marketing title ${i+1}`} className="form-input" maxLength={80} value={s.title} onChange={e => setPlan({ ...plan, locales: { ...plan.locales, [lang]: { ...current, sections: current.sections.map((v,j) => j === i ? { ...v, title: e.target.value } : v) } } })}/><textarea aria-label={`Marketing body ${i+1}`} className="form-input min-h-24" maxLength={900} value={s.body} onChange={e => setPlan({ ...plan, locales: { ...plan.locales, [lang]: { ...current, sections: current.sections.map((v,j) => j === i ? { ...v, body: e.target.value } : v) } } })}/></div>)}
    <div className="flex gap-3"><Button disabled={busy} onClick={async () => { setBusy(true); try { const saved = await save({ data: plan }); setPlan(saved); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Marketing plan saved.'); } catch(e) { onMessage(e instanceof Error ? e.message : 'Save failed'); } finally { setBusy(false); } }}><Save/>{busy ? 'Saving…' : 'Save marketing plan'}</Button><Button asChild variant="outline"><Link to="/marketing">Preview <ArrowUpRight/></Link></Button></div>
  </section>;
}