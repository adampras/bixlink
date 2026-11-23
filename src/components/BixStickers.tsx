import { useEffect, useRef, useState } from 'react';
import { Smile, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const STICKER_BODY = '🎨 Stiker';
type Pack = { id: string; label: string; items: { id: string; title: string; svg: string }[] };

const G = '#FFD700', P = '#A855F7', O = '#040507';
const frame = (inner: string, bg = O) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE873"/><stop offset=".55" stop-color="${G}"/><stop offset="1" stop-color="#B8860B"/></linearGradient><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C084FC"/><stop offset="1" stop-color="#6D28D9"/></linearGradient></defs><rect x="14" y="14" width="228" height="228" rx="56" fill="${bg}" stroke="url(#g)" stroke-width="8"/>${inner}</svg>`;
const word = (t: string, y = 214, s = 30, c = 'url(#g)') => `<text x="128" y="${y}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${s}" fill="${c}">${t}</text>`;
const fox = (y = 0) => `<g transform="translate(0 ${y})"><path d="M66 70 L98 112 L158 112 L190 70 L184 140 Q128 196 72 140 Z" fill="url(#p)" stroke="url(#g)" stroke-width="5"/><path d="M98 140 Q128 168 158 140 Q128 150 98 140Z" fill="${G}"/><circle cx="106" cy="128" r="7" fill="${G}"/><circle cx="150" cy="128" r="7" fill="${G}"/></g>`;
const coin = (t = 'BIX') => `<circle cx="128" cy="108" r="62" fill="url(#g)" stroke="#8B6508" stroke-width="5"/><circle cx="128" cy="108" r="46" fill="none" stroke="#8B6508" stroke-width="3"/>${word(t, 120, 30, O)}`;

export const PACKS: Pack[] = [
  { id: 'call', label: 'BIX CALL', items: [
    { id: 'halo', title: 'Halo', svg: frame(fox(-8) + word('HALO!')) },
    { id: 'call', title: 'Telepon aku', svg: frame(`<path d="M86 64c10-8 22-4 28 8l10 22c4 9 1 18-7 23l-9 6c8 18 20 30 38 38l6-9c5-8 14-11 23-7l22 10c12 6 16 18 8 28-14 18-38 22-62 10-34-16-58-40-74-74-12-24-8-48 17-55z" fill="url(#g)"/>` + word('CALL ME', 222, 28)) },
    { id: 'ok', title: 'Siap', svg: frame(`<circle cx="128" cy="104" r="58" fill="url(#p)"/><path d="M98 104l22 22 40-44" fill="none" stroke="${G}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` + word('SIAP!')) },
    { id: 'thanks', title: 'Terima kasih', svg: frame(`<path d="M128 170 C60 120 64 62 104 62 C118 62 126 72 128 80 C130 72 138 62 152 62 C192 62 196 120 128 170Z" fill="url(#p)" stroke="url(#g)" stroke-width="6"/>` + word('MAKASIH', 216, 30)) },
    { id: 'wait', title: 'Sebentar', svg: frame(`<circle cx="128" cy="104" r="56" fill="none" stroke="url(#g)" stroke-width="10"/><path d="M128 72v34l22 14" stroke="${P}" stroke-width="10" stroke-linecap="round" fill="none"/>` + word('OTW', 216, 34)) },
    { id: 'gm', title: 'Selamat pagi', svg: frame(`<circle cx="128" cy="110" r="38" fill="url(#g)"/>${Array.from({ length: 8 }, (_, i) => `<rect x="124" y="40" width="8" height="22" rx="4" fill="${P}" transform="rotate(${i * 45} 128 110)"/>`).join('')}` + word('PAGI!', 216, 32)) },
  ] },
  { id: 'bixlink', label: 'BIXLINK', items: [
    { id: 'bix', title: 'BIX Coin', svg: frame(coin() + word('TO THE MOON', 214, 22)) },
    { id: 'link', title: 'BIXLINK', svg: frame(fox(-14) + word('BIXLINK', 212, 34)) },
    { id: 'vip', title: 'VIP', svg: frame(`<path d="M60 150 L72 70 L104 104 L128 58 L152 104 L184 70 L196 150Z" fill="url(#g)" stroke="#8B6508" stroke-width="5"/>` + word('VIP', 210, 44, 'url(#p)')) },
    { id: 'pay', title: 'BIX PAY', svg: frame(`<rect x="62" y="64" width="132" height="88" rx="16" fill="url(#p)" stroke="url(#g)" stroke-width="5"/><rect x="62" y="84" width="132" height="14" fill="${G}"/>` + word('BIX PAY', 210, 32)) },
    { id: 'go', title: 'BIXGO', svg: frame(`<circle cx="88" cy="140" r="20" fill="none" stroke="url(#g)" stroke-width="9"/><circle cx="170" cy="140" r="20" fill="none" stroke="url(#g)" stroke-width="9"/><path d="M88 140 L118 96 H150 L170 140 M118 96 L104 80 H88" fill="none" stroke="${P}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` + word('BIXGO', 214, 34)) },
    { id: 'tok', title: 'BIXTOK', svg: frame(`<rect x="88" y="56" width="80" height="112" rx="16" fill="url(#p)" stroke="url(#g)" stroke-width="5"/><path d="M118 92 L146 112 L118 132Z" fill="${G}"/>` + word('BIXTOK', 214, 32)) },
    { id: 'team', title: 'Team solid', svg: frame(`${[86, 128, 170].map(x => `<circle cx="${x}" cy="92" r="20" fill="url(#g)"/><path d="M${x - 26} 156 Q${x} 112 ${x + 26} 156Z" fill="url(#p)"/>`).join('')}` + word('SOLID!', 214, 32)) },
    { id: 'bismillah', title: 'Bismillah', svg: frame(`<path d="M150 62 A48 48 0 1 0 150 150 A38 38 0 1 1 150 62Z" fill="url(#g)"/><path d="M166 82l6 14 15 1-12 9 4 15-13-8-13 8 4-15-12-9 15-1z" fill="${P}"/>` + word('BISMILLAH', 214, 24)) },
  ] },
];

const MINE_KEY = 'bix-stickers-mine-v1';
const readMine = (): { id: string; data: string }[] => { try { return JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); } catch { return []; } };

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
/** Render any sticker image to a 256px WebP/PNG blob so it is sent as an ordinary chat image. */
async function toBlob(src: string): Promise<Blob> {
  const img = new Image(); img.decoding = 'async'; img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!; const s = Math.min(256 / img.width, 256 / img.height);
  x.drawImage(img, (256 - img.width * s) / 2, (256 - img.height * s) / 2, img.width * s, img.height * s);
  const b = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', 0.9)) ?? await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'));
  if (!b) throw new Error('Stiker gagal diproses'); return b;
}

export function StickerButton({ disabled, onOpen, open }: { disabled?: boolean; onOpen: () => void; open: boolean }) {
  return <Button variant="ghost" size="icon" type="button" className="bc-sticker-btn" aria-label="Stiker" aria-expanded={open} disabled={disabled} onClick={onOpen}><Smile size={18}/></Button>;
}

export function StickerSheet({ onSend, onClose }: { onSend: (blob: Blob) => Promise<boolean>; onClose: () => void }) {
  const [tab, setTab] = useState('call');
  const [mine, setMine] = useState<{ id: string; data: string }[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setMine(readMine()), []);
  const save = (l: typeof mine) => { setMine(l); try { localStorage.setItem(MINE_KEY, JSON.stringify(l)); } catch { setErr('Memori perangkat penuh, hapus beberapa stiker.'); } };
  const send = async (src: string) => { if (busy) return; setBusy(true); setErr(''); try { if (await onSend(await toBlob(src))) onClose(); } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal mengirim'); } setBusy(false); };
  const add = async (f: File) => {
    if (!f.type.startsWith('image/')) { setErr('Pilih file gambar.'); return; }
    if (f.size > 5 * 1024 * 1024) { setErr('Gambar maksimal 5 MB.'); return; }
    if (mine.length >= 40) { setErr('Maksimal 40 stiker kreasi.'); return; }
    try { const b = await toBlob(URL.createObjectURL(f)); const data = await new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsDataURL(b); }); save([{ id: crypto.randomUUID(), data }, ...mine]); setTab('mine'); }
    catch { setErr('Gambar tidak bisa dijadikan stiker.'); }
  };
  const pack = PACKS.find(p => p.id === tab);
  return <div className="bc-stk-bg" onClick={onClose}><div className="bc-stk" role="dialog" aria-label="Stiker" onClick={e => e.stopPropagation()}>
    <div className="bc-stk-head"><b>Stiker</b><Button variant="ghost" size="icon" type="button" aria-label="Tutup" onClick={onClose}><X size={18}/></Button></div>
    <div className="bc-stk-tabs" role="tablist">{PACKS.map(p => <button key={p.id} type="button" role="tab" aria-selected={tab === p.id} className={tab === p.id ? 'is-on' : ''} onClick={() => setTab(p.id)}>{p.label}</button>)}<button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'is-on' : ''} onClick={() => setTab('mine')}>Kreasi Saya</button></div>
    {err && <p className="bc-stk-err" role="alert">{err}</p>}
    <div className="bc-stk-grid">
      {pack ? pack.items.map(s => <button key={s.id} type="button" disabled={busy} aria-label={`Kirim stiker ${s.title}`} onClick={() => void send(svgUrl(s.svg))}><img src={svgUrl(s.svg)} alt="" loading="lazy"/></button>) : <>
        <button type="button" className="bc-stk-add" onClick={() => ref.current?.click()} aria-label="Buat stiker dari foto"><Plus size={22}/><small>Buat stiker</small></button>
        {mine.map(s => <span key={s.id} className="bc-stk-mine"><button type="button" disabled={busy} aria-label="Kirim stiker kreasi" onClick={() => void send(s.data)}><img src={s.data} alt=""/></button><button type="button" className="bc-stk-del" aria-label="Hapus stiker" onClick={() => save(mine.filter(x => x.id !== s.id))}><Trash2 size={12}/></button></span>)}
      </>}
    </div>
    {tab === 'mine' && <small className="bc-stk-note">Stiker kreasi tersimpan di HP ini. Unggah foto/gambar (PNG transparan paling bagus).</small>}
    {busy && <small className="bc-stk-note">Mengirim…</small>}
    <input ref={ref} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void add(f); }}/>
  </div></div>;
}
