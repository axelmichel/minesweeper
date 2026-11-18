// Sound effects, synthesised with the Web Audio API: no files to load. The context is created on
// the first sound, which always follows a click or key press, so browsers allow it.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return { ctx, out: master! };
  } catch {
    return null;
  }
}

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** A burst of filtered noise with a decaying envelope. */
function burst(
  delay: number,
  duration: number,
  filter: BiquadFilterType,
  frequency: number,
  volume: number,
  endFrequency = frequency,
) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + delay;
  const src = a.ctx.createBufferSource();
  src.buffer = noise(a.ctx);
  const f = a.ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(frequency, t);
  f.frequency.exponentialRampToValueAtTime(endFrequency, t + duration);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(f).connect(g).connect(a.out);
  src.start(t, Math.random());
  src.stop(t + duration);
}

/** A single tone that glides from one pitch to another and fades. */
function tone(delay: number, duration: number, type: OscillatorType, from: number, to: number, volume: number) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + delay;
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + duration);
}

const jitter = (n: number) => n * (0.85 + Math.random() * 0.3);

export const sound = {
  /** Gravel crunch. */
  dig() {
    burst(0, 0.09, 'bandpass', jitter(900), 0.9, 300);
    burst(0.03, 0.07, 'lowpass', jitter(500), 0.5);
  },
  flag() {
    tone(0, 0.12, 'sine', 160, 70, 0.8);
    burst(0, 0.04, 'highpass', 3000, 0.25);
  },
  unflag() {
    tone(0, 0.08, 'sine', 220, 120, 0.6);
  },
  /** The item pick-up pop. */
  pickup(delay = 0) {
    tone(delay, 0.08, 'sine', jitter(700), 1400, 0.45);
  },
  /** A UI button click. */
  click() {
    tone(0, 0.05, 'square', 900, 600, 0.12);
  },
  /** The fuse hiss, then the blast after `fuse` seconds. */
  explode(fuse: number) {
    burst(0, fuse, 'highpass', 2500, 0.25, 6000);
    burst(fuse, 1.3, 'lowpass', 1200, 1.4, 80);
    tone(fuse, 0.9, 'sine', 90, 30, 1.0);
  },
  /** A distant boom in the chain reaction. */
  boom(delay: number) {
    burst(delay, 0.6, 'lowpass', jitter(800), 0.6, 60);
  },
  /** The level-up chime. */
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(i * 0.09, 0.5, 'triangle', f, f, 0.35));
  },
};
