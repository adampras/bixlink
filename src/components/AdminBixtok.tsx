import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Cfg = { link_slots: number; max_links: number; enabled: boolean; live_enabled: boolean; gifts_enabled: boolean; live_min_stake_usd: number; live_max_minutes: number; features: Record<string, boolean>; menus: { key: string; label: string; enabled: boolean }[] };
const FEATURES: [string, string][] = [['upload', 'Posting link & kamera member'], ['music', 'Pencarian musik'], ['filters', 'Filter wajah'], ['text', 'Teks bebas geser'], ['likes', 'Like'], ['comments', 'Komentar LIVE'], ['share', 'Bagikan'], ['bixp_gifts', 'Saweran BIXP'], ['bix_gifts', 'Saweran BIXCOIN']];

export function AdminBixtok({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-bixtok'], queryFn: async () => {
    const [c, g, v, l, so] = await Promise.all([
      supabase.from('bixtok_config').select('*').eq('id', 1).single(),
      supabase.from('bixtok_gifts').select('*').order('sort'),
      supabase.from('bixtok_videos').select('*').order('sort'),
      supabase.from('bixtok_lives').select('*').eq('status', 'live').order('started_at', { ascending: false }),
      supabase.from('bixtok_sounds').select('*').order('sort'),
    ]);
    if (c.error) throw c.error;
    return { cfg: c.data as unknown as Cfg, gifts: g.data ?? [], videos: v.data ?? [], lives: l.data ?? [], sounds: so.data ?? [] };
  } });
  const [draft, setDraft] = useState<Cfg | null>(null);
  const cfg = draft ?? q.data?.cfg ?? null;
  const refresh = async () => { setDraft(null); await qc.invalidateQueries({ queryKey: ['admin-bixtok'] }); await qc.invalidateQueries({ queryKey: ['bixtok'] }); };
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => { const { error } = await p; if (error) onMessage(error.message); else { onMessage(ok); await refresh(); } };
  const set = (patch: Partial<Cfg>) => cfg && setDraft({ ...cfg, ...patch });
  const [gift, setGift] = useState({ name: '', emoji: '🎁', currency: 'BIXP', price: '1' });
  const [vid, setVid] = useState({ caption: '', video_url: '', creator_name: 'BIXLINK', creator_code: '' });
  const [links, setLinks] = useState<string[]>(['', '', '', '', '']);
  const [snd, setSnd] = useState({ title: '', artist: '', category: 'Trending', audio_url: '' });

  if (q.isLoading || !cfg) return <p className="mt-8 text-sm text-muted-foreground">Memuat BIXTOK…</p>;
  const Toggle = ({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) => <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"><span>{label}</span><input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-primary"/></label>;

  return <section className="mt-8 max-w-4xl space-y-8">
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Clapperboard/> BIXTOK Manager</h2>
      <p className="mt-1 text-xs text-muted-foreground">Semua saklar, syarat LIVE, menu tab, katalog hadiah dan feed video BIXTOK.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Toggle on={cfg.enabled} label="BIXTOK aktif" onChange={v => set({ enabled: v })}/>
        <Toggle on={cfg.live_enabled} label="Go LIVE dibuka" onChange={v => set({ live_enabled: v })}/>
        <Toggle on={cfg.gifts_enabled} label="Saweran dibuka" onChange={v => set({ gifts_enabled: v })}/>
        {FEATURES.map(([k, l]) => <Toggle key={k} on={cfg.features[k] !== false} label={l} onChange={v => set({ features: { ...cfg.features, [k]: v } })}/>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Syarat LIVE: minimal total staking aktif (USD)<input className="form-input mt-1" type="number" min={0} step="1" value={cfg.live_min_stake_usd} onChange={e => set({ live_min_stake_usd: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Durasi LIVE maksimal (menit)<input className="form-input mt-1" type="number" min={5} max={720} value={cfg.live_max_minutes} onChange={e => set({ live_max_minutes: Number(e.target.value) })}/></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Slot link awal di form posting<input className="form-input mt-1" type="number" min={1} max={20} value={cfg.link_slots} onChange={e => set({ link_slots: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Maksimal link per posting<input className="form-input mt-1" type="number" min={1} max={20} value={cfg.max_links} onChange={e => set({ max_links: Number(e.target.value) })}/></label>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Member wajib punya minimal 1 paket staking aktif; isi 0 untuk paket apa saja.</p>
      <h3 className="mt-5 text-sm font-bold">Menu tab BIXTOK</h3>
      <div className="mt-2 space-y-2">{cfg.menus.map((m, i) => <div key={i} className="flex gap-2"><input className="form-input flex-1" value={m.label} maxLength={20} onChange={e => set({ menus: cfg.menus.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}/><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={m.enabled} onChange={e => set({ menus: cfg.menus.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x) })}/>Tampil</label><Button size="icon" variant="ghost" title="Hapus menu" onClick={() => set({ menus: cfg.menus.filter((_, j) => j !== i) })}><Trash2/></Button></div>)}
        <Button variant="outline" size="sm" onClick={() => set({ menus: [...cfg.menus, { key: `custom${Date.now()}`, label: 'New tab', enabled: true }] })}><Plus/>Tambah menu</Button>
        <p className="text-[11px] text-muted-foreground">Tab kustom menampilkan feed video utama.</p>
      </div>
      <Button className="mt-5" disabled={!draft} onClick={() => run(supabase.from('bixtok_config').update({ enabled: cfg.enabled, live_enabled: cfg.live_enabled, gifts_enabled: cfg.gifts_enabled, live_min_stake_usd: Math.max(0, cfg.live_min_stake_usd), live_max_minutes: Math.min(720, Math.max(5, cfg.live_max_minutes)), features: cfg.features, menus: cfg.menus, link_slots: Math.min(20, Math.max(1, cfg.link_slots)), max_links: Math.min(20, Math.max(1, cfg.max_links, cfg.link_slots)), updated_at: new Date().toISOString() }).eq('id', 1), 'Pengaturan BIXTOK tersimpan.')}>Simpan pengaturan</Button>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Katalog hadiah saweran</h3>
      <div className="mt-3 space-y-2">{q.data!.gifts.map(g => <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="text-xl">{g.emoji}</span><b className="flex-1">{g.name}</b>
        <input className="form-input w-24" type="number" min={0.01} step="0.01" defaultValue={g.price} onBlur={e => Number(e.target.value) !== Number(g.price) && run(supabase.from('bixtok_gifts').update({ price: Number(e.target.value) }).eq('id', g.id), 'Harga diubah.')}/>
        <span className="w-12 text-xs">{g.currency}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={g.enabled} onChange={e => run(supabase.from('bixtok_gifts').update({ enabled: e.target.checked }).eq('id', g.id), 'Status hadiah diubah.')}/>Aktif</label>
        <Button size="icon" variant="ghost" title="Hapus hadiah" onClick={() => run(supabase.from('bixtok_gifts').delete().eq('id', g.id), 'Hadiah dihapus.')}><Trash2/></Button>
      </div>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-5" onSubmit={e => { e.preventDefault(); run(supabase.from('bixtok_gifts').insert({ name: gift.name.trim().slice(0, 40), emoji: gift.emoji.slice(0, 4), currency: gift.currency, price: Number(gift.price), sort: (q.data!.gifts.length + 1) }), 'Hadiah ditambahkan.'); setGift({ name: '', emoji: '🎁', currency: 'BIXP', price: '1' }); }}>
        <input className="form-input" placeholder="Emoji" value={gift.emoji} onChange={e => setGift({ ...gift, emoji: e.target.value })}/>
        <input className="form-input sm:col-span-2" placeholder="Nama hadiah" required value={gift.name} onChange={e => setGift({ ...gift, name: e.target.value })}/>
        <div className="flex gap-1"><select className="form-input" value={gift.currency} onChange={e => setGift({ ...gift, currency: e.target.value })}><option>BIXP</option><option>BIX</option></select><input className="form-input w-20" type="number" min={0.01} step="0.01" value={gift.price} onChange={e => setGift({ ...gift, price: e.target.value })}/></div>
        <Button type="submit"><Plus/>Tambah</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Feed video</h3>
      <div className="mt-3 space-y-2">{q.data!.videos.map(v => <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="min-w-0 flex-1 truncate"><b>@{v.creator_name}</b> · <span className="uppercase text-[10px]">{v.source_kind}</span> · {v.caption}</span>
        <input className="form-input w-40" defaultValue={v.caption} placeholder="Caption" onBlur={e => e.target.value !== v.caption && run(supabase.from('bixtok_videos').update({ caption: e.target.value.slice(0, 300) }).eq('id', v.id), 'Caption diubah.')}/><span className="text-xs text-muted-foreground">♥ {v.likes}{v.creator_id ? ' · bisa disawer' : ''}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.enabled} onChange={e => run(supabase.from('bixtok_videos').update({ enabled: e.target.checked }).eq('id', v.id), 'Status video diubah.')}/>Tayang</label>
        <Button size="icon" variant="ghost" title="Hapus video" onClick={() => run(supabase.from('bixtok_videos').delete().eq('id', v.id), 'Video dihapus.')}><Trash2/></Button>
      </div>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={async e => { e.preventDefault();
        const urls = links.map(x => x.trim()).filter(Boolean);
        if (!urls.length || urls.some(u => !/^https:\/\/\S+$/.test(u))) return onMessage('Isi minimal 1 link, semua harus https://');
        let creator_id: string | null = null;
        if (vid.creator_code.trim()) { const { data } = await supabase.from('referral_codes').select('user_id').eq('code', vid.creator_code.trim().toUpperCase()).maybeSingle(); if (!data) return onMessage('BIX ID kreator tidak ditemukan.'); creator_id = data.user_id; }
        const src = (u: string) => /tiktok\.com/i.test(u) ? 'tiktok' : /youtu/i.test(u) ? 'youtube' : /instagram\.com/i.test(u) ? 'instagram' : 'link';
        await run(supabase.from('bixtok_videos').insert(urls.map((u, i) => ({ caption: vid.caption.slice(0, 200), video_url: u, source_kind: src(u), media_kind: /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) ? 'photo' : 'video', creator_name: vid.creator_name.trim().slice(0, 30) || 'BIXLINK', creator_id, sort: q.data!.videos.length + 1 + i }))), `${urls.length} posting ditambahkan.`);
        setLinks(['', '', '', '', '']); setVid({ caption: '', video_url: '', creator_name: 'BIXLINK', creator_code: '' }); }}>
        <div className="grid gap-2 sm:col-span-2">{links.map((l, i) => <div key={i} className="flex gap-2"><input className="form-input flex-1" placeholder={`Link ${i + 1}: TikTok / YouTube / Instagram / MP4 (https://…)`} value={l} onChange={e => setLinks(links.map((x, j) => j === i ? e.target.value : x))}/><Button type="button" size="icon" variant="ghost" title="Hapus link" disabled={links.length <= 1} onClick={() => setLinks(links.filter((_, j) => j !== i))}><Trash2/></Button></div>)}
          <Button type="button" variant="outline" size="sm" disabled={links.length >= 20} onClick={() => setLinks([...links, ''])}><Plus/>Tambah link</Button></div>
        <input className="form-input sm:col-span-2" placeholder="Caption" value={vid.caption} onChange={e => setVid({ ...vid, caption: e.target.value })}/>
        <input className="form-input" placeholder="Nama kreator" value={vid.creator_name} onChange={e => setVid({ ...vid, creator_name: e.target.value })}/>
        <input className="form-input" placeholder="BIX ID kreator (opsional, untuk saweran)" value={vid.creator_code} onChange={e => setVid({ ...vid, creator_code: e.target.value })}/>
        <Button type="submit" className="sm:col-span-2"><Plus/>Posting semua link</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Katalog musik BIXTOK</h3>
      <p className="text-[11px] text-muted-foreground">Member juga dapat mencari musik online (preview 30 detik) jika fitur musik aktif.</p>
      <div className="mt-3 space-y-2">{q.data!.sounds.map(m => <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="min-w-0 flex-1 truncate">♫ <b>{m.title}</b> · {m.artist} · {m.category}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={m.enabled} onChange={e => run(supabase.from('bixtok_sounds').update({ enabled: e.target.checked }).eq('id', m.id), 'Status musik diubah.')}/>Aktif</label>
        <Button size="icon" variant="ghost" title="Hapus musik" onClick={() => run(supabase.from('bixtok_sounds').delete().eq('id', m.id), 'Musik dihapus.')}><Trash2/></Button>
      </div>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); if (!/^https:\/\//.test(snd.audio_url)) return onMessage('Link audio harus https://'); run(supabase.from('bixtok_sounds').insert({ ...snd, title: snd.title.slice(0, 80), sort: q.data!.sounds.length + 1 }), 'Musik ditambahkan.'); setSnd({ title: '', artist: '', category: 'Trending', audio_url: '' }); }}>
        <input className="form-input" required placeholder="Judul" value={snd.title} onChange={e => setSnd({ ...snd, title: e.target.value })}/>
        <input className="form-input" placeholder="Artis" value={snd.artist} onChange={e => setSnd({ ...snd, artist: e.target.value })}/>
        <input className="form-input" placeholder="Kategori" value={snd.category} onChange={e => setSnd({ ...snd, category: e.target.value })}/>
        <input className="form-input" required placeholder="Link MP3 https://…" value={snd.audio_url} onChange={e => setSnd({ ...snd, audio_url: e.target.value })}/>
        <Button type="submit" className="sm:col-span-4"><Plus/>Tambah musik</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">LIVE berjalan ({q.data!.lives.length})</h3>
      <div className="mt-3 space-y-2">{q.data!.lives.map(l => <div key={l.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"><span className="flex-1">🔴 @{l.host_name} · {l.title}</span><Button size="sm" variant="destructive" onClick={() => run(supabase.rpc('bixtok_end_live', { p_id: l.id }), 'LIVE dihentikan.')}>Hentikan</Button></div>)}
        {!q.data!.lives.length && <p className="text-xs text-muted-foreground">Tidak ada LIVE saat ini.</p>}</div>
    </div>
  </section>;
}
