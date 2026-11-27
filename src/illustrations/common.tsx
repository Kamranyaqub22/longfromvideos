import { useMemo } from "react";
import { useCurrentFrame } from "remotion";

/** Deterministic pseudo-random numbers (renders must be identical frame to frame and run to run). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** 0→1 between a and b (fractions of the scene), smoothstep-eased. */
export const seg = (t: number, a: number, b: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** A twinkling star field in a w×h box. `drift` scrolls it downward (px per frame) for a sense of travel. */
export const Stars: React.FC<{ w: number; h: number; n?: number; seed?: number; drift?: number; streak?: number }> = ({ w, h, n = 160, seed = 7, drift = 0, streak = 0 }) => {
  const frame = useCurrentFrame();
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, s: 0.6 + r() * 1.8, p: r() * 6.28, z: 0.3 + r() * 0.7 }));
  }, [w, h, n, seed]);
  return (
    <g>
      {stars.map((s, i) => {
        const y = (s.y + frame * drift * s.z) % h;
        const o = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(frame * 0.08 + s.p));
        return streak > 0 ? (
          <line key={i} x1={s.x} y1={y} x2={s.x} y2={y - streak * s.z} stroke="#cfe0ff" strokeOpacity={o} strokeWidth={s.s * 0.8} strokeLinecap="round" />
        ) : (
          <circle key={i} cx={s.x} cy={y} r={s.s} fill="#cfe0ff" opacity={o} />
        );
      })}
    </g>
  );
};
