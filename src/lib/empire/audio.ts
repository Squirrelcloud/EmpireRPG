let ctx: AudioContext | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.04) {
  const audio = ac();
  if (!audio) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur);
}

export function unlockAudio() {
  ac();
}

export function playClick() {
  tone(420, 0.06, "square", 0.03);
}

export function playTick() {
  tone(180, 0.08, "sine", 0.04);
}

export function playWin() {
  tone(523, 0.12, "triangle", 0.05);
  setTimeout(() => tone(784, 0.18, "triangle", 0.04), 90);
}

export function playLoss() {
  tone(196, 0.22, "sawtooth", 0.035);
}

export function playOpen() {
  tone(260, 0.1, "sine", 0.03);
}
