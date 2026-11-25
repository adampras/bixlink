import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Phone, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { startBixCall } from '@/components/BixCall';
import { chatCanSend } from '@/lib/bixgo-friendly';
import { useBixgoText } from '@/lib/useBixgoText';

type Message = { id: string; body: string; sender_id: string; created_at: string };
export function BixgoTripChat({ tripId, peerId, peerName, status, role }: { tripId: string; peerId: string; peerName: string; status: string; role: 'driver' | 'rider' }) {
  const text = useBixgoText();
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRead, setLastRead] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const pending = useRef<{ body: string; id: string } | null>(null);
  const storageKey = uid ? `bixgo-chat-read:${uid}:${tripId}` : '';
  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({ data }) => { if (live) setUid(data.user?.id ?? ''); });
    return () => { live = false; };
  }, []);
  useEffect(() => { try { setLastRead(storageKey ? localStorage.getItem(storageKey) ?? '' : ''); } catch { setLastRead(''); } }, [storageKey]);
  const load = useCallback(async () => {
    const result = await supabase.from('bixgo_trip_messages').select('id,body,sender_id,created_at').eq('trip_id', tripId).order('created_at', { ascending: false }).limit(100);
    if (result.error) { setError('Messages unavailable. Retry.'); setLoading(false); return; }
    setMessages((result.data ?? []).reverse()); setLoading(false);
  }, [tripId]);
  useEffect(() => {
    void load();
    const interval = setInterval(() => { if (!document.hidden) void load(); }, open ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [load, open]);
  useEffect(() => {
    if (!open || !storageKey) return;
    const last = messages.at(-1)?.created_at;
    if (last) { setLastRead(last); try { localStorage.setItem(storageKey, last); } catch { /* optional read marker */ } }
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, open, storageKey]);
  const unread = messages.filter(m => m.sender_id !== uid && m.created_at > lastRead).length;
  const send = async (value: string) => {
    const message = value.trim(); if (!message || busy || !chatCanSend(status)) return;
    pending.current = pending.current?.body === message ? pending.current : { body: message, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const { error: failure } = await supabase.rpc('bixgo_trip_chat_send', { p_trip: tripId, p_body: message, p_id: pending.current.id });
      if (failure) { setError(failure.message); return; }
      pending.current = null; setBody(''); await load();
    } catch { setError('Message not sent. Check connection and retry.'); }
    finally { setBusy(false); }
  };
  const quick = role === 'driver' ? ['I am on my way.', 'I have arrived at the pickup point.', 'Where should I wait?'] : ['I am waiting at the entrance.', 'Please wait a moment.', 'I am at the pickup point.'];
  return <>
    <Button variant="outline" className="h-auto min-h-11 flex-1 gap-1.5 whitespace-normal text-xs" onClick={() => setOpen(true)}><MessageCircle className="h-4 w-4"/>{text('Trip chat')}{unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-primary-foreground">{unread > 99 ? '99+' : unread}</span>}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-no-translate className="z-[950] flex h-[min(84dvh,700px)] max-h-[84dvh] w-[calc(100%-1.5rem)] flex-col gap-3 overflow-hidden bg-background p-4 text-foreground" aria-label={text('Trip chat')}>
        <div className="shrink-0 pr-7"><DialogTitle>{text('Trip chat')}</DialogTitle><DialogDescription className="mt-1 truncate">{peerName} · #{tripId.slice(0, 8).toUpperCase()}</DialogDescription></div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => startBixCall(peerId, peerName, 'voice')}><Phone/>{text('Call')}</Button>
          <Button variant="outline" size="sm" onClick={() => startBixCall(peerId, peerName, 'video')}><Video/>{text('Video call')}</Button>
        </div>
        <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-lg border border-border bg-muted/30 p-3">
          {loading ? <Loader2 className="mx-auto animate-spin text-muted-foreground"/> : !messages.length && <p className="py-4 text-center text-xs text-muted-foreground">{text('No messages yet.')}</p>}
          {messages.map(m => <div key={m.id} className={`flex ${m.sender_id === uid ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 ${m.sender_id === uid ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-card-foreground'}`}><p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.body}</p><time className="mt-1 block text-right text-[10px] opacity-75">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div></div>)}
          <div ref={bottom}/>
        </div>
        {error && <div role="alert" className="flex shrink-0 items-center justify-between gap-2 text-xs text-destructive"><span className="break-words">{text(error)}</span><Button variant="ghost" size="sm" onClick={() => { setError(''); void load(); }}>{text('Retry')}</Button></div>}
        {chatCanSend(status) ? <>
          <div className="flex shrink-0 gap-1 overflow-x-auto">{quick.map(q => <Button key={q} variant="outline" size="sm" disabled={busy} onClick={() => void send(text(q))} className="h-auto max-w-48 shrink-0 whitespace-normal text-left text-[11px]">{text(q)}</Button>)}</div>
          <form className="flex shrink-0 items-end gap-2" onSubmit={e => { e.preventDefault(); void send(body); }}><textarea aria-label={text('Message')} rows={2} maxLength={1000} value={body} onChange={e => setBody(e.target.value)} placeholder={text('Write a message…')} className="min-w-0 flex-1 resize-none rounded-lg border border-input bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-ring"/><Button type="submit" size="icon" aria-label={text('Send message')} disabled={busy || !body.trim()} className="h-11 w-11 shrink-0">{busy ? <Loader2 className="animate-spin"/> : <Send/>}</Button></form>
        </> : <p className="text-center text-xs text-muted-foreground">{text('Trip ended · chat is read-only.')}</p>}
      </DialogContent>
    </Dialog>
  </>;
}