import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Check, Heart, ImagePlus, Search, Store, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { updateSetting } from '@/lib/bixlink.functions';
import { money } from '@/lib/bixlink';

type Product = { id: string; user_id: string; title: string; description: string; price_usd: number; image_url: string | null; studio: string; order_url: string | null; status: string; category?: string; seller_tier?: string; review_note?: string | null };
export const SHOP_CATEGORIES = ['Fashion', 'Accessories', 'Collectibles', 'Lifestyle', 'Digital', 'General'];
const TIER_CLS: Record<string, string> = { Sovereign: 'border-primary text-primary', Gold: 'border-chart-3 text-chart-3', Silver: 'border-foreground/40 text-foreground', Bronze: 'border-border text-muted-foreground' };
export type MemberShopConfig = { enabled: boolean; tiers: { min: number; slots: number }[]; overrides?: Record<string, number>; autoApprove?: boolean; autoMaxPrice?: number };
export const defaultMemberShop: MemberShopConfig = { enabled: true, tiers: [{ min: 100, slots: 2 }, { min: 500, slots: 5 }, { min: 1000, slots: 10 }, { min: 5000, slots: 25 }, { min: 10000, slots: 100 }] };
const STUDIOS: Record<string, string> = { obsidian: 'studio-obsidian', white: 'studio-white', gold: 'studio-gold' };

/** Auto-Studio: centre-crop to 3:4, lift exposure/contrast/saturation, sharpen, return a compact JPEG. */
async function autoStudio(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const W = 720, H = 960, r = Math.max(W / img.width, H / img.height);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!;
  x.filter = 'brightness(1.08) contrast(1.12) saturate(1.18)';
  x.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r);
  x.filter = 'none';
  const d = x.getImageData(0, 0, W, H), s = new Uint8ClampedArray(d.data), o = d.data;
  for (let y = 1; y < H - 1; y++) for (let i = 1; i < W - 1; i++) for (let k = 0; k < 3; k++) {
    const p = (y * W + i) * 4 + k; o[p] = s[p]! * 1.6 - (s[p - 4]! + s[p + 4]! + s[p - W * 4]! + s[p + W * 4]!) * .15;
  }
  x.putImageData(d, 0, 0);
  return c.toDataURL('image/jpeg', .82);
}

function CheckoutButton({ p }: { p: Product }) {
  const [open, setOpen] = useState(false); const [ok, setOk] = useState(false);
  const inv = `INV-BIX-${p.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  return <>
    <button type="button" className="boutique-cta" onClick={() => { setOk(false); setOpen(true); }}>Buy now</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Checkout</DialogTitle><DialogDescription className="numeric">{inv}</DialogDescription></DialogHeader>
      <div className="flex gap-3">{p.image_url && <img src={p.image_url} alt={p.title} className="h-20 w-16 rounded-lg object-cover"/>}<div className="min-w-0"><b className="block truncate">{p.title}</b><span className="boutique-badge mt-1"><Check size={10}/> Curated seller</span></div></div>
      <div className="space-y-1 rounded-xl border border-border p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Item price</span><b className="numeric">{money(Number(p.price_usd))}</b></div><div className="flex justify-between"><span className="text-muted-foreground">BIXLINK fee</span><b className="numeric">{money(0)}</b></div><div className="flex justify-between border-t border-border pt-1"><span>Total</span><b className="numeric text-primary">{money(Number(p.price_usd))}</b></div></div>
      <p className="text-xs text-muted-foreground">Payment is completed on the seller's own checkout page. BIXLINK does not hold, process or refund payments — confirm details with the seller before paying.</p>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} className="mt-0.5"/> I understand this purchase is made directly with the seller.</label>
      <div className="flex gap-2"><Button variant="outline" className="flex-1 rounded-full" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!ok} className="flex-1 rounded-full" asChild={ok}>{ok ? <a href={p.order_url!} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Continue to seller</a> : <span>Continue to seller</span>}</Button></div>
    </DialogContent></Dialog>
  </>;
}

function ProductCard({ p, children, editorial, liked, onLike }: { p: Product; children?: React.ReactNode; editorial?: boolean; liked?: boolean; onLike?: () => void }) {
  const lot = `LOT ${p.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  return <div className={`boutique-card ${editorial ? 'boutique-card--editorial' : ''}`}>
    <div className={`studio-stage ${STUDIOS[p.studio] ?? STUDIOS['obsidian']} boutique-art relative`}>{p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover"/>}<span className="boutique-lot">{lot}</span>{onLike && <button type="button" aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={liked} onClick={onLike} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/80"><Heart size={14} className={liked ? 'fill-primary text-primary' : ''}/></button>}</div>
    <div className="boutique-body"><div className="flex min-w-0 items-center justify-between gap-2"><b className="block min-w-0 truncate text-sm">{p.title}</b>{p.status === 'approved' && <span className="boutique-badge"><Check size={10}/> Curated</span>}</div>
      <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-bold uppercase tracking-wider"><span className={`rounded-full border px-2 ${TIER_CLS[p.seller_tier ?? 'Bronze']}`}>{p.seller_tier ?? 'Bronze'} merchant</span><span className="rounded-full border border-border px-2 text-muted-foreground">{p.category ?? 'General'}</span></div>
      {editorial && p.description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{p.description}</p>}
      <span className="numeric mt-1 block text-primary">{money(Number(p.price_usd))}</span>
      {p.status !== 'approved' && <span className="mt-1 inline-block rounded-full border border-border px-2 text-[10px] uppercase">{p.status}</span>}{p.status !== 'approved' && p.review_note && <span className="mt-1 block text-[10px] text-muted-foreground">{p.review_note}</span>}
      {p.order_url && p.status === 'approved' && <CheckoutButton p={p}/>}{children}</div>
  </div>;
}

export function MemberShop({ userId, onMessage }: { userId?: string | undefined; onMessage?: (m: string) => void }) {
  const approved = useQuery({ queryKey: ['member-products', 'approved'], queryFn: async () => { const { data, error } = await supabase.from('bix_member_products').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(60); if (error) throw error; return data as Product[]; } });
  const mine = useQuery({ queryKey: ['member-products', 'mine', userId], enabled: !!userId, queryFn: async () => {
    const [{ data, error }, slots] = await Promise.all([supabase.from('bix_member_products').select('*').eq('user_id', userId!).order('created_at', { ascending: false }), supabase.rpc('bix_member_shop_slots', { p_user: userId! })]);
    if (error) throw error; return { items: data as Product[], slots: Number(slots.data ?? 0) };
  } });
  const blank = { title: '', description: '', price: '', orderUrl: '', studio: 'obsidian', image: '', category: 'General', terms: false };
  const [form, setForm] = useState(blank);
  const [cat, setCat] = useState('ALL'), [find, setFind] = useState(''), [sort, setSort] = useState('new'), [onlyLiked, setOnlyLiked] = useState(false), [liked, setLiked] = useState<string[]>([]);
  useEffect(() => { try { setLiked(JSON.parse(localStorage.getItem('bix-wishlist') ?? '[]')); } catch { /* ignore */ } }, []);
  const like = (id: string) => setLiked(l => { const n = l.includes(id) ? l.filter(x => x !== id) : [...l, id]; localStorage.setItem('bix-wishlist', JSON.stringify(n)); return n; });
  const list = (approved.data ?? []).filter(p => (cat === 'ALL' || (p.category ?? 'General') === cat) && p.title.toLowerCase().includes(find.toLowerCase()) && (!onlyLiked || liked.includes(p.id))).sort((a, b) => sort === 'low' ? a.price_usd - b.price_usd : sort === 'high' ? b.price_usd - a.price_usd : 0);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [editorial, setEditorial] = useState(false);
  const say = (m: string) => { setMsg(m); onMessage?.(m); };
  const used = (mine.data?.items ?? []).filter(p => p.status !== 'rejected').length, slots = mine.data?.slots ?? 0;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (!form.terms) throw new Error('Please accept the seller terms.');
      const { data, error } = await supabase.from('bix_member_products').insert({ title: form.title.trim(), description: form.description.trim(), price_usd: Number(form.price), image_url: form.image || null, studio: form.studio, order_url: form.orderUrl.trim() || null, category: form.category, terms_accepted_at: new Date().toISOString() }).select('status, review_note').single();
      if (error) throw error; setForm(blank); await Promise.all([mine.refetch(), approved.refetch()]);
      if (data.status === 'approved') { say('Product is live in the Member Store.'); toast.success('Product approved automatically and now live'); } else { say(`Sent to owner review: ${data.review_note ?? 'manual check'}.`); toast.message('Product sent to owner review'); }
    } catch (err) { say(err instanceof Error ? err.message : 'Could not submit product.'); } finally { setBusy(false); }
  }
  async function remove(id: string) { await supabase.from('bix_member_products').delete().eq('id', id); await mine.refetch(); }
  return <section id="member-store" className="mx-auto max-w-7xl px-5 py-10 md:px-8">
    <div className="eyebrow"><Store size={13}/> MEMBER MERCHANT HUB</div><h2 className="section-title">MEMBER <span>STORE</span></h2>
    <p className="mt-2 text-xs text-muted-foreground">Products listed by members. Tap Buy now to order through the seller's own payment link. BIXLINK does not hold or process payments.</p>
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Store categories">{['ALL', ...SHOP_CATEGORIES].map(c => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${cat === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{c === 'ALL' ? 'All' : c}</button>)}</div>
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"><label className="flex min-w-0 items-center gap-2 rounded-full border border-border px-3"><Search size={14}/><input aria-label="Search member store" placeholder="Search" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" value={find} onChange={e => setFind(e.target.value)}/></label><select aria-label="Sort member products" className="form-input" value={sort} onChange={e => setSort(e.target.value)}><option value="new">Newest</option><option value="low">Price ↑</option><option value="high">Price ↓</option></select><button type="button" aria-pressed={onlyLiked} aria-label="Show wishlist" onClick={() => setOnlyLiked(v => !v)} className={`grid w-10 place-items-center rounded-full border ${onlyLiked ? 'border-primary text-primary' : 'border-border'}`}><Heart size={15} className={onlyLiked ? 'fill-primary' : ''}/></button></div>
    <div className="boutique-toggle" role="group" aria-label="Store view"><button type="button" aria-pressed={!editorial} onClick={() => setEditorial(false)}>Grid</button><button type="button" aria-pressed={editorial} onClick={() => setEditorial(true)}>Editorial</button></div>
    <div className={`mt-4 grid gap-3 ${editorial ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}`}>{list.map(p => <ProductCard key={p.id} p={p} editorial={editorial} liked={liked.includes(p.id)} onLike={() => like(p.id)}/>)}{approved.isLoading && Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton-shimmer aspect-[3/4] rounded-2xl"/>)}</div>
    {!approved.isLoading && !list.length && <p className="mt-3 text-sm text-muted-foreground">{onlyLiked ? 'Your wishlist is empty.' : 'No matching member products.'}</p>}
    {userId && <div id="sell-product" className="mt-10 rounded-3xl border border-primary/40 bg-card/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-black">Sell your product</h3><span className="numeric rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary">Slots {used} / {slots}</span></div>
      {slots === 0 ? <p className="mt-3 text-sm text-muted-foreground">Activate a staking package of at least $100 to unlock product slots. Larger stakes unlock more slots.</p> :
      <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
        <label className={`studio-stage ${STUDIOS[form.studio]} flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border`}>
          {form.image ? <img src={form.image} alt="Preview" className="h-full w-full object-cover"/> : <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><ImagePlus/> Upload photo · Auto-Studio</span>}
          <input type="file" accept="image/*" className="sr-only" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 12e6) return say('Image too large (max 12 MB).'); setForm(v => ({ ...v, image: '' })); const img = await autoStudio(f); setForm(v => ({ ...v, image: img })); }}/>
        </label>
        <div className="grid content-start gap-2">
          <input required minLength={2} maxLength={80} placeholder="Product name" className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/>
          <select aria-label="Category" className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{SHOP_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <textarea minLength={20} maxLength={600} placeholder="Description (min. 20 characters)" className="form-input min-h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/>
          <input required type="number" min="1" step="0.01" placeholder="Price (USD)" className="form-input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}/>
          <input type="url" pattern="https://.*" placeholder="Order link (https://…, optional)" className="form-input" value={form.orderUrl} onChange={e => setForm({ ...form, orderUrl: e.target.value })}/>
          <div className="flex gap-2 text-xs">{Object.keys(STUDIOS).map(k => <button type="button" key={k} onClick={() => setForm({ ...form, studio: k })} className={`rounded-full border px-3 py-1 capitalize ${form.studio === k ? 'border-primary text-primary' : 'border-border'}`}>{k} studio</button>)}</div>
          <div className="rounded-xl border border-border p-3 text-[11px] leading-5 text-muted-foreground"><b className="text-foreground">Instant approval rules</b><br/>Clear photo, name, description of 20+ characters and a fair price. No investment or profit promises, gambling, weapons, drugs, replicas or fake goods. Listings that pass go live instantly; others wait for owner review. The owner may remove any listing.</div>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={form.terms} onChange={e => setForm({ ...form, terms: e.target.checked })} className="mt-0.5"/> I agree to the seller terms and confirm this product is genuine and mine to sell.</label>
          <Button disabled={busy || used >= slots || !form.terms || !form.image} className="rounded-full">{used >= slots ? 'All slots used' : 'Publish product'}</Button>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </form>}
      {!!mine.data?.items.length && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{mine.data.items.map(p => <ProductCard key={p.id} p={p}><button onClick={() => remove(p.id)} className="mt-2 flex items-center gap-1 text-destructive"><Trash2 size={12}/> Remove</button></ProductCard>)}</div>}
    </div>}
  </section>;
}

export function AdminMemberShop({ initial, onMessage }: { initial?: MemberShopConfig | undefined; onMessage: (m: string) => void }) {
  const [cfg, setCfg] = useState<MemberShopConfig>({ ...defaultMemberShop, ...initial });
  const [ov, setOv] = useState({ user: '', slots: '' });
  const change = useServerFn(updateSetting);
  const pending = useQuery({ queryKey: ['member-products', 'admin'], queryFn: async () => { const { data, error } = await supabase.from('bix_member_products').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as Product[]; } });
  const save = async (next: MemberShopConfig) => { try { await change({ data: { key: 'member_shop', value: next } }); setCfg(next); onMessage('Member store settings saved.'); } catch (e) { onMessage(e instanceof Error ? e.message : 'Could not save.'); } };
  const review = async (id: string, status: 'approved' | 'rejected') => { const { error } = await supabase.from('bix_member_products').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id); onMessage(error ? error.message : `Product ${status}.`); await pending.refetch(); };
  return <div className="mt-8 space-y-6">
    <section className="rounded-[20px] border border-border bg-card p-5">
      <div className="flex items-center justify-between"><h3 className="font-display text-lg font-black">Member store · slot quotas</h3><Button size="sm" variant="outline" onClick={() => save({ ...cfg, enabled: !cfg.enabled })}>{cfg.enabled ? 'OPEN' : 'CLOSED'}</Button></div>
      <p className="mt-1 text-xs text-muted-foreground">Slots by total active stake (USD). The highest tier reached applies.</p>
      <div className="mt-4 space-y-2">{cfg.tiers.map((t, i) => <div key={i} className="flex items-center gap-2 text-xs">From $<input type="number" min="0" className="form-input w-28" value={t.min} onChange={e => setCfg({ ...cfg, tiers: cfg.tiers.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x) })}/> stake →<input type="number" min="0" className="form-input w-20" value={t.slots} onChange={e => setCfg({ ...cfg, tiers: cfg.tiers.map((x, j) => j === i ? { ...x, slots: Number(e.target.value) } : x) })}/> slots<button onClick={() => setCfg({ ...cfg, tiers: cfg.tiers.filter((_, j) => j !== i) })}><X size={14}/></button></div>)}</div>
      <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" disabled={cfg.tiers.length >= 10} onClick={() => setCfg({ ...cfg, tiers: [...cfg.tiers, { min: 0, slots: 1 }] })}>+ Tier</Button><Button size="sm" onClick={() => save(cfg)}>Save quotas</Button></div>
      <h4 className="mt-6 text-sm font-bold">Automatic approval</h4>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={cfg.autoApprove ?? true} onChange={e => setCfg({ ...cfg, autoApprove: e.target.checked })}/> Auto-approve listings that pass the rules</label> · Max price $<input type="number" min="1" className="form-input w-28" value={cfg.autoMaxPrice ?? 5000} onChange={e => setCfg({ ...cfg, autoMaxPrice: Number(e.target.value) })}/><Button size="sm" onClick={() => save(cfg)}>Save rules</Button></div>
      <h4 className="mt-6 text-sm font-bold">Per-member override</h4>
      <div className="mt-2 flex flex-wrap gap-2"><input placeholder="Member user ID" className="form-input w-72" value={ov.user} onChange={e => setOv({ ...ov, user: e.target.value })}/><input type="number" min="0" placeholder="Slots" className="form-input w-24" value={ov.slots} onChange={e => setOv({ ...ov, slots: e.target.value })}/><Button size="sm" onClick={() => ov.user && save({ ...cfg, overrides: { ...cfg.overrides, [ov.user.trim()]: Number(ov.slots) } })}>Set</Button></div>
      <div className="mt-2 space-y-1 text-xs">{Object.entries(cfg.overrides ?? {}).map(([u, n]) => <div key={u} className="flex items-center gap-2"><code>{u.slice(0, 8)}…</code> {n} slots <button onClick={() => { const o = { ...cfg.overrides }; delete o[u]; save({ ...cfg, overrides: o }); }}><X size={12}/></button></div>)}</div>
    </section>
    <section><h3 className="font-display text-lg font-black">Product review</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{(pending.data ?? []).map(p => <ProductCard key={p.id} p={p}>{p.status === 'approved' && <Button size="sm" variant="outline" className="mt-2 h-7 rounded-full" onClick={() => review(p.id, 'rejected')}><X/> Remove</Button>}{p.status === 'pending' && <div className="mt-2 flex gap-1"><Button size="sm" className="h-7 rounded-full" onClick={() => review(p.id, 'approved')}><Check/> Approve</Button><Button size="sm" variant="destructive" className="h-7 rounded-full" onClick={() => review(p.id, 'rejected')}><X/></Button></div>}</ProductCard>)}</div>
      {!pending.data?.length && <p className="text-sm text-muted-foreground">No member products submitted yet.</p>}</section>
  </div>;
}
