import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import fox from '@/assets/fox-icon-180.png.asset.json';

type Msg = { role: 'user' | 'assistant'; content: string };

export function FoxChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Halo! Saya **FOX AI**, asisten otomatis BIXLINK 24/7. Ada yang bisa dibantu?' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text }];
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
        <button type="button" aria-label="Tutup chat" onClick={() => setOpen(false)}><X size={18} /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {msgs.map((m, i) => <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground' : 'prose prose-sm prose-invert max-w-none text-foreground'}>
          {m.role === 'user' ? m.content : <ReactMarkdown>{m.content || '…'}</ReactMarkdown>}
        </div>)}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-primary/20 p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tulis pertanyaan…" className="form-input flex-1 text-sm" maxLength={2000} />
        <button type="submit" disabled={busy} aria-label="Kirim" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"><Send size={16} /></button>
      </form>
    </div>}
    <button type="button" aria-label="FOX AI chat" onClick={() => setOpen((o) => !o)} className="fixed bottom-28 right-3 z-50 grid h-13 w-13 place-items-center rounded-full border border-primary/60 bg-card p-3 text-primary shadow-xl">
      {open ? <X size={22} /> : <MessageCircle size={22} />}
    </button>
  </>;
}
