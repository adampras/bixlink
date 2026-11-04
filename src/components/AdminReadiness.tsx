import { AdminBixZoom } from '@/components/BixZoom';
import { normalizeSocial } from '@/lib/social-link';
import { HUB_COLORS, HUB_IMAGES, defaultHub, type HubItem } from '@/components/HighlightsHub';
import { useState } from 'react';
import { WALLET_SKINS } from '@/lib/wallet-skin';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Pencil, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { getOwnerAnnouncements, saveAnnouncement } from '@/lib/updates.functions';
import { defaultReadiness, type Readiness } from '@/lib/readiness';
import { dateTime } from '@/lib/bixlink';

type AvailabilityKey = 'legalEnabled' | 'kycEnabled' | 'readinessEnabled' | 'homeOverviewEnabled' | 'homeHoloEnabled' | 'marketEnabled' | 'footerEnabled' | 'liveActivityEnabled' | 'heroAnimEnabled' | 'presaleStageEnabled' | 'touchEffectsEnabled' | 'loanEnabled';
const controls: { key: AvailabilityKey; label: string; detail: string }[] = [
  { key: 'touchEffectsEnabled', label: 'Efek sentuh premium', detail: 'Edge glow and subtle press response on buttons. Follows device reduce animation preference.' },
  { key: 'loanEnabled', label: 'Leader loan account', detail: 'Enable/disable conditional loan account program (max $1,000) in Profile and FOX AI.' },
  { key: 'legalEnabled', label: 'Legal & About pages', detail: 'Terms, Privacy, Risk Disclosure, About & Support.' },
  { key: 'kycEnabled', label: 'Optional identity check', detail: 'Identity submissions in Settings and Withdraw.' },
  { key: 'readinessEnabled', label: 'Readiness information', detail: 'Additional footer information about the project.' },
  { key: 'homeOverviewEnabled', label: 'HOME top overview', detail: 'Recorded staking value, Deposit/Withdraw/Swap buttons and the 3 stat cards at the top of HOME.' },
  { key: 'homeHoloEnabled', label: 'Kotak Hologram FOX (HOME)', detail: 'FOX reactor hologram box above the BIX Internal Market chart on HOME.' },
  { key: 'marketEnabled', label: 'Market & Updates', detail: 'Major coin prices and published owner announcements.' },
  { key: 'liveActivityEnabled', label: 'Live Global Activity', detail: 'Floating notices of community interest from 100 countries (labelled simulation; real ledger events marked).' },
  { key: 'heroAnimEnabled', label: 'Animated hero background', detail: 'Neural payment grid animation behind the landing page.' },
  { key: 'presaleStageEnabled', label: 'Presale stage & countdown', detail: 'Stage progress bar and round countdown on the landing page.' },
  { key: 'footerEnabled', label: 'Editable footer content', detail: 'Owner-written footer title, description and contact line.' },
];
const empty = { title: '', body: '', category: 'ANNOUNCEMENT', published: false };
export function AdminReadiness({ initial, onMessage, onSaved }: { initial?: Readiness | undefined; onMessage: (s: string) => void; onSaved: () => Promise<void> }) {
  const [flags, setFlags] = useState<Readiness>({ ...defaultReadiness, ...initial });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [form, setForm] = useState(empty);
  const [footer, setFooter] = useState({ title: flags.footerTitle, body: flags.footerBody, contact: flags.footerContact });
  const [socials, setSocials] = useState<Record<string, string>>({ ...flags.socials });
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
    <form className="mt-8 space-y-3 border-y border-border py-6" onSubmit={async event => { event.preventDefault(); const next = { ...flags, footerTitle: footer.title.trim(), footerBody: footer.body.trim(), footerContact: footer.contact.trim() }; setBusy(true); try { await change({ data: { key: 'readiness', value: next } }); setFlags(next); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Footer content saved.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not save footer.'); } finally { setBusy(false); } }}>
      <h3 className="font-display text-lg font-bold">Footer content</h3>
      <label className="block text-xs text-muted-foreground">Title<input className="form-input mt-2" maxLength={80} value={footer.title} onChange={event => setFooter({ ...footer, title: event.target.value })}/></label>
      <label className="block text-xs text-muted-foreground">Description<textarea className="form-input mt-2 min-h-24" maxLength={320} value={footer.body} onChange={event => setFooter({ ...footer, body: event.target.value })}/></label>
      <label className="block text-xs text-muted-foreground">Contact line<input className="form-input mt-2" maxLength={120} value={footer.contact} onChange={event => setFooter({ ...footer, contact: event.target.value })}/></label>
      <Button disabled={busy} type="submit"><Save/> Save footer</Button>
    </form>
    <form className="mt-8 space-y-3 border-b border-border pb-6" onSubmit={async event => { event.preventDefault(); const next = { ...flags, socials: Object.fromEntries(Object.entries(socials).map(([k, v]) => [k, normalizeSocial(k, v)])) }; setBusy(true); try { await change({ data: { key: 'readiness', value: next } }); setFlags(next); setSocials({ ...next.socials }); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Social links saved.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not save links.'); } finally { setBusy(false); } }}>
      <h3 className="text-sm font-black">Social media links</h3>
      <p className="text-xs text-muted-foreground">Shown at the bottom of landing and member pages. Empty = hidden. Accepts t.me/name, x.com/name or @name.</p>
      {(['telegram','x','youtube','discord','instagram'] as const).map(k => <label key={k} className="block text-xs capitalize text-muted-foreground">{k === 'x' ? 'X (Twitter)' : k}<input className="form-input mt-2" type="text" maxLength={200} placeholder="https://" value={socials[k] ?? flags.socials?.[k] ?? ''} onChange={event => setSocials({ ...socials, [k]: event.target.value })}/></label>)}
      <Button disabled={busy} type="submit"><Save/> Save links</Button>
    </form>
    <HubEditor flags={flags} busy={busy} onSave={async next => { setBusy(true); try { await change({ data: { key: 'readiness', value: next } }); setFlags(next); await onSaved(); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Highlights hub saved.'); } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not save hub.'); } finally { setBusy(false); } }}/>
    <AdminBixZoom onMessage={onMessage}/>
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

export function AdminWalletAppearance({ initial, onMessage, onSaved }: { initial?: Readiness | undefined; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [flags, setFlags] = useState<Readiness>({ ...defaultReadiness, ...initial });
  const [busy, setBusy] = useState(false);
  const change = useServerFn(updateSetting);
  const qc = useQueryClient();
  return <WalletLook flags={flags} busy={busy} onSave={async next => {
    setBusy(true);
    try {
      await change({ data: { key: 'readiness', value: next } });
      setFlags(next);
      await onSaved();
      await qc.invalidateQueries({ queryKey: ['bix-public-config'] });
      onMessage('Wallet colors and animations saved.');
    } catch (e) { onMessage(e instanceof Error ? e.message : 'Could not save appearance.'); }
    finally { setBusy(false); }
  }}/>;
}

function WalletLook({ flags, busy, onSave }: { flags: Readiness; busy: boolean; onSave: (next: Readiness) => Promise<void> }) {
  const colors = flags.walletColors ?? [];
  const anims = [['animGlow', 'Gold crypto coins'], ['animShimmer', 'Payment network'], ['animFloat', 'Market chart']] as const;
  return <div className="mt-8 border-y border-border py-6">
    <h3 className="font-display text-lg font-bold">Wallet balance box style</h3>
    <p className="mt-1 text-xs text-muted-foreground">ON = kartu metal Sovereign. OFF = desain lama (Classic Vault).</p>
    <Button size="sm" variant="outline" disabled={busy} aria-pressed={flags.walletCard === true} className={`mt-3 ${flags.walletCard ? 'border-chart-2 text-chart-2' : 'text-muted-foreground'}`} onClick={() => onSave({ ...flags, walletCard: !flags.walletCard })}>Sovereign Metal Card · {flags.walletCard ? 'ON' : 'OFF'}</Button>
    {flags.walletCard && <><p className="mt-4 text-xs text-muted-foreground">Balance box style:</p><div className="mt-2 grid grid-cols-2 gap-2">{([['metal','Sovereign Metal Pass'],['elite','Futuristic Elite Card']] as const).map(([id,label]) => { const on = (flags.walletCardModel ?? 'metal') === id; return <Button key={id} size="sm" variant="outline" disabled={busy} aria-pressed={on} className={on ? 'border-chart-2 text-chart-2' : 'text-muted-foreground'} onClick={() => onSave({ ...flags, walletCardModel: id })}>{label}</Button>; })}</div></>}
    {flags.walletCard && <><p className="mt-4 text-xs text-muted-foreground">Warna solid Sovereign Card:</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">{([['onyx','Obsidian Onyx'],['gold','Royal Gold'],['sapphire','Deep Sapphire'],['emerald','Imperial Emerald'],['ruby','Crimson Ruby']] as const).map(([id,label]) => { const on = (flags.walletCardColor ?? 'onyx') === id; return <Button key={id} size="sm" variant="outline" disabled={busy} aria-pressed={on} className={on ? 'border-chart-2 text-chart-2' : 'text-muted-foreground'} onClick={() => onSave({ ...flags, walletCardColor: id })}><span className="sov-swatch" data-sov-color={id} aria-hidden/>{label}</Button>; })}</div></>}
    <h3 className="mt-6 font-display text-lg font-bold">5 Wallet balance box colors</h3>
    <p className="mt-1 text-xs text-muted-foreground">Only the Wallet balance box changes. 1 color on = fixed. 2–5 on = changes automatically every 24 hours.</p>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{WALLET_SKINS.map(skin => { const on = colors.includes(skin.id); return <Button key={skin.id} size="sm" variant="outline" disabled={busy} aria-pressed={on} className={on ? 'border-chart-2 text-chart-2' : 'text-muted-foreground'} onClick={() => onSave({ ...flags, walletColors: on ? colors.filter(c => c !== skin.id) : [...colors, skin.id] })}><span className="wallet-swatch" data-skin={skin.id} aria-hidden/>{skin.label} · {on ? 'ON' : 'OFF'}</Button>; })}</div>
    <h3 className="mt-6 font-display text-lg font-bold">Animasi kotak Wallet · ON / OFF</h3>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">{anims.map(([key, label]) => { const on = flags[key] === true; return <Button key={key} size="sm" variant="outline" disabled={busy} aria-pressed={on} className={on ? 'border-chart-2 text-chart-2' : 'text-muted-foreground'} onClick={() => onSave({ ...flags, [key]: !on })}>{label} · {on ? 'ON' : 'OFF'}</Button>; })}</div>
  </div>;
}

function HubEditor({ flags, busy, onSave }: { flags: Readiness; busy: boolean; onSave: (next: Readiness) => Promise<void> }) {
  const [enabled, setEnabled] = useState(flags.hub?.enabled !== false);
  const [items, setItems] = useState<HubItem[]>(flags.hub?.items?.length ? flags.hub.items : defaultHub);
  const set = (i: number, patch: Partial<HubItem>) => setItems(items.map((it, n) => n === i ? { ...it, ...patch } : it));
  return <form className="mt-8 space-y-3 border-b border-border pb-6" onSubmit={e => { e.preventDefault(); void onSave({ ...flags, hub: { enabled, items } }); }}>
    <div className="flex items-center justify-between gap-3"><h3 className="font-display text-lg font-bold">Highlights hub</h3><Button type="button" size="sm" variant={enabled ? 'default' : 'outline'} onClick={() => setEnabled(!enabled)}>{enabled ? 'ON' : 'OFF'}</Button></div>
    <p className="text-xs text-muted-foreground">Colorful cards above landing, HOME and Market. Link: app path (/stake) or https://</p>
    {items.map((it, i) => <div key={i} className="space-y-2 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-2"><input className="form-input" maxLength={40} placeholder="Title" value={it.title} onChange={e => set(i, { title: e.target.value })}/><input className="form-input" maxLength={16} placeholder="Tag" value={it.tag} onChange={e => set(i, { tag: e.target.value })}/></div>
      <input className="form-input" maxLength={60} placeholder="Short info" value={it.body} onChange={e => set(i, { body: e.target.value })}/>
      <input className="form-input" maxLength={200} placeholder="/presale" value={it.href} onChange={e => set(i, { href: e.target.value })}/>
      <div className="grid grid-cols-2 gap-2"><select className="form-input" value={it.color} onChange={e => set(i, { color: e.target.value as HubItem['color'] })}>{HUB_COLORS.map(c => <option key={c}>{c}</option>)}</select><select className="form-input" value={it.image} onChange={e => set(i, { image: e.target.value as HubItem['image'] })}>{Object.keys(HUB_IMAGES).map(c => <option key={c}>{c}</option>)}</select></div>
      <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => set(i, { enabled: it.enabled === false })}>{it.enabled === false ? 'Hidden' : 'Visible'}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setItems(items.filter((_, n) => n !== i))}>Remove</Button></div>
    </div>)}
    <div className="flex gap-2">{items.length < 8 && <Button type="button" variant="outline" onClick={() => setItems([...items, { title: 'New info', tag: 'INFO', body: '', color: 'gold', image: 'launch', href: '/' }])}><Plus/> Add card</Button>}<Button disabled={busy} type="submit"><Save/> Save hub</Button></div>
  </form>;
}
