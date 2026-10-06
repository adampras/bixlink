import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Pencil, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { getOwnerAnnouncements, saveAnnouncement } from '@/lib/updates.functions';
import { defaultReadiness, type Readiness } from '@/lib/readiness';
import { dateTime } from '@/lib/bixlink';

type AvailabilityKey = Exclude<keyof Readiness, 'presentationTheme'>;
const controls: { key: AvailabilityKey; label: string; detail: string }[] = [
  { key: 'legalEnabled', label: 'Legal & About pages', detail: 'Terms, Privacy, Risk Disclosure, About & Support.' },
  { key: 'kycEnabled', label: 'Optional identity check', detail: 'Identity submissions in Settings and Withdraw.' },
  { key: 'readinessEnabled', label: 'Readiness information', detail: 'Additional footer information about the project.' },
  { key: 'homeOverviewEnabled', label: 'HOME top overview', detail: 'Recorded staking value, Deposit/Withdraw/Swap buttons and the 3 stat cards at the top of HOME.' },
  { key: 'marketEnabled', label: 'Market & Updates', detail: 'Major coin prices and published owner announcements.' },
];
const empty = { title: '', body: '', category: 'ANNOUNCEMENT', published: false };
export function AdminReadiness({ initial, onMessage, onSaved }: { initial?: Readiness | undefined; onMessage: (s: string) => void; onSaved: () => Promise<void> }) {
  const [flags, setFlags] = useState<Readiness>({ ...defaultReadiness, ...initial });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [form, setForm] = useState(empty);
  const change = useServerFn(updateSetting);
  const list = useServerFn(getOwnerAnnouncements);
  const save = useServerFn(saveAnnouncement);
  const qc = useQueryClient();
  const posts = useQuery({ queryKey: ['owner-announcements'], queryFn: () => list() });
  async function toggle(key: AvailabilityKey) {
    const next = { ...flags, [key]: !flags[key] };
    setBusy(true);
    try { await change({ data: { key: 'readiness', value: next } }); setFlags(next); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); await qc.invalidateQueries({ queryKey: ['bix-market-updates'] }); onMessage(`${controls.find(c => c.key === key)?.label}: ${next[key] ? 'OPEN' : 'CLOSED'}.`); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Could not save availability.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-8 max-w-3xl">
    <div className="eyebrow"><ShieldCheck size={14}/> OWNER CONTROLS</div><h2 className="mt-3 font-display text-2xl font-bold">Readiness & Updates</h2>
    <div className="mt-5">{controls.map(item => <div key={item.key} className="flex items-center justify-between gap-4 border-b border-border py-5"><div className="min-w-0"><b className="text-sm">{item.label}</b><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></div><Button size="sm" variant="outline" className={`shrink-0 ${flags[item.key] ? 'border-chart-2 text-chart-2' : 'text-muted-foreground'}`} aria-label={`${item.label} ${flags[item.key] ? 'open' : 'closed'}`} aria-pressed={flags[item.key]} disabled={busy} onClick={() => toggle(item.key)}>{flags[item.key] ? <ShieldCheck size={14}/> : <Lock size={14}/>} {flags[item.key] ? 'OPEN' : 'CLOSED'}</Button></div>)}</div>
    <p className="mt-4 text-xs leading-6 text-muted-foreground">Essential transaction risks, projection notices and BIXCOIN · No SC disclosures remain visible. Closing optional pages does not replace legal or regulatory obligations.</p>
    <div className="mt-10 flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Official announcements</h2><Button variant="ghost" size="sm" onClick={() => { setEditing(undefined); setForm(empty); }}><Plus/> New</Button></div>
    <form className="mt-5 space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await save({ data: { ...form, ...(editing ? { id: editing } : {}) } }); setEditing(undefined); setForm(empty); await qc.invalidateQueries({ queryKey: ['owner-announcements'] }); await qc.invalidateQueries({ queryKey: ['bix-market-updates'] }); onMessage(form.published ? 'Announcement published.' : 'Draft saved.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not save announcement.'); } finally { setBusy(false); } }}>
      <label className="block text-xs text-muted-foreground">Title<input className="form-input mt-2" aria-label="Announcement title" maxLength={120} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
      <label className="block text-xs text-muted-foreground">Category<select className="form-input mt-2" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['ANNOUNCEMENT', 'PRODUCT', 'MAINTENANCE'].map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="block text-xs text-muted-foreground">Message<textarea className="form-input mt-2 min-h-32" aria-label="Announcement message" maxLength={5000} required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })}/> Publish now</label>
      <Button disabled={busy} type="submit"><Save/> {busy ? 'Saving…' : editing ? 'Save changes' : 'Save announcement'}</Button>
    </form>
    {posts.isError && <p className="mt-5 text-sm text-destructive">Could not load announcements.</p>}
    <div className="mt-6">{posts.data?.map(p => <article key={p.id} className="flex items-start justify-between gap-3 border-b border-border py-4"><div className="min-w-0"><span className={`text-[10px] font-bold ${p.published_at ? 'text-chart-2' : 'text-muted-foreground'}`}>{p.published_at ? 'PUBLISHED' : 'DRAFT'} · {p.category}</span><h3 className="mt-1 break-words text-sm font-bold">{p.title}</h3><small className="text-muted-foreground">{dateTime(p.published_at ?? p.created_at)}</small></div><Button size="icon" variant="ghost" aria-label={`Edit ${p.title}`} onClick={() => { setEditing(p.id); setForm({ title: p.title, body: p.body, category: p.category, published: Boolean(p.published_at) }); }}><Pencil size={16}/></Button></article>)}</div>
  </div>;
}