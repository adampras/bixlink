import { supabase } from '@/integrations/supabase/client';
import { pickReplayMime } from '@/lib/bixtok-replay';

export const CLIP_SECONDS = 15;

/** Records the next CLIP_SECONDS of the host's own stream and publishes it to the feed as a LIVE moment. */
export async function recordLiveClip(stream: MediaStream, liveId: string, me: string): Promise<string> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Clips are not supported on this device.');
  const mime = pickReplayMime(m => MediaRecorder.isTypeSupported(m));
  const chunks: Blob[] = [];
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 64_000 });
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<void>(r => { rec.onstop = () => r(); });
  rec.start(1000);
  await new Promise(r => setTimeout(r, CLIP_SECONDS * 1000));
  if (rec.state !== 'inactive') rec.stop();
  await done;
  const blob = new Blob(chunks, { type: rec.mimeType || mime || 'video/webm' });
  if (blob.size < 20_000) throw new Error('Clip was empty — keep the camera on.');
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  const path = `${me}/clip-${liveId}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from('bixtok-media').upload(path, blob, { contentType: blob.type || `video/${ext}`, upsert: false });
  if (up.error) throw new Error('Clip could not be uploaded.');
  const { error } = await supabase.rpc('bixtok_publish_clip', { p_live: liveId, p_path: path });
  if (error) { await supabase.storage.from('bixtok-media').remove([path]); throw new Error(error.message); }
  return path;
}
