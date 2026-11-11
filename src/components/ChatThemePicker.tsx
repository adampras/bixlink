import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

/** Member-chosen BIX CALL chat look (per device): background colour, font style and chat wallpaper. */
const KEY = 'bixcall-chat-theme';
type Theme = { bg: string; font: string; wall: string };
const DEF: Theme = { bg: 'obsidian', font: 'clean', wall: 'none' };
const BGS = [['obsidian', 'Obsidian', '#05070a'], ['toska', 'Toska Neon', '#06302b'], ['matcha', 'Matcha', '#16260f'], ['gold', 'Royal Gold', '#2a1f05'], ['purple', 'Cyber Purple', '#1c0b33'], ['pearl', 'Pearl Light', '#eef2f1']] as const;
const FONTS = [['clean', 'Modern Clean'], ['tech', 'Cyber Tech'], ['lux', 'Sovereign Lux'], ['grotesk', 'Futuristic']] as const;
const WALLS = [['none', 'Polos'], ['circuit', 'Sirkuit Web3'], ['hex', 'Hexagon Gold'], ['grid', 'Grid Futuristik'], ['cosmos', 'Kosmos'], ['waves', 'Gelombang']] as const;

function read(): Theme { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEF; } }
export function applyChatTheme(t: Theme = read()) {
  const d = document.body.dataset; d['bcChatBg'] = t.bg; d['bcChatFont'] = t.font; d['bcChatWall'] = t.wall;
}
if (typeof window !== 'undefined') { const run = () => window.setTimeout(() => applyChatTheme(), 0); if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true }); }

export function ChatThemePicker() {
  const [t, setT] = useState<Theme>(DEF);
  useEffect(() => { setT(read()); }, []);
  const set = (p: Partial<Theme>) => { const n = { ...t, ...p }; setT(n); localStorage.setItem(KEY, JSON.stringify(n)); applyChatTheme(n); };
  return <section className="comm-card bc-theme">
    <h3 className="comm-h"><Palette size={14}/> Tema Chat</h3>
    <p className="bc-theme-l">Warna latar</p>
    <div className="bc-theme-row">{BGS.map(([id, l, c]) => <button key={id} type="button" aria-pressed={t.bg === id} onClick={() => set({ bg: id })}><i style={{ background: c }}/>{l}</button>)}</div>
    <p className="bc-theme-l">Model tulisan</p>
    <div className="bc-theme-row">{FONTS.map(([id, l]) => <button key={id} type="button" aria-pressed={t.font === id} className={`bc-font-${id}`} onClick={() => set({ font: id })}>{l}</button>)}</div>
    <p className="bc-theme-l">Gambar latar kotak chat</p>
    <div className="bc-theme-row is-wall">{WALLS.map(([id, l]) => <button key={id} type="button" aria-pressed={t.wall === id} onClick={() => set({ wall: id })}><span className={`bc-wall-prev bc-wall-${id}`}/>{l}</button>)}</div>
  </section>;
}
