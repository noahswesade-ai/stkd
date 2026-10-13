// Frame-pure motion helpers. Every scene value is a function of time t (seconds),
// so any frame can be rendered on its own, in any order, and twice gives the
// same pixels. No CSS transitions, keyframes or easing keywords: motion comes
// from the closed-form spring below.

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, p) => a + (b - a) * p;

// Closed-form damped harmonic oscillator, released at rest from 0 toward 1.
// Returns position at `t` seconds after `start`. Underdamped springs overshoot
// and settle; critically damped ones arrive without overshoot.
export function spring(t, start = 0, { stiffness = 170, damping = 26, mass = 1 } = {}) {
  const x = t - start;
  if (x <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * w0 * x);
    return 1 - env * (Math.cos(wd * x) + ((zeta * w0) / wd) * Math.sin(wd * x));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * x) * (1 + w0 * x);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  return 1 - (r2 * Math.exp(r1 * x) - r1 * Math.exp(r2 * x)) / (r2 - r1);
}

// Named spring presets so scenes stay consistent.
export const SPRINGS = {
  snappy: { stiffness: 420, damping: 30 },   // UI chips, labels
  bouncy: { stiffness: 260, damping: 14 },   // items landing
  heavy: { stiffness: 120, damping: 18, mass: 1.6 }, // the lid, the box
  soft: { stiffness: 90, damping: 20 },      // camera drift, glows
};

// A spring that goes out at `start` and comes back at `end`.
export function springInOut(t, start, end, cfg) {
  return spring(t, start, cfg) - spring(t, end, cfg);
}

// Deterministic PRNG so "random" layouts are identical on every render.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Beat grid: converts beats to seconds so every cut lands on the music.
export function beatGrid(bpm) {
  const spb = 60 / bpm;
  return { spb, at: (beat) => beat * spb };
}
