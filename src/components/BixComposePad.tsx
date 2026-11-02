import { useEffect, useRef, useState } from 'react';
import { PenLine, Send, X, Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { pushNotify } from '@/lib/bix-push';

type Thread = { peer: string; name: string; online?: boolean };
type Found = { user_id: string; name: string } | null;
const DRAFT_KEY = 'bixcall-draft';
const PHRASES = ['Halo! 👋', 'Bisa telepon sekarang?', 'Sebentar ya', 'Siap 👍', 'Cek BIX PAY 🪙', 'Terima kasih 🙏'];
const EMOJI = ['😊', '😂', '🔥', '🙏', '👍', '❤️', '🚀', '🦊', '💎', '🪙'];

/** Floating quick-compose pad: write a chat message anywhere in BIXLINK, then send or continue in BIX CALL. */
export function BixComposePad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [to, setTo] = useState<{ id: string; name: string } | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null'); if (d) { setText(d.text ?? ''); setTo(d.to ?? null); } } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, to })); } catch { /* ignore */ } }, [text, to]);
  useEffect(() => {
    if (!open) return;
    void supabase.rpc('bix_chat_threads' as never).then(({ data }) => setThreads(((data as Thread[] | null) ?? []).slice(0, 8)));
    setTimeout(() => area.current?.focus(), 80);
  }, [open]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };
  const insert = (s: string) => {
    const el = area.current; if (!el) { setText(t => t + s); return; }
    const a = el.selectionStart ?? text.length, b = el.selectionEnd ?? text.length;
    const v = (text.slice(0, a) + s + text.slice(b)).slice(0, 1000); setText(v);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = a + s.length; });
    try { navigator.vibrate?.(6); } catch { /* optional */ }
  };
  const find = async () => {
    const t = q.trim(); if (t.length < 3) return;
    setBusy(true); const { data } = await supabase.rpc('bix_call_find' as never, { p_query: t } as never); setBusy(false);
    setFound((data as Found) ?? null);
  };
  const openChat = (p: { id: string; name: string }) => { window.location.href = `/call?chat=${encodeURIComponent(p.id)}&n=${encodeURIComponent(p.name)}`; };
  const send = async (thenOpen: boolean) => {
    const b = text.trim();
    if (!to) return flash('Pilih penerima dulu');
    if (!b) { if (thenOpen) openChat(to); return flash('Tulis pesan dulu'); }
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_chat_send' as never, { p_to: to.id, p_body: b } as never);
    setBusy(false);
    if (error) return flash(error.message);
    pushNotify('chat', (data as { id?: string } | null)?.id);
    setText(''); try { navigator.vibrate?.(15); } catch { /* optional */ }
    if (thenOpen) openChat(to); else flash(`Terkirim ke @${to.name} ✓`);
  };

  return <>
    {!open && <button type="button" className="bxpad-fab" aria-label="Papan mengetik BIX CALL" onClick={() => setOpen(true)}><PenLine size={19}/>{text.trim() && <i aria-hidden/>}</button>}
    {open && <div className="bxpad-bg" onClick={() => setOpen(false)}><section className="bxpad" role="dialog" aria-label="Papan mengetik BIX CALL" onClick={e => e.stopPropagation()}>
      <header><b><MessageCircle size={15}/> Papan Mengetik <em>BIX CALL</em></b><button type="button" aria-label="Tutup" onClick={() => setOpen(false)}><X size={16}/></button></header>

      <div className="bxpad-to">
        <small>Kepada</small>
        {to ? <span className="bxpad-chip is-on">@{to.name}<button type="button" aria-label="Ganti penerima" onClick={() => setTo(null)}>✕</button></span>
          : <>
            {threads.length > 0 && <div className="bxpad-chips">{threads.map(t => <button type="button" key={t.peer} className="bxpad-chip" onClick={() => setTo({ id: t.peer, name: t.name })}><i className={t.online ? 'is-online' : ''}/>@{t.name}</button>)}</div>}
            <form className="bxpad-find" onSubmit={e => { e.preventDefault(); void find(); }}><Search size={14}/><input value={q} onChange={e => { setQ(e.target.value); setFound(undefined); }} placeholder="BIX-ID, @username atau no. WA"/><button type="submit" disabled={busy}>Cari</button></form>
            {found === null && <small className="bxpad-note">Member tidak ditemukan</small>}
            {found && <button type="button" className="bxpad-chip" onClick={() => { setTo({ id: found.user_id, name: found.name }); setFound(undefined); setQ(''); }}>+ @{found.name}</button>}
          </>}
      </div>

      <div className="bxpad-board">
        <textarea ref={area} value={text} onChange={e => setText(e.target.value.slice(0, 1000))} rows={4} placeholder="Ketik pesan Anda di sini…" aria-label="Isi pesan"/>
        <span className="bxpad-count">{text.length}/1000{text && ' · draf tersimpan'}</span>
      </div>
      <div className="bxpad-emoji">{EMOJI.map(e => <button type="button" key={e} onClick={() => insert(e)}>{e}</button>)}</div>
      <div className="bxpad-phrases">{PHRASES.map(p => <button type="button" key={p} onClick={() => insert(text && !text.endsWith(' ') ? ` ${p}` : p)}>{p}</button>)}</div>
      {msg && <p className="bxpad-msg">{msg}</p>}
      <footer>
        <button type="button" onClick={() => setText('')} disabled={!text}>Hapus</button>
        <button type="button" onClick={() => void send(false)} disabled={busy}><Send size={14}/> Kirim</button>
        <button type="button" className="is-gold" onClick={() => void send(true)} disabled={busy}>Kirim & buka BIX CALL</button>
      </footer>
    </section></div>}
  </>;
}
