import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import fox from '@/assets/fox-icon-180.png.asset.json';
import { Button } from '@/components/ui/button';
import { clampChatPosition } from '@/lib/interaction-comfort';
import { useNavigate } from '@tanstack/react-router';
import { usePublicConfig } from '@/lib/useMember';

const LOAN_CODE = /\b(akun\s*pinjam(an)?|pinjaman\s*leader|loan\s*account|akun\s*loan)\b/i;
const LOAN_INFO = `### 👑 Akun Pinjaman Bersyarat · Leader Global
- **Nilai akun:** paket sampai **$1.000** — Explorer $100 · Pioneer $500 · Builder $1.000
- **Target omset:** 5× nilai paket (contoh $1.000 → $5.000)
- **Setelah 5× tercapai:** reward & challenge khusus dari perusahaan
- **Distribusi BIXCOIN 5–10%** saat member/investor staking skema 70:30
- **Alokasi BIX** saat omset tim di atas $100.000
- Staking 360 hari langsung aktif; pokok terkunci sampai target 5×. Satu klaim per akun, khusus jaringan yang memenuhi syarat. Semua reward ditinjau owner, bukan jaminan profit.`;

type Msg = { role: 'user' | 'assistant'; content: string };

export function FoxChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Halo! Saya **FOX AI**, asisten otomatis BIXLINK 24/7. Ada yang bisa dibantu?' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loanCta, setLoanCta] = useState(false);
  const navigate = useNavigate();
  const { data: cfg } = usePublicConfig();
  const end = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bixlink-chat-position') ?? 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPosition(clampChatPosition(saved.x, saved.y, window.innerWidth, window.innerHeight));
    } catch { /* Unavailable device storage keeps the default position. */ }
    const resize = () => setPosition(current => current ? clampChatPosition(current.x, current.y, window.innerWidth, window.innerHeight) : null);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const finishDrag = (cancelled = false) => {
    const current = drag.current;
    drag.current = null;
    if (!current?.moved) return;
    skipClick.current = true;
    const snapped = clampChatPosition(current.x < (window.innerWidth - 52) / 2 ? 12 : window.innerWidth - 64, current.y, window.innerWidth, window.innerHeight);
    setPosition(snapped);
    if (!cancelled) try { localStorage.setItem('bixlink-chat-position', JSON.stringify(snapped)); } catch { /* Device storage is optional. */ }
  };

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
    if (LOAN_CODE.test(text)) {
      const openProgram = cfg?.readiness?.loanEnabled !== false;
      setInput(''); setLoanCta(openProgram);
      setMsgs([...next, { role: 'assistant', content: openProgram ? LOAN_INFO : 'Program **Akun Pinjaman Leader** sedang ditutup oleh Owner. Silakan cek kembali nanti.' }]);
      return;
    }
    setMsgs([...next, { role: 'assistant', content: '' }]);
    setInput(''); setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/fox-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = '';
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: 'assistant', content: acc }]);
        end.current?.scrollIntoView({ block: 'end' });
      }
      if (!acc) setMsgs([...next, { role: 'assistant', content: 'Maaf, belum ada jawaban. Coba lagi.' }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: (e as Error).message || 'FOX AI sedang tidak tersedia.' }]);
    } finally { setBusy(false); }
  }

  return <>
    {open && <div className="fox-chat-panel fixed bottom-44 right-3 z-50 flex h-[62vh] max-h-[520px] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-primary/40 bg-card/85 shadow-2xl backdrop-blur-xl backdrop-saturate-150">
      <header className="flex items-center gap-2 border-b border-primary/20 px-3 py-2">
        <img src={fox.url} alt="FOX AI" className="h-8 w-8 rounded-full" />
        <div className="flex-1"><b className="text-sm text-primary">FOX AI Support</b><p className="text-[10px] text-muted-foreground">Bot otomatis · bukan saran keuangan</p></div>
        <Button size="icon" variant="ghost" type="button" aria-label="Tutup chat" onClick={() => setOpen(false)}><X size={18} /></Button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {msgs.map((m, i) => <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground' : 'prose prose-sm prose-invert max-w-none text-foreground'}>
          {m.role === 'user' ? m.content : <ReactMarkdown>{m.content || '…'}</ReactMarkdown>}
        </div>)}
        {loanCta && <Button type="button" className="w-full rounded-full bg-chart-3 font-black text-background" onClick={() => { setLoanCta(false); setOpen(false); navigate({ to: '/profile', search: { loan: 'open' } as never }).then(() => window.dispatchEvent(new Event('bix-loan-open'))); }}>BUKA AKUN PINJAMAN →</Button>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-primary/20 p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tulis pertanyaan…" className="form-input flex-1 text-sm" maxLength={2000} />
        <Button type="submit" size="icon" disabled={busy} aria-label="Kirim" className="h-10 w-10 shrink-0 rounded-full"><Send size={16} /></Button>
      </form>
    </div>}
    <Button type="button" size="icon" variant="outline" aria-label="FOX AI chat" title="FOX AI · geser untuk memindahkan" data-no-touch-effect
      style={position && !open ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
      onPointerDown={event => {
        if (event.button !== 0) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        skipClick.current = false;
        drag.current = { startX: event.clientX, startY: event.clientY, x: bounds.x, y: bounds.y, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current) return;
        const dx = event.clientX - current.startX, dy = event.clientY - current.startY;
        if (!current.moved && Math.hypot(dx, dy) < 6) return;
        current.moved = true;
        const next = clampChatPosition(current.x + dx, current.y + dy, window.innerWidth, window.innerHeight);
        current.x = next.x; current.y = next.y;
        current.startX = event.clientX; current.startY = event.clientY;
        setPosition(next);
      }}
      onPointerUp={() => finishDrag()}
      onPointerCancel={() => finishDrag(true)}
      onKeyDown={event => {
        const direction = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
        if (!direction) return;
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        const next = clampChatPosition(bounds.x + (direction[0] ?? 0), bounds.y + (direction[1] ?? 0), window.innerWidth, window.innerHeight);
        setPosition(next);
        try { localStorage.setItem('bixlink-chat-position', JSON.stringify(next)); } catch { /* Optional device storage. */ }
      }}
      onClick={() => { if (skipClick.current) { skipClick.current = false; return; } setOpen(o => !o); }}
      className="fox-chat-launcher fixed bottom-28 right-3 z-50 h-13 w-13 rounded-full border-primary/60 bg-card p-3 text-primary shadow-xl">
      {open ? <X size={22} /> : <MessageCircle size={22} />}
    </Button>
  </>;
}
