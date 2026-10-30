import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Peer-to-peer LIVE video/audio for BIXTOK.
 * The host sends its camera + microphone directly to each viewer over WebRTC;
 * the shared realtime room only carries the connection handshake.
 */
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
};

export type RtcState = 'waiting' | 'connecting' | 'live' | 'failed';
type Sig = { to?: string; from: string; sdp?: RTCSessionDescriptionInit; c?: RTCIceCandidateInit };

export function useLiveRtc({ liveId, me, host, stream }: { liveId: string; me: string; host: boolean; stream: MediaStream | null }) {
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [state, setState] = useState<RtcState>(host ? 'live' : 'waiting');
  const streamRef = useRef(stream); streamRef.current = stream;
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const queued = useRef(new Map<string, RTCIceCandidateInit[]>());
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ready = useRef(false); const offeredAt = useRef(0);

  useEffect(() => {
    if (typeof RTCPeerConnection === 'undefined') { setState('failed'); return undefined; }
    const ch = supabase.channel(`bixtok-rtc-${liveId}`, { config: { broadcast: { self: false } } });
    chanRef.current = ch;
    const send = (event: string, payload: Sig) => { if (import.meta.env.DEV) console.debug('[bixtok-rtc] send', event, host); void ch.send({ type: 'broadcast', event, payload }).then(r => { if (import.meta.env.DEV) console.debug('[bixtok-rtc] sent', event, r); }); };
    const drop = (peer: string) => { pcs.current.get(peer)?.close(); pcs.current.delete(peer); queued.current.delete(peer); };
    const flushIce = async (peer: string, pc: RTCPeerConnection) => {
      for (const c of queued.current.get(peer) ?? []) await pc.addIceCandidate(c).catch(() => {});
      queued.current.delete(peer);
    };
    const makePc = (peer: string) => {
      drop(peer);
      const pc = new RTCPeerConnection(ICE);
      pcs.current.set(peer, pc);
      pc.onicecandidate = e => { if (e.candidate) send('ice', { to: peer, from: me, c: e.candidate.toJSON() }); };
      return pc;
    };

    // ---- host: offer the camera to every viewer that says hello ----
    const offerTo = async (peer: string) => {
      const s = streamRef.current; if (!s) return;
      const pc = makePc(peer);
      s.getTracks().forEach(t => pc.addTrack(t, s));
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(peer); };
      await pc.setLocalDescription(await pc.createOffer());
      send('offer', { to: peer, from: me, sdp: pc.localDescription!.toJSON() });
    };

    // ---- viewer: say hello until the host's video arrives ----
    let retry: ReturnType<typeof setInterval> | undefined;
    const hello = () => send('hello', { from: me });
    const answer = async (p: Sig) => {
      const pc = makePc(p.from); setState('connecting'); offeredAt.current = Date.now();
      pc.ontrack = e => { setRemote(e.streams[0] ?? new MediaStream([e.track])); };
      pc.onconnectionstatechange = () => {
        if (import.meta.env.DEV) console.debug('[bixtok-rtc]', pc.connectionState);
        if (pc.connectionState === 'connected') setState('live');
        if (pc.connectionState === 'failed') { setState('failed'); drop(p.from); }
        if (pc.connectionState === 'disconnected') setState('connecting');
      };
      await pc.setRemoteDescription(p.sdp!);
      await flushIce(p.from, pc);
      await pc.setLocalDescription(await pc.createAnswer());
      send('answer', { to: p.from, from: me, sdp: pc.localDescription!.toJSON() });
    };

    ch.on('broadcast', { event: 'hello' }, ({ payload }) => { if (host && payload?.from) void offerTo(String(payload.from)).catch(() => {}); })
      .on('broadcast', { event: 'host-ready' }, () => { if (!host) hello(); })
      .on('broadcast', { event: 'offer' }, ({ payload }) => { if (!host && payload?.to === me) void answer(payload as Sig).catch(() => setState('failed')); })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        const p = payload as Sig; if (!host || p.to !== me) return;
        const pc = pcs.current.get(p.from); if (!pc || !p.sdp) return;
        void pc.setRemoteDescription(p.sdp).then(() => flushIce(p.from, pc)).catch(() => {});
      })
      .on('broadcast', { event: 'ice' }, ({ payload }) => {
        const p = payload as Sig; if (p.to !== me || !p.c) return;
        const pc = pcs.current.get(p.from);
        if (pc?.remoteDescription) void pc.addIceCandidate(p.c).catch(() => {});
        else queued.current.set(p.from, [...(queued.current.get(p.from) ?? []), p.c]);
      })
      .on('broadcast', { event: 'bye' }, ({ payload }) => {
        const from = String(payload?.from ?? ''); drop(from);
        if (!host) { setRemote(null); setState('waiting'); }
      })
      .subscribe(s => {
        if (s !== 'SUBSCRIBED') return;
        ready.current = true;
        if (host) { if (streamRef.current) send('host-ready', { from: me }); return; }
        hello();
        retry = setInterval(() => {
          // Re-ask only when there is no usable connection (none yet, or it failed/closed).
          const pc = [...pcs.current.values()][0];
          const st = pc?.connectionState;
          const stalled = pc && st !== 'connected' && Date.now() - (offeredAt.current || 0) > 12000;
          if (!pc || st === 'failed' || st === 'closed' || stalled) hello();
        }, 6000);
      });

    return () => {
      clearInterval(retry);
      void ch.send({ type: 'broadcast', event: 'bye', payload: { from: me } });
      pcs.current.forEach(pc => pc.close()); pcs.current.clear(); queued.current.clear();
      ready.current = false; chanRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [liveId, me, host]);

  // Host camera changed (first start or flip): swap tracks for connected viewers, announce readiness.
  useEffect(() => {
    if (!host || !stream) return;
    pcs.current.forEach(pc => {
      pc.getSenders().forEach(sender => {
        const next = stream.getTracks().find(t => t.kind === sender.track?.kind);
        if (next) void sender.replaceTrack(next).catch(() => {});
      });
    });
    if (ready.current) void chanRef.current?.send({ type: 'broadcast', event: 'host-ready', payload: { from: me } });
  }, [host, stream, me]);

  return { remote, state };
}
