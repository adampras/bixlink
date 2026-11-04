import { BACKDROPS, allBackdrops } from '@/lib/bixtok-backdrops';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Cfg = { challenge_enabled?: boolean; challenge_tag?: string | null; challenge_title?: string | null; challenge_prize?: string | null; challenge_ends_at?: string | null; clips_enabled?: boolean; link_slots: number; max_links: number; enabled: boolean; live_enabled: boolean; gifts_enabled: boolean; live_min_stake_usd: number; live_max_minutes: number; features: Record<string, boolean>; menus: { key: string; label: string; enabled: boolean }[]; stage_max: number; live_cta: boolean; host_gifts: boolean; auto_follow_back: boolean; replay_enabled: boolean; soundboard: boolean; pk_enabled: boolean; showcase_enabled: boolean; pk_bix_weight: number; withdraw_min_bix?: number; owner2_isolation?: boolean; tester_code?: string | null; creator_share_pct?: number; backdrops_enabled?: boolean; live_backdrops?: { id: string; name: string; url?: string; css?: string }[] };
const FEATURES: [string, string][] = [['upload', 'Member link & camera posting'], ['music', 'Pencarian musik'], ['filters', 'Filter wajah'], ['text', 'Teks bebas geser'], ['likes', 'Like'], ['comments', 'Komentar LIVE'], ['share', 'Bagikan'], ['bixp_gifts', 'Saweran BIXP'], ['bix_gifts', 'Saweran BIXCOIN']];

export function AdminBixtok({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-bixtok'], queryFn: async () => {
    const [c, g, v, l, so, oh, sc] = await Promise.all([
      supabase.from('bixtok_config').select('*').eq('id', 1).single(),
      supabase.from('bixtok_gifts').select('*').order('sort'),
      supabase.from('bixtok_videos').select('*').order('sort'),
      supabase.from('bixtok_lives').select('*').eq('status', 'live').order('started_at', { ascending: false }),
      supabase.from('bixtok_sounds').select('*').order('sort'),
      supabase.from('bixtok_official_hosts').select('user_id,display_name,created_at').order('created_at'),
      supabase.from('bixtok_live_schedules').select('id,title,host_name,starts_at,status').eq('status', 'scheduled').order('starts_at'),
    ]);
    if (c.error) throw c.error;
    return { cfg: c.data as unknown as Cfg, gifts: g.data ?? [], videos: v.data ?? [], lives: l.data ?? [], sounds: so.data ?? [], officials: oh.data ?? [], schedules: sc.data ?? [] };
  } });
  const [draft, setDraft] = useState<Cfg | null>(null);
  const cfg = draft ?? q.data?.cfg ?? null;
  const refresh = async () => { setDraft(null); await qc.invalidateQueries({ queryKey: ['admin-bixtok'] }); await qc.invalidateQueries({ queryKey: ['bixtok'] }); };
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => { const { error } = await p; if (error) onMessage(error.message); else { onMessage(ok); await refresh(); } };
  const set = (patch: Partial<Cfg>) => cfg && setDraft({ ...cfg, ...patch });
  const [gift, setGift] = useState({ name: '', emoji: '🎁', currency: 'BIXP', price: '1' });
  const [vid, setVid] = useState({ caption: '', video_url: '', creator_name: 'BIXLINK', creator_code: '' });
  const [links, setLinks] = useState<string[]>(['', '', '', '', '']);
  const [off, setOff] = useState({ code: '', name: '' });
  const [sched, setSched] = useState({ title: '', at: '', host: 'BIXLINK OFFICIAL' });
  const [bg, setBg] = useState({ name: '', value: '' });
  const [snd, setSnd] = useState({ title: '', artist: '', category: 'Trending', audio_url: '' });

  if (q.isLoading || !cfg) return <p className="mt-8 text-sm text-muted-foreground">Memuat BIXTOK…</p>;
  const Toggle = ({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) => <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"><span>{label}</span><input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="h-5 w-5 accent-primary"/></label>;

  return <section className="mt-8 max-w-4xl space-y-8">
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Clapperboard/> BIXTOK Manager</h2>
      <p className="mt-1 text-xs text-muted-foreground">All toggles, LIVE requirements, tab menus, gift catalog, and BIXTOK video feed.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Toggle on={cfg.enabled} label="BIXTOK active" onChange={v => set({ enabled: v })}/>
        <Toggle on={cfg.live_enabled} label="Go LIVE dibuka" onChange={v => set({ live_enabled: v })}/>
        <Toggle on={cfg.gifts_enabled} label="Saweran dibuka" onChange={v => set({ gifts_enabled: v })}/>
        <Toggle on={cfg.host_gifts !== false} label="Hosts can tip stage guests" onChange={v => set({ host_gifts: v })}/>
        <Toggle on={cfg.live_cta !== false} label="Staking/Presale/Shop buttons in LIVE" onChange={v => set({ live_cta: v })}/>
        <Toggle on={cfg.auto_follow_back !== false} label="OFFICIAL accounts automatically follow members back" onChange={v => set({ auto_follow_back: v })}/>
        <Toggle on={cfg.replay_enabled !== false} label="Rekam & arsip LIVE (Replay)" onChange={v => set({ replay_enabled: v })}/>
        <Toggle on={cfg.soundboard !== false} label="Soundboard host" onChange={v => set({ soundboard: v })}/>
        <Toggle on={cfg.showcase_enabled !== false} label="Promo showcase in LIVE" onChange={v => set({ showcase_enabled: v })}/>
        <Toggle on={cfg.backdrops_enabled !== false} label="Camera off mode + LIVE background" onChange={v => set({ backdrops_enabled: v })}/>
        <Toggle on={cfg.pk_enabled !== false} label="PK Battle" onChange={v => set({ pk_enabled: v })}/>
        <Toggle on={cfg.owner2_isolation === true} label="Admin 2 network isolation (content, LIVE & follows separated from Admin 1)" onChange={v => set({ owner2_isolation: v })}/>
        {FEATURES.map(([k, l]) => <Toggle key={k} on={cfg.features[k] !== false} label={l} onChange={v => set({ features: { ...cfg.features, [k]: v } })}/>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">LIVE requirement: minimum active total staking (USD)<input className="form-input mt-1" type="number" min={0} step="1" value={cfg.live_min_stake_usd} onChange={e => set({ live_min_stake_usd: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Testing accounts when BIXTOK is closed (referral code, e.g. BIX-123456)<input className="form-input mt-1" placeholder="BIX-XXXXXX" value={cfg.tester_code ?? ''} onChange={e => set({ tester_code: e.target.value })}/></label>
        <label className="text-xs text-muted-foreground">Maximum LIVE duration (minutes)<input className="form-input mt-1" type="number" min={5} max={720} value={cfg.live_max_minutes} onChange={e => set({ live_max_minutes: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Skor PK: 1 BIX = berapa poin (1 BIXP = 1 poin)<input className="form-input mt-1" type="number" min={1} max={10000} value={cfg.pk_bix_weight ?? 100} onChange={e => set({ pk_bix_weight: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Minimum gift balance withdrawal to Wallet (BIX)<input className="form-input mt-1" type="number" min={1} max={1000000} value={cfg.withdraw_min_bix ?? 100} onChange={e => set({ withdraw_min_bix: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Creator's share of gifts (%) — remainder is platform fee<input className="form-input mt-1" type="number" min={50} max={100} value={cfg.creator_share_pct ?? 90} onChange={e => set({ creator_share_pct: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Maksimal tamu naik panggung (1–5)<input className="form-input mt-1" type="number" min={1} max={5} value={cfg.stage_max ?? 5} onChange={e => set({ stage_max: Number(e.target.value) })}/></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Initial link slot in post form<input className="form-input mt-1" type="number" min={1} max={20} value={cfg.link_slots} onChange={e => set({ link_slots: Number(e.target.value) })}/></label>
        <label className="text-xs text-muted-foreground">Maksimal link per posting<input className="form-input mt-1" type="number" min={1} max={20} value={cfg.max_links} onChange={e => set({ max_links: Number(e.target.value) })}/></label>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Members must have at least 1 active staking package; enter 0 for any package.</p>
      <h3 className="mt-5 text-sm font-bold">Menu tab BIXTOK</h3>
      <div className="mt-2 space-y-2">{cfg.menus.map((m, i) => <div key={i} className="flex gap-2"><input className="form-input flex-1" value={m.label} maxLength={20} onChange={e => set({ menus: cfg.menus.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}/><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={m.enabled} onChange={e => set({ menus: cfg.menus.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x) })}/>Tampil</label><Button size="icon" variant="ghost" title="Delete menu" onClick={() => set({ menus: cfg.menus.filter((_, j) => j !== i) })}><Trash2/></Button></div>)}
        <Button variant="outline" size="sm" onClick={() => set({ menus: [...cfg.menus, { key: `custom${Date.now()}`, label: 'New tab', enabled: true }] })}><Plus/>Add menu</Button>
        <p className="text-[11px] text-muted-foreground">Tab kustom menampilkan feed video utama.</p>
      </div>
      <div className="mt-5 rounded-lg border border-border p-3">
        <b className="text-sm">Background LIVE ({BACKDROPS.length} bawaan + {(cfg.live_backdrops ?? []).length} tambahan)</b>
        <p className="text-xs text-muted-foreground">Used by hosts when camera is off. Add an https image URL or CSS color code (e.g. linear-gradient(...)). Click Save settings after adding.</p>
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-10">{allBackdrops(cfg.live_backdrops).map(b => <div key={b.id} className="relative" title={b.name}><i className="block aspect-[9/14] rounded" style={{ background: b.css }}/>{b.id.startsWith('c:') && <button type="button" className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground" onClick={() => set({ live_backdrops: (cfg.live_backdrops ?? []).filter(x => `c:${x.id}` !== b.id) })}>×</button>}</div>)}</div>
        <div className="mt-2 flex flex-wrap gap-2"><input className="form-input flex-1" placeholder="Nama background" value={bg.name} onChange={e => setBg({ ...bg, name: e.target.value })}/><input className="form-input flex-[2]" placeholder="https://image.jpg or linear-gradient(...)" value={bg.value} onChange={e => setBg({ ...bg, value: e.target.value })}/>
          <Button type="button" variant="outline" disabled={!bg.value.trim()} onClick={() => { const v = bg.value.trim().slice(0, 280); const isUrl = /^https:\/\//.test(v); if (!isUrl && !/gradient\(|^#[0-9a-f]{3,8}$/i.test(v)) return onMessage('Use an https URL or CSS gradient/color.'); set({ live_backdrops: [...(cfg.live_backdrops ?? []), { id: Math.random().toString(36).slice(2, 9), name: bg.name.trim() || 'Custom', ...(isUrl ? { url: v } : { css: v }) }] }); setBg({ name: '', value: '' }); }}>Add</Button></div>
      </div>
      <div className="mt-4 rounded-lg border border-border p-3">
        <b className="text-sm">🏆 Tantangan mingguan &amp; ✂️ Klip LIVE</b>
        <p className="text-xs text-muted-foreground">Banner appears in For You feed. Rewards are announcement text only — winners are reviewed and paid manually by Admin, not automatically.</p>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.challenge_enabled === true} onChange={e => set({ challenge_enabled: e.target.checked })}/>Tampilkan tantangan</label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input className="form-input" placeholder="Tagar (mis. BIXFoxDance)" value={cfg.challenge_tag ?? ''} onChange={e => set({ challenge_tag: e.target.value.replace(/[^\p{L}\d_]/gu, '').slice(0, 30) })}/>
          <input className="form-input" placeholder="Judul tantangan" value={cfg.challenge_title ?? ''} onChange={e => set({ challenge_title: e.target.value.slice(0, 80) })}/>
          <input className="form-input" placeholder="Reward (e.g. 500 BIXP for top 3)" value={cfg.challenge_prize ?? ''} onChange={e => set({ challenge_prize: e.target.value.slice(0, 80) })}/>
          <input className="form-input" type="datetime-local" value={cfg.challenge_ends_at ? new Date(new Date(cfg.challenge_ends_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => set({ challenge_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}/>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.clips_enabled !== false} onChange={e => set({ clips_enabled: e.target.checked })}/>Hosts may create LIVE moment Clips (15 sec, max 20/day)</label>
      </div>
      <Button className="mt-5" disabled={!draft} onClick={() => run(supabase.from('bixtok_config').update({ enabled: cfg.enabled, live_enabled: cfg.live_enabled, gifts_enabled: cfg.gifts_enabled, live_min_stake_usd: Math.max(0, cfg.live_min_stake_usd), live_max_minutes: Math.min(720, Math.max(5, cfg.live_max_minutes)), features: cfg.features, menus: cfg.menus, stage_max: Math.min(5, Math.max(1, Math.round(cfg.stage_max ?? 5))), live_cta: cfg.live_cta !== false, host_gifts: cfg.host_gifts !== false, auto_follow_back: cfg.auto_follow_back !== false, replay_enabled: cfg.replay_enabled !== false, soundboard: cfg.soundboard !== false, showcase_enabled: cfg.showcase_enabled !== false, backdrops_enabled: cfg.backdrops_enabled !== false, live_backdrops: (cfg.live_backdrops ?? []).slice(0, 60), pk_enabled: cfg.pk_enabled !== false, owner2_isolation: cfg.owner2_isolation === true, tester_code: (cfg.tester_code ?? '').trim().toUpperCase() || null, creator_share_pct: Math.min(100, Math.max(50, Number(cfg.creator_share_pct) || 90)), pk_bix_weight: Math.min(10000, Math.max(1, Number(cfg.pk_bix_weight) || 100)), challenge_enabled: cfg.challenge_enabled === true, challenge_tag: (cfg.challenge_tag ?? '').trim() || null, challenge_title: (cfg.challenge_title ?? '').trim() || null, challenge_prize: (cfg.challenge_prize ?? '').trim() || null, challenge_ends_at: cfg.challenge_ends_at ?? null, clips_enabled: cfg.clips_enabled !== false, link_slots: Math.min(20, Math.max(1, cfg.link_slots)), max_links: Math.min(20, Math.max(1, cfg.max_links, cfg.link_slots)), updated_at: new Date().toISOString() }).eq('id', 1), 'Pengaturan BIXTOK tersimpan.')}>Save settings</Button>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">OFFICIAL LIVE broadcaster accounts</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">Accounts on this list get the OFFICIAL BROADCAST button, OFFICIAL LIVE badge, and their broadcasts notify all members. Admin 1 is always included.</p>
      <div className="mt-3 space-y-2">{q.data!.officials.map(o => <div key={o.user_id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="flex-1">📡 <b>{o.display_name}</b></span>
        <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Cabut akses OFFICIAL LIVE ${o.display_name}?`)) void run(supabase.rpc('bixtok_official_remove', { p_user: o.user_id }), 'Akses OFFICIAL LIVE dicabut.'); }}>Delete</Button>
      </div>)}{!q.data!.officials.length && <p className="text-xs text-muted-foreground">No additional accounts yet.</p>}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={e => { e.preventDefault(); if (!off.code.trim()) return; void run(supabase.rpc('bixtok_official_add', { p_code: off.code, p_name: off.name }), 'OFFICIAL LIVE account added.'); setOff({ code: '', name: '' }); }}>
        <input className="form-input" required placeholder="BIX ID / username member" value={off.code} onChange={e => setOff({ ...off, code: e.target.value })}/>
        <input className="form-input" placeholder="Nama tampil (mis. BIXLINK INDONESIA)" maxLength={40} value={off.name} onChange={e => setOff({ ...off, name: e.target.value })}/>
        <Button type="submit"><Plus/>Add account</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Jadwal OFFICIAL LIVE</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">Members see countdown and can tap "Remind me".</p>
      <div className="mt-3 space-y-2">{q.data!.schedules.map(s => <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="flex-1">📅 <b>{s.title}</b> · @{s.host_name} · {new Date(s.starts_at).toLocaleString('id-ID')}</span>
        <Button size="sm" variant="ghost" onClick={() => run(supabase.from('bixtok_live_schedules').update({ status: 'cancelled' }).eq('id', s.id), 'Jadwal dibatalkan.')}>Batalkan</Button>
      </div>)}{!q.data!.schedules.length && <p className="text-xs text-muted-foreground">No schedule yet.</p>}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={async e => { e.preventDefault();
        const at = new Date(sched.at); if (!sched.title.trim() || Number.isNaN(at.getTime()) || at.getTime() < Date.now()) return onMessage('Enter title and upcoming time.');
        const { data: me } = await supabase.auth.getUser();
        await run(supabase.from('bixtok_live_schedules').insert({ title: sched.title.trim().slice(0, 80), host_name: sched.host.trim().slice(0, 40) || 'BIXLINK OFFICIAL', starts_at: at.toISOString(), created_by: me.user!.id }), 'Jadwal OFFICIAL LIVE ditambahkan.');
        setSched({ title: '', at: '', host: 'BIXLINK OFFICIAL' }); }}>
        <input className="form-input" required placeholder="Judul (mis. Webinar BIXLINK)" value={sched.title} onChange={e => setSched({ ...sched, title: e.target.value })}/>
        <input className="form-input" placeholder="Nama host" value={sched.host} onChange={e => setSched({ ...sched, host: e.target.value })}/>
        <input className="form-input" required type="datetime-local" aria-label="Waktu mulai" value={sched.at} onChange={e => setSched({ ...sched, at: e.target.value })}/>
        <Button type="submit"><Plus/>Jadwalkan</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Katalog hadiah saweran</h3>
      <div className="mt-3 space-y-2">{q.data!.gifts.map(g => <div key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="text-xl">{g.emoji}</span><b className="flex-1">{g.name}</b>
        <input className="form-input w-24" type="number" min={0.01} step="0.01" defaultValue={g.price} onBlur={e => Number(e.target.value) !== Number(g.price) && run(supabase.from('bixtok_gifts').update({ price: Number(e.target.value) }).eq('id', g.id), 'Harga diubah.')}/>
        <span className="w-12 text-xs">{g.currency}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={g.enabled} onChange={e => run(supabase.from('bixtok_gifts').update({ enabled: e.target.checked }).eq('id', g.id), 'Status hadiah diubah.')}/>Active</label>
        <Button size="icon" variant="ghost" title="Delete gift" onClick={() => run(supabase.from('bixtok_gifts').delete().eq('id', g.id), 'Hadiah dihapus.')}><Trash2/></Button>
      </div>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-5" onSubmit={e => { e.preventDefault(); run(supabase.from('bixtok_gifts').insert({ name: gift.name.trim().slice(0, 40), emoji: gift.emoji.slice(0, 4), currency: gift.currency, price: Number(gift.price), sort: (q.data!.gifts.length + 1) }), 'Hadiah ditambahkan.'); setGift({ name: '', emoji: '🎁', currency: 'BIXP', price: '1' }); }}>
        <input className="form-input" placeholder="Emoji" value={gift.emoji} onChange={e => setGift({ ...gift, emoji: e.target.value })}/>
        <input className="form-input sm:col-span-2" placeholder="Nama hadiah" required value={gift.name} onChange={e => setGift({ ...gift, name: e.target.value })}/>
        <div className="flex gap-1"><select className="form-input" value={gift.currency} onChange={e => setGift({ ...gift, currency: e.target.value })}><option>BIXP</option><option>BIX</option></select><input className="form-input w-20" type="number" min={0.01} step="0.01" value={gift.price} onChange={e => setGift({ ...gift, price: e.target.value })}/></div>
        <Button type="submit"><Plus/>Add</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Feed video</h3>
      <div className="mt-3 space-y-2">{q.data!.videos.map(v => <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="min-w-0 flex-1 truncate"><b>@{v.creator_name}</b> · <span className="uppercase text-[10px]">{v.source_kind}</span> · {v.caption}</span>
        <input className="form-input w-40" defaultValue={v.caption} placeholder="Caption" onBlur={e => e.target.value !== v.caption && run(supabase.from('bixtok_videos').update({ caption: e.target.value.slice(0, 300) }).eq('id', v.id), 'Caption diubah.')}/><span className="text-xs text-muted-foreground">♥ {v.likes}{v.creator_id ? ' · bisa disawer' : ''}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.enabled} onChange={e => run(supabase.from('bixtok_videos').update({ enabled: e.target.checked }).eq('id', v.id), 'Status video diubah.')}/>Tayang</label>
        <Button size="icon" variant="ghost" title="Delete video" onClick={() => run(supabase.from('bixtok_videos').delete().eq('id', v.id), 'Video dihapus.')}><Trash2/></Button>
      </div>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={async e => { e.preventDefault();
        const urls = links.map(x => x.trim()).filter(Boolean);
        if (!urls.length || urls.some(u => !/^https:\/\/\S+$/.test(u))) return onMessage('Enter at least 1 link, all must be https://');
        let creator_id: string | null = null;
        if (vid.creator_code.trim()) { const { data } = await supabase.from('referral_codes').select('user_id').eq('code', vid.creator_code.trim().toUpperCase()).maybeSingle(); if (!data) return onMessage('Creator BIX ID not found.'); creator_id = data.user_id; }
        const src = (u: string) => /tiktok\.com/i.test(u) ? 'tiktok' : /youtu/i.test(u) ? 'youtube' : /instagram\.com/i.test(u) ? 'instagram' : 'link';
        await run(supabase.from('bixtok_videos').insert(urls.map((u, i) => ({ caption: vid.caption.slice(0, 200), video_url: u, source_kind: src(u), media_kind: /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) ? 'photo' : 'video', creator_name: vid.creator_name.trim().slice(0, 30) || 'BIXLINK', creator_id, sort: q.data!.videos.length + 1 + i }))), `${urls.length} posting ditambahkan.`);
        setLinks(['', '', '', '', '']); setVid({ caption: '', video_url: '', creator_name: 'BIXLINK', creator_code: '' }); }}>
        <div className="grid gap-2 sm:col-span-2">{links.map((l, i) => <div key={i} className="flex gap-2"><input className="form-input flex-1" placeholder={`Link ${i + 1}: TikTok / YouTube / Instagram / MP4 (https://…)`} value={l} onChange={e => setLinks(links.map((x, j) => j === i ? e.target.value : x))}/><Button type="button" size="icon" variant="ghost" title="Delete link" disabled={links.length <= 1} onClick={() => setLinks(links.filter((_, j) => j !== i))}><Trash2/></Button></div>)}
          <Button type="button" variant="outline" size="sm" disabled={links.length >= 20} onClick={() => setLinks([...links, ''])}><Plus/>Add link</Button></div>
        <input className="form-input sm:col-span-2" placeholder="Caption" value={vid.caption} onChange={e => setVid({ ...vid, caption: e.target.value })}/>
        <input className="form-input" placeholder="Nama kreator" value={vid.creator_name} onChange={e => setVid({ ...vid, creator_name: e.target.value })}/>
        <input className="form-input" placeholder="Creator BIX ID (optional, for tips)" value={vid.creator_code} onChange={e => setVid({ ...vid, creator_code: e.target.value })}/>
        <Button type="submit" className="sm:col-span-2"><Plus/>Post all links</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">Katalog musik BIXTOK</h3>
      <p className="text-[11px] text-muted-foreground">Members can also search for music online (30-second preview) if the music feature is active.</p>
      <div className="mt-3 space-y-2">{q.data!.sounds.map(m => <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
        <span className="min-w-0 flex-1 truncate">♫ <b>{m.title}</b> · {m.artist} · {m.category}</span>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={m.enabled} onChange={e => run(supabase.from('bixtok_sounds').update({ enabled: e.target.checked }).eq('id', m.id), 'Status musik diubah.')}/>Active</label>
        <Button size="icon" variant="ghost" title="Delete music" onClick={() => run(supabase.from('bixtok_sounds').delete().eq('id', m.id), 'Musik dihapus.')}><Trash2/></Button>
      </div>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); if (!/^https:\/\//.test(snd.audio_url)) return onMessage('Audio link must be https://'); run(supabase.from('bixtok_sounds').insert({ ...snd, title: snd.title.slice(0, 80), sort: q.data!.sounds.length + 1 }), 'Musik ditambahkan.'); setSnd({ title: '', artist: '', category: 'Trending', audio_url: '' }); }}>
        <input className="form-input" required placeholder="Judul" value={snd.title} onChange={e => setSnd({ ...snd, title: e.target.value })}/>
        <input className="form-input" placeholder="Artis" value={snd.artist} onChange={e => setSnd({ ...snd, artist: e.target.value })}/>
        <input className="form-input" placeholder="Kategori" value={snd.category} onChange={e => setSnd({ ...snd, category: e.target.value })}/>
        <input className="form-input" required placeholder="Link MP3 https://…" value={snd.audio_url} onChange={e => setSnd({ ...snd, audio_url: e.target.value })}/>
        <Button type="submit" className="sm:col-span-4"><Plus/>Add music</Button>
      </form>
    </div>

    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">LIVE berjalan ({q.data!.lives.length})</h3>
      <div className="mt-3 space-y-2">{q.data!.lives.map(l => <div key={l.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"><span className="flex-1">🔴 @{l.host_name} · {l.title}</span><Button size="sm" variant="destructive" onClick={() => run(supabase.rpc('bixtok_end_live', { p_id: l.id }), 'LIVE dihentikan.')}>Hentikan</Button></div>)}
        {!q.data!.lives.length && <p className="text-xs text-muted-foreground">No LIVE at the moment.</p>}</div>
    </div>
  </section>;
}
