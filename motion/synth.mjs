// Synthesizes a scene's soundtrack from code: a beat at the scene's BPM plus
// sound effects at the scene's cue times, so every hit lands on a cut.
// Output: 16-bit stereo WAV.
import { writeFileSync } from "node:fs";

const SR = 44100;

function noiseGen(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
}

export function synthesize({ duration, bpm, cues }, outPath) {
  const n = Math.ceil(duration * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const spb = 60 / bpm;
  const noise = noiseGen(11);

  const add = (t0, len, fn, pan = 0) => {
    const i0 = Math.round(t0 * SR);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < len * SR; i++) {
      const j = (i0 + i) % n; // wrap so tails ring into the loop start
      if (j < 0) continue;
      const v = fn(i / SR);
      L[j] += v * gl;
      R[j] += v * gr;
    }
  };

  // --- instruments ---
  const kick = (t0, gain = 0.9) => {
    let ph = 0;
    add(t0, 0.5, (t) => {
      ph += (2 * Math.PI * (48 + 110 * Math.exp(-t * 28))) / SR;
      return gain * (Math.sin(ph) * Math.exp(-t * 6.5) + 0.25 * noise() * Math.exp(-t * 300));
    });
  };
  const clap = (t0) => {
    let prev = 0;
    add(t0, 0.25, (t) => {
      const env = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * (o === 0.022 ? 18 : 120)) : 0), 0);
      const x = noise();
      const hp = x - prev; prev = x;
      return 0.32 * hp * env;
    });
  };
  const hat = (t0, gain = 0.1, pan = 0.3) => {
    let p1 = 0, p2 = 0;
    add(t0, 0.08, (t) => {
      const x = noise();
      const h1 = x - p1; p1 = x;
      const h2 = h1 - p2; p2 = h1;
      return gain * h2 * Math.exp(-t * 70);
    }, pan);
  };
  const sub = (t0, f, len, gain = 0.38) => {
    add(t0, len, (t) => {
      const env = Math.min(1, t / 0.008) * Math.min(1, (len - t) / 0.04);
      return gain * Math.tanh(1.6 * Math.sin(2 * Math.PI * f * t)) * env;
    });
  };
  const pad = (t0, freqs, len, gain = 0.05) => {
    add(t0, len, (t) => {
      const env = Math.min(1, t / 0.3) * Math.min(1, (len - t) / 0.3);
      let v = 0;
      for (const f of freqs) v += Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t);
      return gain * env * v * (0.8 + 0.2 * Math.sin(2 * Math.PI * 4 * t));
    });
  };
  const filteredNoise = (t0, len, envFn, cutoffFn, gain, panFn = () => 0) => {
    let y = 0;
    const i0 = Math.round(t0 * SR);
    for (let i = 0; i < len * SR; i++) {
      const t = i / SR;
      const a = 1 - Math.exp((-2 * Math.PI * cutoffFn(t)) / SR);
      y += a * (noise() - y);
      const v = gain * envFn(t) * y;
      const pan = panFn(t);
      const j = (i0 + i) % n;
      L[j] += v * Math.cos(((pan + 1) * Math.PI) / 4);
      R[j] += v * Math.sin(((pan + 1) * Math.PI) / 4);
    }
  };

  const fx = {
    riser: (t0) => filteredNoise(t0, spb / 2, (t) => (t / (spb / 2)) ** 2, (t) => 400 + 9000 * (t / (spb / 2)) ** 2, 0.5),
    impact: (t0) => {
      kick(t0, 1);
      let ph = 0;
      add(t0, 1.4, (t) => { ph += (2 * Math.PI * (34 + 40 * Math.exp(-t * 5))) / SR; return 0.5 * Math.sin(ph) * Math.exp(-t * 2.2); });
      filteredNoise(t0, 0.6, (t) => Math.exp(-t * 7), () => 2500, 0.45);
    },
    whoosh: (t0) => filteredNoise(t0, 0.45, (t) => Math.sin((Math.PI * t) / 0.45) ** 2, (t) => 600 + 4000 * Math.sin((Math.PI * t) / 0.45), 0.42, (t) => -0.8 + (3.2 * t)),
    tick: (t0) => add(t0, 0.07, (t) => 0.28 * Math.exp(-t * 90) * (Math.sin(2 * Math.PI * 2350 * t) + 0.6 * Math.sin(2 * Math.PI * 3710 * t)) + 0.08 * noise() * Math.exp(-t * 400), 0.15),
    swipe: (t0) => filteredNoise(t0, 0.18, (t) => Math.sin((Math.PI * t) / 0.18), (t) => 3000 + 6000 * (t / 0.18), 0.3, () => 0.4),
    hit: (t0) => { kick(t0, 0.8); clap(t0); filteredNoise(t0, 0.5, (t) => Math.exp(-t * 9), () => 6000, 0.25); },
    thud: (t0) => {
      let ph = 0;
      add(t0, 0.35, (t) => { ph += (2 * Math.PI * (40 + 60 * Math.exp(-t * 30))) / SR; return 0.8 * Math.sin(ph) * Math.exp(-t * 11); });
      filteredNoise(t0, 0.12, (t) => Math.exp(-t * 40), () => 900, 0.5);
      add(t0 + 0.005, 0.09, (t) => 0.12 * Math.exp(-t * 70) * Math.sin(2 * Math.PI * 1650 * t), 0);
    },
  };

  // --- arrangement: quiet intro, full beat from the reveal, drop-out into the loop ---
  const reveal = cues.find((c) => c.kind === "impact")?.t ?? 0;
  const close = cues.find((c) => c.kind === "thud")?.t ?? duration;
  const beats = Math.round(duration / spb);
  const roots = [55, 43.65, 65.41, 49]; // A, F, C, G per bar
  for (let b = 0; b < beats; b++) {
    const t = b * spb;
    const full = t >= reveal && t < close - 1e-6;
    const bar = Math.floor(b / 4) % roots.length;
    if (full) {
      kick(t);
      if (b % 2 === 1) clap(t);
      hat(t + spb / 2, 0.12);
      hat(t + spb * 0.75, 0.05, -0.3);
      sub(t + spb / 2, roots[bar], spb * 0.45);
    } else {
      hat(t + spb / 2, 0.05);
    }
  }
  for (let bar = 0; bar < beats / 4; bar++) {
    const f = roots[bar % roots.length] * 4;
    pad(bar * 4 * spb, [f, f * 1.5, f * 2], 4 * spb, 0.025);
  }
  for (const c of cues) fx[c.kind]?.(c.t);

  // --- master: gentle saturation, then peak-normalize ---
  let peak = 0;
  for (let i = 0; i < n; i++) {
    L[i] = Math.tanh(L[i] * 1.2);
    R[i] = Math.tanh(R[i] * 1.2);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = peak > 0 ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4);
  }
  writeFileSync(outPath, buf);
}
