/**
 * Generates the sound effects in public/sfx/ from scratch (no samples, no third-party audio), so we
 * own every sound outright. Deterministic: same seed, same files. Re-run after changing a recipe:
 *
 *   npm run sfx
 *
 *   whoosh.wav  swept band-pass noise with a slight left-to-right pan; marks chapter cards
 *   impact.wav  low pitch-dropping thump with a soft transient; lands big-number reveals and the hook
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/paths";

const RATE = 48_000;

/** Small deterministic PRNG (mulberry32) so renders never change between runs. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 16-bit PCM WAV, interleaved stereo, normalized so the loudest sample sits at `peakDb`. */
function wav(left: Float32Array, right: Float32Array, peakDb = -6): Buffer {
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = peak ? 10 ** (peakDb / 20) / peak : 0;
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * gain)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * gain)) * 32767), 46 + i * 4);
  }
  return buf;
}

/** Fade the last few ms to zero so no effect ends on a click. */
function tailFade(x: Float32Array, ms = 30) {
  const k = Math.floor((RATE * ms) / 1000);
  for (let i = 0; i < k; i++) x[x.length - 1 - i] *= i / k;
}

export function whoosh(seconds = 0.9) {
  const n = Math.floor(RATE * seconds);
  const rand = rng(7);
  const L = new Float32Array(n), R = new Float32Array(n);
  // State-variable band-pass filter, centre swept up then slightly back down.
  let low = 0, band = 0;
  const q = 0.9;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const centre = t < 0.6 ? 250 * (2600 / 250) ** (t / 0.6) : 2600 * (1400 / 2600) ** ((t - 0.6) / 0.4);
    const f = 2 * Math.sin((Math.PI * centre) / RATE);
    const noise = rand() * 2 - 1;
    low += f * band;
    const high = noise - low - q * band;
    band += f * high;
    // Swell in, quick release: the shape of air moving past.
    const env = t < 0.6 ? (t / 0.6) ** 2 : (1 - (t - 0.6) / 0.4) ** 1.5;
    const s = band * env;
    const pan = 0.25 + 0.5 * t; // drifts left to right
    L[i] = s * Math.cos((pan * Math.PI) / 2);
    R[i] = s * Math.sin((pan * Math.PI) / 2);
  }
  tailFade(L); tailFade(R);
  return wav(L, R, -6);
}

export function impact(seconds = 1.2) {
  const n = Math.floor(RATE * seconds);
  const rand = rng(11);
  const M = new Float32Array(n);
  let phase = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const freq = 45 + 70 * Math.exp(-t / 0.08); // pitch drops 115 Hz → 45 Hz
    phase += (2 * Math.PI * freq) / RATE;
    const body = Math.sin(phase) * Math.exp(-t / 0.32);
    lp += 0.08 * (rand() * 2 - 1 - lp); // low-passed noise for the attack
    const transient = lp * Math.exp(-t / 0.025) * 3;
    M[i] = Math.tanh(1.6 * (body + transient)); // gentle saturation for warmth
  }
  tailFade(M);
  return wav(M, M.slice(), -6);
}

function main() {
  const dir = path.join(ROOT, "public", "sfx");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "whoosh.wav"), whoosh());
  writeFileSync(path.join(dir, "impact.wav"), impact());
  console.log(`sfx: wrote whoosh.wav and impact.wav to ${dir}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
