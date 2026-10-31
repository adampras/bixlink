import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Each replay part stays under the media storage limit (50 MB). */
export const REPLAY_PART_BYTES = 45 * 1024 * 1024;

export function pickReplayMime(isSupported: (m: string) => boolean): string | undefined {
  return ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => isSupported(m));
}

/**
 * Records the host's own camera + microphone while `on` is true and publishes each finished
 * part as a REPLAY post. Parts roll over automatically before the storage size limit.
 */
export function useReplayRecorder({ stream, liveId, me, on, onNote }: { stream: MediaStream | null; liveId: string; me: string; on: boolean; onNote: (m: string) => void }) {
  const part = useRef(0);
  const uploads = useRef<Promise<void>[]>([]);
  const stopping = useRef<Promise<void> | null>(null);
  const noteRef = useRef(onNote); noteRef.current = onNote;

  const save = async (blob: Blob) => {
    if (blob.size < 60_000) return;
    const n = ++part.current;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const path = `${me}/replay-${liveId}-${n}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('bixtok-media').upload(path, blob, { contentType: blob.type || `video/${ext}`, upsert: false });
    if (up.error) { noteRef.current(`Replay part ${n} could not be uploaded.`); return; }
    const { error } = await supabase.rpc('bixtok_publish_replay', { p_live: liveId, p_path: path, p_part: n });
    if (error) { await supabase.storage.from('bixtok-media').remove([path]); noteRef.current(error.message); return; }
    noteRef.current(`Replay part ${n} saved to your BIXTOK feed.`);
  };

  useEffect(() => {
    if (!on || !stream || typeof MediaRecorder === 'undefined') return undefined;
    const mime = pickReplayMime(m => MediaRecorder.isTypeSupported(m));
    let current: MediaRecorder | null = null; let finished = false; let resolveStop: (() => void) | null = null;
    const begin = () => {
      let chunks: Blob[] = []; let size = 0;
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 64_000 });
      rec.ondataavailable = e => {
        if (!e.data.size) return;
        chunks.push(e.data); size += e.data.size;
        if (size > REPLAY_PART_BYTES && rec.state === 'recording') rec.stop();
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' }); chunks = []; size = 0;
        uploads.current.push(save(blob));
        if (finished) resolveStop?.(); else begin();
      };
      rec.start(3000); current = rec;
    };
    try { begin(); } catch { noteRef.current('Recording is not supported on this device.'); return undefined; }
    return () => {
      finished = true;
      stopping.current = new Promise<void>(r => { resolveStop = r; });
      if (current && current.state !== 'inactive') current.stop(); else resolveStop?.();
    };
  }, [on, stream, liveId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Waits for the last part to stop and finish uploading. */
  const finish = async () => {
    if (stopping.current) await Promise.race([stopping.current, new Promise(r => setTimeout(r, 4000))]);
    await Promise.allSettled(uploads.current);
  };
  return { finish };
}
