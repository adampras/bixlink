/** BIXGO-only audio: a gesture unlocks one shared context, independent of BIX CALL. */
let audio: AudioContext | null = null;
export async function unlockOrderAudio(): Promise<boolean> {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'closed') audio = new AudioContext();
    await audio.resume();
    if (audio.state !== 'running') return false;
    const source = audio.createBufferSource();
    source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    source.connect(audio.destination); source.start();
    return true;
  } catch { return false; }
}
export function orderAudioReady(): boolean { return audio?.state === 'running'; }
export function jobChime(): boolean {
  const c = audio;
  if (!c || c.state !== 'running') return false;
  try {
    [880, 1175, 1568].forEach((f, i) => {
      const oscillator = c.createOscillator(), gain = c.createGain(), time = c.currentTime + i * .18;
      oscillator.frequency.value = f;
      gain.gain.setValueAtTime(.12, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .35);
      oscillator.connect(gain).connect(c.destination); oscillator.start(time); oscillator.stop(time + .4);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
    return true;
  } catch { return false; }
}