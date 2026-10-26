import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Plus, Save, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { supabase } from '@/integrations/supabase/client';
import { ContentImage } from '@/components/ContentImage';
import { defaultLandingContent, POPUP_PLACEMENTS, type LandingContent, type PopupItem, type PopupPlacement } from '@/lib/landing-content';

const LABEL: Record<PopupPlacement, string> = { home: 'HOME (pengunjung)', presale: 'Presale', wallet: 'Wallet member', dashboard: 'HOME member' };

/** Auto-fit pop-up editor: the uploaded photo is cropped by the frame (object-cover, fixed 16:10 ratio). */
export function AdminPopups({ content, onMessage, onSaved }: { content?: LandingContent | undefined; onMessage: (m: string) => void; onSaved: () => Promise<void> }) {
  const [items, setItems] = useState<PopupItem[]>(content?.popups ?? []);
  const [busy, setBusy] = useState<string>();
  const save = useServerFn(updateSetting);
  const set = (i: number, patch: Partial<PopupItem>) => setItems(cur => cur.map((it, j) => j === i ? { ...it, ...patch } : it));
  const upload = async (i: number, file?: File) => {
    if (!file) return;
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type];
    if (!ext || file.size > 5 * 1024 * 1024) { onMessage('Pilih JPG, PNG atau WebP, maksimal 5 MB.'); return; }
    setBusy(`img-${i}`);
    const path = `images/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('bix-content').upload(path, file, { contentType: file.type, upsert: false });
    setBusy(undefined);
    if (error) { onMessage(error.message); return; }
    set(i, { image: path }); onMessage('Foto diunggah. Tekan Simpan untuk menerapkan.');
  };
  const persist = async () => {
    setBusy('save');
    try {
      const base = content ?? defaultLandingContent;
      await save({ data: { key: 'landing_content', value: { ...base, popups: items.map(it => ({ ...it, title: it.title.trim() || 'BIXLINK', description: it.description.trim(), ctaLabel: it.ctaLabel?.trim() || undefined, url: it.url?.trim() || undefined })) } as Record<string, unknown> } });
      await onSaved(); onMessage('Pop-up tersimpan.');
    } catch (e) { onMessage(e instanceof Error ? e.message : 'Gagal menyimpan pop-up.'); }
    setBusy(undefined);
  };
  return <section className="space-y-4">
    <div><h3 className="font-display text-xl font-bold">Banner & Pop-up</h3><p className="mt-1 text-xs text-muted-foreground">Unggah foto apa saja — bingkai otomatis memotong ke rasio 16:10 dan menempatkannya di kartu kaca emas. Satu pop-up aktif per lokasi, muncul sekali per sesi. Rekomendasi: HOME pengunjung (event prelaunch), Presale (alokasi terbatas), Wallet (tips keamanan).</p></div>
    {items.map((it, i) => <article key={i} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[180px_1fr]">
      <div className="site-popup__art overflow-hidden rounded-lg border border-border">{it.image ? <ContentImage path={it.image} alt="" className="site-popup__img"/> : <div className="grid h-full place-items-center text-[10px] text-muted-foreground">Belum ada foto</div>}</div>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <select className="form-input h-9 w-auto py-0 text-xs" value={it.placement} onChange={e => set(i, { placement: e.target.value as PopupPlacement })} aria-label="Lokasi pop-up">{POPUP_PLACEMENTS.map(p => <option key={p} value={p}>{LABEL[p]}</option>)}</select>
          <Button type="button" size="sm" variant={it.enabled === false ? 'outline' : 'default'} aria-pressed={it.enabled !== false} onClick={() => set(i, { enabled: it.enabled === false })}>{it.enabled === false ? <EyeOff/> : <Eye/>}{it.enabled === false ? 'OFF' : 'ON'}</Button>
          <Button asChild size="sm" variant="outline" disabled={Boolean(busy)}><label className="cursor-pointer"><Upload/>{busy === `img-${i}` ? 'Mengunggah…' : 'Upload foto'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(i, e.target.files?.[0]); e.target.value = ''; }}/></label></Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setItems(cur => cur.filter((_, j) => j !== i))} aria-label="Hapus pop-up"><Trash2/></Button>
        </div>
        <input className="form-input" maxLength={60} placeholder="Judul" value={it.title} onChange={e => set(i, { title: e.target.value })}/>
        <textarea className="form-input min-h-16" maxLength={240} placeholder="Keterangan singkat" value={it.description} onChange={e => set(i, { description: e.target.value })}/>
        <div className="grid gap-2 sm:grid-cols-2"><input className="form-input" maxLength={24} placeholder="Teks tombol (opsional)" value={it.ctaLabel ?? ''} onChange={e => set(i, { ctaLabel: e.target.value })}/><input className="form-input" maxLength={300} placeholder="Link /presale atau https://…" value={it.url ?? ''} onChange={e => set(i, { url: e.target.value })}/></div>
      </div>
    </article>)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={items.length >= 8} onClick={() => setItems(cur => [...cur, { title: '', description: '', placement: 'home', enabled: true }])}><Plus/> Tambah pop-up</Button><Button type="button" disabled={Boolean(busy)} onClick={() => void persist()}><Save/>{busy === 'save' ? 'Menyimpan…' : 'Save'}</Button></div>
  </section>;
}
