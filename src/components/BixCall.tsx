import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { Room, RemoteTrack } from 'livekit-client';
/** livekit-client loads only when a call connects, keeping it out of every page's startup bundle. */
let LK: typeof import('livekit-client') | null = null;
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, SwitchCamera, Volume2, MessageCircle, VolumeX, X, MonitorUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { syncBixCallTheme } from '@/lib/bix-call-theme';
import { openVoiceShield, type VoiceShield } from '@/lib/bix-voice';
import { supabase } from '@/integrations/supabase/client';
import { getBixCallToken } from '@/lib/bix-call.functions';
import foxLogo from '@/assets/bixlink-logo-gold.webp';
import { ensureBixPush, pushNotify } from '@/lib/bix-push';
import { startChosenRingtone, startRingback, playConnected, playEnded, installCallAudioUnlock, unlockCallAudio, isCallAudioReady, CALL_AUDIO_EVENT } from '@/lib/bix-tones';
import { useBixCard, useSignedUrl } from '@/components/BixAvatar';
import { INCOMING_VIBE, VIBE_EVERY_MS, pickRoute, tiltOf, type Route, type Tilt } from '@/lib/bix-call-route';

/** Large caller/callee photo inside the call ring; falls back to the gold initial. */
function CallPeerPhoto({ peerId, name }: { peerId: string; name: string }) {
  const card = useBixCard(peerId);
  const url = useSignedUrl('bix-avatars', card?.avatar_path);
  return <>{url ? <img className="bixcall-av-photo" src={url} alt={`Photo of @${name}`}/> : <b>{name.slice(0, 1).toUpperCase()}</b>}{card?.status_text && <em className="bixcall-av-status">{card.status_text}</em>}</>;
}

type Kind = 'voice' | 'video';
/** rang = callee's device acknowledged the call ("Ringing"); offline = no acknowledgement within OFFLINE_MS. */
type Active = { id: string; peerId: string; peerName: string; kind: Kind; role: 'caller' | 'callee'; status: string; whatsapp?: string | null; rang?: boolean; offline?: boolean };
/** Caller phases: "Calling" until the callee device acks, then "Ringing"; no ack after 45 s means offline. */
export const OFFLINE_MS = 45000;
export const RING_TIMEOUT_MS = 75000;
export function callerPhase(c: { rang?: boolean; offline?: boolean }): 'calling' | 'ringing' | 'offline' {
  return c.offline ? 'offline' : c.rang ? 'ringing' : 'calling';
}

/** Start a call from anywhere: dispatches to the global BixCallHost. */
export function startBixCall(peerId: string, peerName: string, kind: Kind) {
  void unlockCallAudio();
  window.dispatchEvent(new CustomEvent('bix-call', { detail: { peerId, peerName, kind } }));
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Ask once for phone notification permission (call from a user tap). */
export async function enableBixNotifications() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (window.top !== window.self) return 'open-in-new-tab';
  const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (p === 'granted' && !(await ensureBixPush())) return 'failed';
  return p;
}

/** System notification shown when BIXLINK is in the background. */
const isApk = () => !!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
/** APK: once the in-app ring screen is visible, clear the native Jawab/Tolak banner so only one menu shows. */
function clearNativeCallBanner() {
  if (!isApk() || document.hidden) return;
  void import('@capacitor/push-notifications').then(m => m.PushNotifications.removeAllDeliveredNotifications()).catch(() => {});
}
function sysNotify(title: string, body: string, tag: string, ring: boolean, url = '/call') {
  if (ring && isApk()) return; // the native banner already handles calls in the APK
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
  const opts = { body, tag, icon: foxLogo, badge: foxLogo, requireInteraction: ring, vibrate: ring ? [400, 200, 400, 200, 400] : [120], data: { url } } as NotificationOptions;
  void navigator.serviceWorker?.getRegistration().then(reg => {
    if (reg) { void reg.showNotification(title, opts); return; }
    const n = new Notification(title, opts); n.onclick = () => { window.focus(); window.location.href = url; n.close(); };
  }).catch(() => { /* ignore */ });
}

/** Global host: watches incoming calls and renders the luxury BIXLINK BIXTOK call screen. */
export function BixCallHost() {
  useEffect(() => installCallAudioUnlock(), []);
  useEffect(() => { syncBixCallTheme(); }, []);
  const [me, setMe] = useState<string | null>(null);
  const [call, setCall] = useState<Active | null>(null);
  const [err, setErr] = useState('');
  const callRef = useRef<Active | null>(null); callRef.current = call;
  const lastChat = useRef(new Date().toISOString());

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setMe(s?.user?.id ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!me) return;
    // In the APK, register this phone for closed-app ringing automatically after sign-in.
    void import('@/lib/native-device').then(async m => {
      const caps = await m.getNativeCapabilities();
      if (caps.push) { await m.enableNativePush().catch(() => {}); return; }
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') void ensureBixPush();
    }).catch(() => {});
  }, [me]);

  // Outgoing calls
  useEffect(() => {
    const on = async (e: Event) => {
      const d = (e as CustomEvent).detail as { peerId: string; peerName: string; kind: Kind };
      if (callRef.current) return;
      setErr('');
      // Show the calling screen immediately (0 ms); the server row id arrives a moment later.
      const pending: Active = { id: 'pending', peerId: d.peerId, peerName: d.peerName, kind: d.kind, role: 'caller', status: 'ringing' };
      callRef.current = pending; setCall(pending);
      const { data, error } = await supabase.rpc('bix_call_start' as never, { p_callee: d.peerId, p_kind: d.kind } as never);
      if (error) { callRef.current = null; setCall(null); setErr(error.message); setTimeout(() => setErr(''), 4000); return; }
      const id = data as unknown as string;
      if (callRef.current?.id !== 'pending') { void supabase.rpc('bix_call_set' as never, { p_id: id, p_status: 'ended' } as never); return; } // cancelled before the server answered
      pushNotify('call', id);
      setCall(c => c ? { ...c, id } : c);
      void supabase.rpc('bix_call_peer' as never, { p_user: d.peerId } as never).then(peer => setCall(c => c && c.id === id ? { ...c, whatsapp: (peer.data as { whatsapp?: string } | null)?.whatsapp ?? null } : c));
    };
    const sim = () => { if (!callRef.current) setCall({ id: 'sim', peerId: 'sim', peerName: 'Uji BIX CALL', kind: 'voice', role: 'callee', status: 'ringing', rang: true }); };
    window.addEventListener('bix-call', on); window.addEventListener('bix-call-sim', sim);
    return () => { window.removeEventListener('bix-call', on); window.removeEventListener('bix-call-sim', sim); };
  }, []);

  // Poll incoming + status of active call
  useEffect(() => {
    if (!me) return;
    let stop = false; let n = 0;
    const tick = async () => {
      const cur = callRef.current;
      // Mark incoming chat as reached this device (double tick) whenever the app is open.
      if (n++ % 4 === 0) void supabase.rpc('bix_chat_delivered' as never);
      if (cur?.id === 'sim' || cur?.id === 'pending') { /* local or not yet created */ } else if (cur) {
        const { data } = await supabase.from('bix_calls' as never).select('status, rang_at').eq('id', cur.id).maybeSingle();
        const row = data as { status?: string; rang_at?: string | null } | null;
        const st = row?.status; const rang = !!row?.rang_at;
        if (!stop && ((st && st !== cur.status) || (rang && !cur.rang))) {
          if (rang && !cur.rang && cur.role === 'caller') { try { navigator.vibrate?.(25); } catch { /* optional */ } }
          setCall(c => c && c.id === cur.id ? { ...c, status: c.offline ? c.status : (st ?? c.status), rang: c.rang || rang } : c);
        }
      } else {
        const since = new Date(Date.now() - 80000).toISOString();
        const { data } = await supabase.from('bix_calls' as never).select('id, caller_id, kind, status').eq('callee_id', me).eq('status', 'ringing').gte('created_at', since).order('created_at', { ascending: false }).limit(1);
        const row = (data as { id: string; caller_id: string; kind: Kind }[] | null)?.[0];
        if (row && !stop) {
          // Acknowledge: caller switches from "Calling" to "Ringing".
          void supabase.rpc('bix_call_ring' as never, { p_id: row.id } as never);
          const peer = await supabase.rpc('bix_call_peer' as never, { p_user: row.caller_id } as never);
          const p = peer.data as { name?: string; whatsapp?: string } | null;
          setCall({ id: row.id, peerId: row.caller_id, peerName: p?.name ?? 'Member', kind: row.kind, role: 'callee', status: 'ringing', whatsapp: p?.whatsapp ?? null, rang: true });
          try { navigator.vibrate?.([300, 200, 300]); } catch { /* unsupported */ }
          clearNativeCallBanner();
          // Native lock-screen call banner (Jawab/Tolak) opens /call?bixcall=answer|decline&id=…
          const q = new URLSearchParams(window.location.search);
          if (q.get('id') === row.id && (q.get('bixcall') === 'answer' || q.get('bixcall') === 'decline')) {
            const act = q.get('bixcall'); window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => void setStatus(act === 'answer' ? 'accepted' : 'declined'), 300);
          }
          sysNotify(`📞 BIXCALL · Incoming ${row.kind === 'video' ? 'Video call' : 'Voice call'}`, `@${p?.name ?? 'Member'} is calling you`, `call-${row.id}`, true);
        }
      }
      // Chat alerts while the app is in the background
      if (document.hidden) {
        const { data: msgs } = await supabase.from('bix_messages' as never).select('id, sender_id, body, created_at').eq('recipient_id', me).is('read_at', null).gt('created_at', lastChat.current).order('created_at', { ascending: true }).limit(5);
        for (const m of (msgs as { id: string; sender_id: string; body: string; created_at: string }[] | null) ?? []) {
          lastChat.current = m.created_at;
          const peer = await supabase.rpc('bix_call_peer' as never, { p_user: m.sender_id } as never);
          sysNotify(`💬 BIX COMM · @${(peer.data as { name?: string } | null)?.name ?? 'Member'}`, (m.body ?? '').slice(0, 120), `chat-${m.sender_id}`, false, `/call?chat=${m.sender_id}`);
        }
      } else lastChat.current = new Date().toISOString();
    };
    const t = setInterval(() => void tick(), 2500);
    void tick();
    return () => { stop = true; clearInterval(t); };
  }, [me]);

  // Caller: no device ack after 45 s → offline screen; ringing but unanswered after 75 s → end.
  useEffect(() => {
    if (!call || call.role !== 'caller' || call.status !== 'ringing' || call.offline) return;
    const t = call.rang
      ? setTimeout(() => void setStatus('ended'), RING_TIMEOUT_MS)
      : setTimeout(() => { setCall(c => c ? { ...c, offline: true } : c); void setStatus('ended'); }, OFFLINE_MS);
    return () => clearTimeout(t);
  }, [call?.id, call?.status, call?.rang, call?.offline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close finished calls (the offline screen stays until the caller closes it)
  useEffect(() => {
    if (!call || call.offline || !['ended', 'declined', 'missed'].includes(call.status)) return;
    const t = setTimeout(() => { setCall(null); if (!window.location.pathname.startsWith('/call')) window.location.assign('/call'); }, 2200);
    return () => clearTimeout(t);
  }, [call?.status, call?.offline]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (s: 'accepted' | 'declined' | 'ended') => {
    const cur = callRef.current; if (!cur) return;
    if (cur.id === 'pending') { callRef.current = null; setCall(null); return; }
    if (cur.id === 'sim') { setCall(c => c ? { ...c, status: s === 'accepted' ? 'ended' : s } : c); return; }
    const { data } = await supabase.rpc('bix_call_set' as never, { p_id: cur.id, p_status: s } as never);
    setCall(c => c ? { ...c, status: (data as unknown as string) || s } : c);
  };

  return <>
    {err && <div className="bixcall-toast" role="alert">{err}</div>}
    {call && typeof document !== 'undefined' && createPortal(<CallScreen call={call} onAccept={() => void setStatus('accepted')} onDecline={() => void setStatus('declined')} onEnd={() => void setStatus('ended')} onClose={() => setCall(null)}/>, document.body)}
  </>;
}

function CallScreen({ call, onAccept, onDecline, onEnd, onClose }: { call: Active; onAccept: () => void; onDecline: () => void; onEnd: () => void; onClose: () => void }) {
  const router = useRouter();
  const remoteV = useRef<HTMLVideoElement>(null);
  const backV = useRef<HTMLVideoElement>(null);
  const localV = useRef<HTMLVideoElement>(null);
  const audioBox = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(call.kind === 'video');
  const [secs, setSecs] = useState(0);
  const [link, setLink] = useState<'idle' | 'connecting' | 'on' | 'fail'>('idle');
  const [front, setFront] = useState(true);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [pip, setPip] = useState({ x: 0, y: 0 });
  const [fill, setFill] = useState(true);
  const [swapped, setSwapped] = useState(false);
  const [hideUi, setHideUi] = useState(false);
  const live = call.status === 'accepted';
  const done = ['ended', 'declined', 'missed'].includes(call.status);
  const [ringMuted, setRingMuted] = useState(false);
  const voiceRef = useRef<VoiceShield | null>(null);
  const shieldRef = useRef(true);
  const ringing = !live && !done;
  const phase = callerPhase(call);
  const [quality, setQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [level, setLevel] = useState(0);
  const ear = false;
  const nearRef = useRef(false);
  const [howl, setHowl] = useState(false);
  const howlRef = useRef(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const quickReply = async (text: string) => {
    setReplyOpen(false);
    await supabase.rpc('bix_chat_send' as never, { p_to: call.peerId, p_body: text, p_reply: null } as never);
    onDecline();
  };
  const [micLow, setMicLow] = useState(false);
  const micLowRef = useRef(false);
  const micRef = useRef(true); micRef.current = mic;
  const [myLevel, setMyLevel] = useState(0);
  const [studio, setStudio] = useState(false);
  const [split, setSplit] = useState(false);
  const [vh, setVh] = useState(0);
  const [loud, setLoud] = useState(false);
  const loudRef = useRef(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [tonesBlocked, setTonesBlocked] = useState(false);
  useEffect(() => {
    setTonesBlocked(!isCallAudioReady());
    const changed = (e: Event) => setTonesBlocked(!(e as CustomEvent<boolean>).detail);
    window.addEventListener(CALL_AUDIO_EVENT, changed);
    return () => window.removeEventListener(CALL_AUDIO_EVENT, changed);
  }, []);
  /** Remote volume: earpiece mode is softer; loudspeaker is full; lowered while a howl is detected. */
  const applyVolume = () => {
    // Full volume in every mode (video calls run on the loudspeaker and need the most headroom).
    // Echo-safe levels: earpiece softer, loudspeaker below max so the phone's echo canceller can keep up; lower further on howl.
    const base = 1;
    audioBox.current?.querySelectorAll('audio').forEach(a => { a.muted = false; a.volume = howlRef.current ? base * 0.4 : base; });
  };
  const syncAudioPlayback = () => {
    const tracks = Array.from(audioBox.current?.querySelectorAll('audio') ?? []);
    const blockedTrack = tracks.some(a => a.paused || a.error !== null);
    setAudioBlocked(blockedTrack || roomRef.current?.canPlaybackAudio === false);
  };
  const attachAudio = (t: RemoteTrack) => {
    const box = audioBox.current; if (!box) return;
    box.querySelectorAll(`audio[data-sid="${t.sid}"]`).forEach(a => a.remove());
    const el = t.attach() as HTMLAudioElement; el.dataset['sid'] = t.sid ?? ''; el.autoplay = true; el.setAttribute('playsinline', '');
    box.appendChild(el); applyVolume();
    void el.play().then(syncAudioPlayback).catch(() => setAudioBlocked(true));
  };
  const unlockAudio = () => {
    void unlockCallAudio();
    const room = roomRef.current;
    const plays = Array.from(audioBox.current?.querySelectorAll('audio') ?? []).map(a => a.play());
    if (room) plays.push(room.startAudio());
    if (plays.length) void Promise.allSettled(plays).then(syncAudioPlayback);
  };
  // One-way-audio watchdog: every 2 s make sure each remote voice track has a playing element.
  useEffect(() => {
    if (link !== 'on') return;
    const heal = () => {
      const r = roomRef.current, box = audioBox.current; if (!r || !box) return;
      r.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => {
        const tr = pub.track as RemoteTrack | undefined; if (!tr || !LK || tr.kind !== LK.Track.Kind.Audio) return;
        const el = box.querySelector(`audio[data-sid="${tr.sid}"]`) as HTMLAudioElement | null;
        if (!el || !el.srcObject) attachAudio(tr); else if (el.paused) void el.play().then(syncAudioPlayback).catch(() => setAudioBlocked(true));
      }));
    };
    const vis = () => { if (!document.hidden) { void roomRef.current?.startAudio().catch(() => {}); heal(); } };
    const t = setInterval(heal, 2000); document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [link]); // eslint-disable-line react-hooks/exhaustive-deps
  // Remote voice level: drives the waveform and the "Ruang Dekat" half-duplex duck.
  useEffect(() => {
    if (link !== 'on') return;
    let hang = 0, both = 0, quiet = 0;
    const t = setInterval(() => {
      const r = roomRef.current; if (!r) return;
      let m = 0; r.remoteParticipants.forEach(p => { m = Math.max(m, p.audioLevel ?? 0); });
      if (!ear) setLevel(m);
      if (m > 0.04) hang = 4; else if (hang > 0) hang--;
      voiceRef.current?.setDuck(nearRef.current && hang > 0);
      // Anti-feedback: when both sides are loud at once (phones close together loop each other), duck playback.
      const me = r.localParticipant.audioLevel ?? 0;
      // Only very loud, sustained overlap (~1.5 s) counts as a loop, so normal two-way talk is never muted.
      // Loop detector: loud overlap for ~0.6 s = phones feeding each other; hold the duck ~2 s after it stops.
      // Two-way talk must stay audible even with phones side by side: only a strong, sustained loop (~1.2 s) ducks, and only partially.
      if (me > 0.25 && m > 0.25) both = Math.min(20, both + 1); else both = Math.max(0, both - 2);
      if (both >= 8) quiet = 10; else if (quiet > 0) quiet--;
      const h = quiet > 0;
      const base = 1;
      const vol = h ? base * 0.55 : base;
      if (h !== howlRef.current) { howlRef.current = h; setHowl(h); }
      if (micLowRef.current) { micLowRef.current = false; setMicLow(false); }
      setMyLevel(me);
      audioBox.current?.querySelectorAll('audio').forEach(a => { if (Math.abs(a.volume - vol) > 0.02) a.volume = vol; });
    }, 150);
    return () => clearInterval(t);
  }, [link, ear]);
  // APK: one ring source only — while the app is visible the in-app screen owns the call, so the native banner/ring is cleared
  // (it can arrive after the screen opens); when the app goes to the background, the native banner keeps ringing alone.
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => { const v = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', v); return () => document.removeEventListener('visibilitychange', v); }, []);
  useEffect(() => {
    if (!ringing || call.role !== 'callee' || !visible) return;
    clearNativeCallBanner(); const t = setInterval(clearNativeCallBanner, 1500);
    return () => clearInterval(t);
  }, [ringing, call.role, visible]);
  // Callee rings at once; caller hears the tuut-tuut ringback while Calling/Ringing.
  // One continuous tone loop: Calling → Ringing must not restart it (that caused overlapping tuuts).
  const toneOn = ringing && !ringMuted && !(call.role === 'caller' && phase === 'offline') && !(isApk() && call.role === 'callee' && !visible);
  useEffect(() => {
    if (!toneOn) return;
    const stop = call.role === 'callee' ? startChosenRingtone() : startRingback();
    return () => { stop(); };
  }, [toneOn, call.role]);
  // Incoming call vibration: keeps buzzing in a WA-style rhythm until answered/declined, even if the ringtone is muted.
  useEffect(() => {
    if (!ringing || call.role !== 'callee') return;
    const buzz = () => { try { navigator.vibrate?.(INCOMING_VIBE); } catch { /* unsupported */ } };
    buzz(); const t = setInterval(buzz, VIBE_EVERY_MS);
    return () => { clearInterval(t); try { navigator.vibrate?.(0); } catch { /* unsupported */ } };
  }, [ringing, call.role]);
  useEffect(() => { if (link === 'on') { playConnected(); try { navigator.vibrate?.(60); } catch { /* unsupported */ } } }, [link]);
  useEffect(() => { if (done && !call.offline) playEnded(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join room when accepted (caller joins as soon as callee accepts)
  useEffect(() => {
    if (!live) return;
    let room: Room | null = null; let cancelled = false;
    setLink('connecting');
    (async () => {
      try {
        const res = await getBixCallToken({ data: { callId: call.id } });
        if (!res.ok || cancelled) { setLink('fail'); return; }
        LK ??= await import('livekit-client'); if (cancelled) return;
        room = new LK.Room({ adaptiveStream: false, dynacast: true, webAudioMix: false, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, publishDefaults: { dtx: false, red: true, stopMicTrackOnMute: false } } as never);
        roomRef.current = room;
        room.on(LK!.RoomEvent.TrackSubscribed, (t: RemoteTrack) => {
          if (t.kind === LK!.Track.Kind.Video && remoteV.current) { t.attach(remoteV.current); setRemoteVideo(true); }
          if (t.kind === LK!.Track.Kind.Audio) attachAudio(t);
        });
        room.on(LK.RoomEvent.AudioPlaybackStatusChanged, syncAudioPlayback);
        // Remote camera on/off mid-call (voice → video upgrade without redialing).
        room.on(LK!.RoomEvent.TrackMuted, (pub, p) => { if (!p.isLocal && pub.kind === LK!.Track.Kind.Video) setRemoteVideo(false); });
        room.on(LK!.RoomEvent.TrackUnmuted, (pub, p) => { if (!p.isLocal && pub.kind === LK!.Track.Kind.Video) setRemoteVideo(true); });
        room.on(LK!.RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => { t.detach().forEach(e => { if (e.tagName === 'AUDIO') e.remove(); }); if (t.kind === LK!.Track.Kind.Video) setRemoteVideo(false); });
        room.on(LK!.RoomEvent.ParticipantDisconnected, () => onEnd());
        // After a network hiccup, re-bind every remote track so neither side goes silent/black.
        room.on(LK!.RoomEvent.Reconnected, () => { void room?.startAudio().catch(() => {}); room?.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => { const tr = pub.track as RemoteTrack | undefined; if (!tr) return; if (tr.kind === LK!.Track.Kind.Audio) attachAudio(tr); else if (remoteV.current) tr.attach(remoteV.current); })); });
        room.on(LK!.RoomEvent.ConnectionQualityChanged, (q, p) => { if (p.isLocal) setQuality(String(q) as 'excellent' | 'good' | 'poor' | 'unknown'); });
        await room.connect(res.url, res.token);
        void room.startAudio().catch(() => {});
        room.remoteParticipants.forEach(p => p.trackPublications.forEach(pub => { if (pub.track && pub.kind === LK!.Track.Kind.Audio) attachAudio(pub.track as RemoteTrack); }));
        // Voice Shield: band filter + feedback notch + limiter + noise gate; falls back to the plain mic.
        // Native mic track: keeps the phone's hardware echo canceller linked to the call output (a WebAudio-processed track breaks it → echo/howl).
        if (cancelled) return;
        // Mic publish with graceful fallback: some Android WebViews reject advanced constraints, which left one side silent.
        // autoGainControl on lets a whisper at the earpiece still reach the other phone clearly.
        const pubOpts = { dtx: false, red: true, forceStereo: false, audioPreset: { maxBitrate: 64000, priority: 'high' } } as never;
        try { await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, voiceIsolation: true } as never, pubOpts); }
        catch { try { await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true } as never, pubOpts); } catch { await room.localParticipant.setMicrophoneEnabled(true).catch(() => setMicLow(true)); } }
        // Lock the phone's own echo canceller / noise suppressor / high-pass on (Chrome flags), so loudspeaker video calls stay echo-free.
        { const mt = room.localParticipant.getTrackPublication(LK!.Track.Source.Microphone)?.track?.mediaStreamTrack;
          if (mt && 'contentHint' in mt) mt.contentHint = 'speech';
          // Background filter: ask the OS for voice isolation + strong noise suppression (ignored where unsupported).
          }
        if (call.kind === 'video') await startCam(room, true);
        if (!cancelled) setLink('on');
      } catch { if (!cancelled) setLink('fail'); }
    })();
    return () => {
      cancelled = true;
      room?.localParticipant.trackPublications.forEach(p => p.track?.mediaStreamTrack?.stop());
      void room?.disconnect(true); roomRef.current = null; voiceRef.current?.stop(); voiceRef.current = null;
    };
  }, [live, call.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!live) return; const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, [live]);
  // Auto-hide controls during video after 5 s of no touch; any tap brings them back.
  useEffect(() => {
    if (!(live && remoteVideo) || hideUi) return;
    const t = setTimeout(() => setHideUi(true), 5000);
    return () => clearTimeout(t);
  }, [live, remoteVideo, hideUi, cam, split, studio]);
  // Real received resolution for the HD badge.
  useEffect(() => {
    if (!remoteVideo) { setVh(0); return; }
    const t = setInterval(() => setVh(remoteV.current?.videoHeight ?? 0), 2000);
    return () => clearInterval(t);
  }, [remoteVideo]);

  const toggleMic = async () => {
    const n = !mic; setMic(n);
    if (!roomRef.current || !LK) return;
    const pub = roomRef.current.localParticipant.getTrackPublication(LK.Track.Source.Microphone);
    if (voiceRef.current && pub?.track) { if (n) await pub.track.unmute(); else await pub.track.mute(); return; }
    await roomRef.current?.localParticipant.setMicrophoneEnabled(n);
  };
  /** Turn the camera on/off inside the same room — a voice call becomes a video call without hanging up. */
  const startCam = async (room: Room, on: boolean, facing: 'user' | 'environment' = 'user') => {
    const lp = room.localParticipant;
    // Data/battery saver: low-power devices, Save-Data or cellular links get a 480p/24fps profile.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; type?: string; effectiveType?: string } }).connection;
    const saver = document.documentElement.dataset['lowPower'] === '1' || !!conn?.saveData || conn?.type === 'cellular' || /2g|3g/.test(conn?.effectiveType ?? '');
    const res = saver ? { width: 854, height: 480, frameRate: 24, aspectRatio: 16 / 9 } : { width: 1280, height: 720, frameRate: 30, aspectRatio: 16 / 9 };
    if (!on) {
      // Fully release the camera so the phone's camera indicator turns off at once.
      const pub = lp.getTrackPublication(LK!.Track.Source.Camera);
      if (pub?.track) { const t = pub.track; await lp.unpublishTrack(t, true).catch(() => {}); t.mediaStreamTrack?.stop(); }
      if (localV.current) localV.current.srcObject = null;
      setCam(false); return;
    }
    await lp.setCameraEnabled(on, { facingMode: facing, resolution: res },
      // WA-style: hardware H.264, ~1.3 Mbps cap and 3 simulcast layers so weak signal steps down instead of freezing.
      { videoCodec: 'h264', simulcast: true, degradationPreference: 'balanced', videoEncoding: { maxBitrate: saver ? 700_000 : 1_300_000, maxFramerate: res.frameRate, priority: 'high' } as never,
        videoSimulcastLayers: [
          { width: 320, height: 180, resolution: { width: 320, height: 180, frameRate: 20 }, encoding: { maxBitrate: 180_000, maxFramerate: 20 } },
          { width: 640, height: 360, resolution: { width: 640, height: 360, frameRate: 24 }, encoding: { maxBitrate: 600_000, maxFramerate: 24 } },
        ] as never });
    // 'motion' keeps frames smooth and low-latency instead of stalling to hold detail.
    const mt = lp.getTrackPublication(LK!.Track.Source.Camera)?.track?.mediaStreamTrack; if (on && mt && 'contentHint' in mt) mt.contentHint = 'motion';
    setCam(on);
  };
  const toggleCam = async () => {
    // Voice calls never touch the camera, so the browser camera indicator never appears.
    const r = roomRef.current; if (!r) return;
    try { await startCam(r, !cam, front ? 'user' : 'environment'); } catch { setCam(false); }
  };
  // (Re)attach the local camera whenever its preview element appears or moves (pip ⇄ big).
  useEffect(() => {
    const t = roomRef.current?.localParticipant.getTrackPublication(LK!.Track.Source.Camera)?.track;
    if (cam && t && localV.current) t.attach(localV.current);
  }, [cam, swapped, remoteVideo, link]);
  const flip = async () => {
    const pub = roomRef.current?.localParticipant.getTrackPublication(LK!.Track.Source.Camera);
    const tr = pub?.track as unknown as { restartTrack?: (o: object) => Promise<void> } | undefined;
    const nf = !front; setFront(nf);
    await tr?.restartTrack?.({ facingMode: nf ? 'user' : 'environment', resolution: { width: 1280, height: 720, frameRate: 30 } }).catch(() => {}); try { const m2 = (tr as unknown as { mediaStreamTrack?: MediaStreamTrack })?.mediaStreamTrack; if (m2) m2.contentHint = 'motion'; } catch { /* optional */ } void Promise.resolve().catch(() => {});
  };
  // Screen share: shows PDFs, gallery photos or any app to the other side. Needs browser support (Android WebView/APK usually lacks it).
  const [screen, setScreen] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  const toggleScreen = async () => {
    const r = roomRef.current; if (!r) return;
    try { await r.localParticipant.setScreenShareEnabled(!screen, { audio: false, resolution: { width: 1920, height: 1080, frameRate: 15 } } as never); setScreen(!screen); }
    catch { setScreen(false); }
  };
  const manualAt = useRef(0);
  const speaker = () => { manualAt.current = Date.now(); void route(!loud); };
  const route = async (n: boolean) => {
    if (n === loudRef.current) return;
    setLoud(n); loudRef.current = n;
    void roomRef.current?.startAudio().catch(() => {});
    // Keep the default output device: switching sinkId detaches the playback from the phone's echo canceller reference (→ echo).
    audioBox.current?.querySelectorAll('audio').forEach(a => { void a.play().catch(() => {}); });
    applyVolume();
  };
  // Auto loudspeaker: video on → speaker; voice call follows the phone (laid flat = speaker, at the ear = earpiece).
  // A manual tap on the speaker button wins for 10 s.
  const tiltRef = useRef<Tilt>('between'); void tiltOf;
  const anyVideo = cam || remoteVideo;
  useEffect(() => {
    if (link !== 'on') return;
    const decide = () => {
      if (Date.now() - manualAt.current < 10000) return;
      const next: Route = pickRoute({ video: anyVideo, tilt: tiltRef.current, current: loudRef.current ? 'speaker' : 'ear' });
      void route(next === 'speaker');
    };
    decide();
    // Speaker follows video on/off only; tilt switching removed so audio stays stable (manual tap wins).
  }, [link, anyVideo]); // eslint-disable-line react-hooks/exhaustive-deps
  const askTilt = () => {
    const D = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    void D?.requestPermission?.().catch(() => {});
  };
  const [mini, setMini] = useState(false);
  useEffect(() => { const c = document.documentElement.classList; if (mini) c.add('bc-incall-mini'); else c.remove('bc-incall-mini'); return () => c.remove('bc-incall-mini'); }, [mini]);
  // During a live call the chat opens behind a minimised call — the room stays connected.
  const openChat = () => { if (live) setMini(true); else onClose(); void router.navigate({ to: '/call', search: { chat: call.peerId } as never }); };

  const dragPip = (e: React.PointerEvent) => {
    const sx = e.clientX - pip.x, sy = e.clientY - pip.y, ox = e.clientX, oy = e.clientY; let moved = false;
    const move = (m: PointerEvent) => { if (Math.abs(m.clientX - ox) + Math.abs(m.clientY - oy) > 8) moved = true; if (moved) setPip({ x: m.clientX - sx, y: m.clientY - sy }); };
    const up = (u: PointerEvent) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      if (moved) {
        // Magnetic snap to the nearest corner (pip rests top-right at 0,0).
        const W = window.innerWidth, H = window.innerHeight;
        const left = u.clientX < W / 2, bottom = u.clientY > H / 2;
        setPip({ x: left ? -(W - 96 - 28) : 0, y: bottom ? Math.max(0, H - 150 - 80 - 220) : 0 });
        try { navigator.vibrate?.(8); } catch { /* unsupported */ }
      }
      if (!moved) { setSwapped(v => !v); try { navigator.vibrate?.(12); } catch { /* unsupported */ } } };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const statusText = call.offline ? 'Member is offline'
    : done ? (call.status === 'declined' ? 'Call declined' : call.status === 'missed' ? 'Missed' : 'Call ended')
    : live ? (link === 'on' ? fmt(secs) : link === 'fail' ? 'Gagal tersambung' : 'Menyambungkan…')
    : call.role === 'caller' ? (phase === 'ringing' ? 'Ringing…' : 'Calling…') : call.kind === 'video' ? 'Incoming video call' : 'Incoming voice call';
  const dot = link === 'on' ? 'ok' : call.offline ? 'off' : ringing && call.role === 'caller' ? (phase === 'ringing' ? 'ring' : 'calling') : ringing ? 'ring' : '';
  const wa = call.whatsapp?.replace(/[^0-9]/g, '');

  const showVideo = live && remoteVideo;
  const sw = swapped && showVideo && cam && !split;
  const isSplit = split && showVideo && cam;
  return <>{mini && <button type="button" className="bc-incall-bar" onClick={() => setMini(false)} aria-label="Kembali ke panggilan"><i/><Phone size={14}/><span>Panggilan aktif · @{call.peerName}</span><b>{fmt(secs)}</b><em>Ketuk untuk kembali</em></button>}<div className={`bixcall${showVideo ? ' is-video' : ''}${showVideo && hideUi ? ' is-hidden' : ''}${isSplit ? ' is-split' : ''}${studio ? ' is-studio' : ''}`} style={{ ['--me' as string]: Math.min(1, myLevel * 4), ['--lvl' as string]: Math.min(1, level * 3), ...(mini ? { transform: 'translateY(120%)', pointerEvents: 'none', opacity: 0 } : {}) }} role="dialog" aria-label="BIX CALL" onPointerDownCapture={() => { if (live) unlockAudio(); }}>
    <video ref={backV} className={`bixcall-back${showVideo && !fill ? " on" : ""}`} autoPlay playsInline poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" muted aria-hidden="true"/>
    <video ref={remoteV} className={sw ? 'bixcall-pip is-peer' : `bixcall-remote${showVideo ? ' on' : ''}${fill ? '' : ' fit'}`} style={sw ? { transform: `translate(${pip.x}px, ${pip.y}px)` } : undefined} onPointerDown={sw ? dragPip : undefined} autoPlay playsInline poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" onClick={() => { if (showVideo && !sw) setHideUi(v => !v); }} onDoubleClick={() => { if (!sw) setFill(v => !v); }}/>
    <div ref={audioBox} aria-hidden="true" style={{ position: 'fixed', width: 1, height: 1, left: 0, bottom: 0, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}/>
    {audioBlocked && live && <Button type="button" variant="wallet" size="wallet" className="bc-pill is-chat absolute top-18 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-32px)] whitespace-normal" onClick={unlockAudio}><Volume2 size={16}/> Ketuk untuk aktifkan suara</Button>}
    {live && link === 'on' && remoteVideo && !cam && <button type="button" className="bc-pill is-chat bc-vid-invite" onClick={() => void toggleCam()}><Video size={16}/> @{call.peerName} menyalakan video · Nyalakan video saya</button>}
    {toneOn && tonesBlocked && <button type="button" className="bc-tone-chip" onClick={() => void unlockCallAudio()}><Volume2 size={13}/> Ketuk untuk bunyikan {call.role === 'callee' ? 'dering' : 'nada'}</button>}
    <header className="bixcall-head">
      <img src={foxLogo} alt="" className="bixcall-fox"/>
      <span>{live && link === 'on' ? `SOVEREIGN ENCRYPTED • 48 kHz ${anyVideo ? 'HD VIDEO' : 'HD VOICE'}` : 'BIX CALL • SOVEREIGN ENCRYPTED'}</span>
      {live && link === 'on' && <em className={`bc-q is-${quality}`} aria-label={`Kualitas jaringan: ${quality === 'excellent' ? 'sangat baik' : quality === 'good' ? 'baik' : quality === 'poor' ? 'lemah' : 'mengukur'}`}><i/><i/><i/></em>}
    </header>
    {!showVideo && <div className="bc-wa-top"><b>@{call.peerName}</b><small>{statusText}</small></div>}
    {!showVideo && <div className="bixcall-center">
      <div className={`bixcall-av${ringing && call.role === 'callee' ? ' is-buzz' : ''} is-${call.offline ? 'offline' : live && link === 'on' ? 'talking' : ringing ? (call.role === 'caller' ? phase : 'ringing') : 'idle'}`} style={live && link === 'on' ? { ['--lvl' as string]: Math.min(1, level * 3) } : undefined}>
        <span className="bixcall-av-ring" aria-hidden="true"/><span className="bixcall-av-ring r2" aria-hidden="true"/>
        <CallPeerPhoto peerId={call.peerId} name={call.peerName}/>
      </div>
      <h2>@{call.peerName}</h2>
      <p>{(live ? anyVideo : call.kind === 'video') ? 'Video Call' : 'Voice Call'} · BIX CALL{live && link === 'on' ? ` · ${loud ? 'Loudspeaker' : 'Speaker telinga'}` : ''}</p>
      {live && link === 'on' && <div className="bc-wave" aria-hidden="true">{[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55].map((k, i) => <i key={i} style={{ transform: `scaleY(${0.12 + Math.min(1, level * 3) * k})` }}/>)}</div>}
      {call.offline && <div className="bc-offline" role="status"><b>Member is not active on BIXLINK yet</b><small>Call could not reach their device. Send a message so they can read it when they are back online.</small></div>}
    </div>}
    <div className="bixcall-status"><i className={dot}/>{statusText}</div>
    {howl && live && <div className="bc-howl" role="status">Echo is automatically reduced</div>}
    {cam && live && <video ref={localV} className={sw ? 'bixcall-remote on bixcall-self-big' : isSplit ? 'bixcall-split-self' : 'bixcall-pip bc-self-glow'} style={sw || isSplit ? { transform: `scaleX(${front ? -1 : 1})` } : { transform: `translate(${pip.x}px, ${pip.y}px) scaleX(${front ? -1 : 1})`, transition: 'transform .16s ease-out' }} onPointerDown={sw || isSplit ? undefined : dragPip} onClick={() => { if (sw) setHideUi(v => !v); }} autoPlay playsInline poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" muted/>}
    <footer className={`bixcall-ctl${call.offline ? ' is-offline' : ''}`}>
      {!live && !done && call.role === 'callee' && replyOpen && <div className="bc-replies">{['Sorry, I am busy right now. I will call you back.', 'In a meeting, please message me instead.', 'I will call back in 5 minutes.'].map(t => <button type="button" key={t} onClick={() => void quickReply(t)}>{t}</button>)}</div>}
      {!live && !done && call.role === 'callee' && <button type="button" className="bc-reply-btn" onClick={() => setReplyOpen(v => !v)}><MessageCircle size={14}/> Tolak dengan pesan</button>}
      {!live && !done && call.role === 'callee' && <div className="bc-swipe-row">
        <button type="button" className="bc-tap is-end" aria-label="Tolak panggilan" onClick={onDecline}><i><PhoneOff/></i><small>TOLAK</small></button>
        <button type="button" className="bc-tap is-accept" aria-label="Angkat panggilan" onClick={() => { unlockAudio(); onAccept(); }}>{call.kind === 'video' ? <i><Video/></i> : <i><Phone/></i>}<small>ANGKAT</small></button>
      </div>}
      {!live && !done && call.role === 'callee' && <p className="bc-swipe-hint">{call.id === 'sim' ? 'Simulasi uji · ketuk Angkat atau Tolak' : 'Ketuk sekali untuk angkat atau tolak'}</p>}
      {!live && !done && call.role === 'caller' && <>
        {wa && <a className="wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="Hubungi via WhatsApp"><MessageCircle/></a>}
        {!call.offline && <button type="button" onClick={onEnd} aria-label="Batalkan panggilan" style={{ margin: '18px auto 0', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 34px', borderRadius: 999, background: 'hsl(0 78% 50%)', color: 'hsl(0 0% 100%)', fontWeight: 800, fontSize: 17, letterSpacing: 1, boxShadow: '0 10px 30px hsl(0 78% 40% / .45)' }}><PhoneOff size={22}/> BATALKAN</button>}
      </>}
      {live && <div className="bc-ctl4 bc-grid6" onPointerDown={askTilt}>
        <label><button aria-label={loud ? 'Speaker active' : 'Nyalakan loudspeaker'} aria-pressed={loud} className={loud ? 'shield' : ''} onClick={speaker}>{loud ? <Volume2/> : <VolumeX/>}</button><span>{loud ? 'Speaker On' : 'Speaker Off'}</span></label>
        <label><button aria-label={cam ? 'Matikan video' : 'Nyalakan video'} aria-pressed={cam} className={cam ? 'shield' : ''} onClick={() => void toggleCam()}>{cam ? <Video/> : <VideoOff/>}</button><span>Video</span></label>
        <label><button aria-label={mic ? 'Senyapkan' : 'Nyalakan mikrofon'} className={mic ? '' : 'off'} onClick={() => void toggleMic()}>{mic ? <Mic/> : <MicOff/>}</button><span>Senyapkan</span></label>
        <label><button aria-label="Chat" onClick={openChat}><MessageCircle/></button><span>Chat</span></label>
        <label><button aria-label="Balik kamera" disabled={!cam} className={cam ? '' : 'dim'} onClick={() => void flip()}><SwitchCamera/></button><span>Balik</span></label>
        {live && link === 'on' && canShare && <label><button aria-label={screen ? 'Hentikan berbagi layar' : 'Bagikan layar'} aria-pressed={screen} className={screen ? 'shield' : ''} onClick={() => void toggleScreen()}><MonitorUp/></button><span>{screen ? 'Stop Layar' : 'Bagi Layar'}</span></label>}
        <label><button className="end" aria-label="Akhiri" onClick={onEnd}><PhoneOff/></button><span>Akhiri</span></label>
      </div>}
      {(call.offline || done) && <>
        {!call.offline && call.status !== 'ended' && <div className="bc-offline" role="status"><b>{call.status === 'declined' ? 'Panggilan ditolak' : 'Panggilan tidak terjawab'}</b><small>Lanjutkan lewat chat, atau tutup untuk kembali ke menu BIX CALL.</small></div>}
        <button type="button" className="bc-pill is-chat" onClick={openChat}><MessageCircle size={16}/> Jalur Chat</button>
        {wa && <a className="bc-pill is-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><Phone size={16}/> Hubungi WhatsApp</a>}
        <button type="button" className="bc-pill is-close" onClick={() => { onClose(); void router.navigate({ to: '/call' }); }}><X size={16}/> Tutup &amp; Menu BIX CALL</button>
      </>}
    </footer>
  </div></>;
}

/** Small voice + video buttons for any member card. */
export function CallButtons({ peerId, peerName, className = '' }: { peerId: string; peerName: string; className?: string }) {
  return <span className={`bixcall-btns ${className}`}>
    <button type="button" aria-label="Voice call" onClick={e => { e.stopPropagation(); startBixCall(peerId, peerName, 'voice'); }}><Phone size={15}/></button>
    <button type="button" aria-label="Video call" onClick={e => { e.stopPropagation(); startBixCall(peerId, peerName, 'video'); }}><Video size={15}/></button>
  </span>;
}

/** Swipe-up key: drag the knob upward past the threshold to fire; tap-and-hold safe in pockets. Enter/Space also fires for accessibility. */
export function SwipeKey({ tone, label, icon, onDone }: { tone: 'accept' | 'end'; label: string; icon: React.ReactNode; onDone: () => void }) {
  const [dy, setDy] = useState(0);
  const [drag, setDrag] = useState(false);
  const fired = useRef(false);
  const LIMIT = 120, FIRE = 80;
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (fired.current) return;
    const y0 = e.clientY; setDrag(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => { const d = Math.max(0, Math.min(LIMIT, y0 - ev.clientY)); setDy(d); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setDrag(false);
      if (y0 - ev.clientY >= FIRE && !fired.current) { fired.current = true; setDy(LIMIT); try { navigator.vibrate?.(30); } catch { /* optional */ } onDone(); }
      else setDy(0);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  return <div className={`bc-swipe is-${tone}`}>
    <span className="bc-swipe-track" aria-hidden="true"><i/><i/><i/></span>
    <button type="button" className={`bc-swipe-knob${drag ? ' is-drag' : ''}`} style={{ transform: `translateY(${-dy}px)` }} aria-label={`Geser ke atas untuk ${label.toLowerCase()}`}
      onPointerDown={down} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !fired.current) { e.preventDefault(); fired.current = true; onDone(); } }}>{icon}</button>
    <small>{label}</small>
  </div>;
}
