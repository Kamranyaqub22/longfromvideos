import { useMemo } from "react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { useCurrentFrame } from "remotion";
import type { Tone } from "../schema";
import { countries, getCountry } from "../lib/geo";
import { C, body, toneColor } from "../theme";
import { rng } from "./common";

const TILT = (20 * Math.PI) / 180; // viewer sits at 20°N, so the north pole leans toward camera
const MAX_DOTS = 1800;

/** How many dots to draw for a real satellite count: grows fast at first, then saturates (it is a picture, not a census). */
export const dotsFor = (count: number) => (count <= 0 ? 0 : Math.min(MAX_DOTS, Math.round(Math.sqrt(count) * 5)));

type Sat = { inc: number; raan: number; phase: number; alt: number; speed: number };

/** Project an inertial point (Earth radii, z = north) to screen offsets and depth toward the viewer. */
function project(x: number, y: number, z: number) {
  return { sx: y, sy: -(z * Math.cos(TILT) - x * Math.sin(TILT)), depth: x * Math.cos(TILT) + z * Math.sin(TILT) };
}

/**
 * A slowly turning Earth (Natural Earth countries, orthographic) with satellites on inclined orbits.
 * `dots` is how many satellites to draw this frame; `rings` draws labelled orbit shells.
 */
export const Globe: React.FC<{
  cx: number;
  cy: number;
  r: number;
  dots?: number;
  rings?: { label: string }[];
  highlights?: { country: string; tone: Tone }[];
  spin?: number;
}> = ({ cx, cy, r, dots = 0, rings = [], highlights = [], spin = 0.12 }) => {
  const frame = useCurrentFrame();
  const sats = useMemo<Sat[]>(() => {
    const g = rng(42);
    const incs = [53, 97.6, 30, 70, 43];
    return Array.from({ length: MAX_DOTS }, () => ({
      inc: (incs[Math.floor(g() * incs.length)] * Math.PI) / 180,
      raan: g() * Math.PI * 2,
      phase: g() * Math.PI * 2,
      alt: 0.07 + g() * 0.13,
      speed: 0.006 + g() * 0.006,
    }));
  }, []);
  const hl = useMemo(() => highlights.map((h) => ({ c: getCountry(h.country), color: toneColor(h.tone) })), [highlights]);

  const projection = geoOrthographic().scale(r).translate([cx, cy]).rotate([-30 + frame * spin, -20]).clipAngle(90);
  const path = geoPath(projection);
  const land = countries().map((c) => path(c) ?? "").join(" ");
  const grat = path(geoGraticule10()) ?? "";

  const satEls: React.ReactNode[] = [];
  for (let i = 0; i < Math.min(dots, MAX_DOTS); i++) {
    const s = sats[i];
    const th = s.phase + frame * s.speed;
    const R = 1 + s.alt;
    const x = R * (Math.cos(s.raan) * Math.cos(th) - Math.sin(s.raan) * Math.sin(th) * Math.cos(s.inc));
    const y = R * (Math.sin(s.raan) * Math.cos(th) + Math.cos(s.raan) * Math.sin(th) * Math.cos(s.inc));
    const z = R * Math.sin(th) * Math.sin(s.inc);
    const p = project(x, y, z);
    const behind = p.depth < 0 && p.sx * p.sx + p.sy * p.sy < 1;
    if (behind) continue;
    satEls.push(<circle key={i} cx={cx + p.sx * r} cy={cy + p.sy * r} r={dots > 600 ? 2 : 3} fill={C.accent} opacity={p.depth < 0 ? 0.35 : 0.95} />);
  }

  // Orbit shells: the half behind the Earth is drawn first (hidden by the globe), the front half on top.
  const ringParts = rings.map((ring, k) => {
    const R = 1.12 + k * 0.14;
    const inc = (30 * Math.PI) / 180;
    const pts = Array.from({ length: 121 }, (_, i) => {
      const th = (i / 120) * Math.PI * 2;
      return project(R * Math.cos(th), R * Math.sin(th) * Math.cos(inc), R * Math.sin(th) * Math.sin(inc));
    });
    // An SVG path that starts a new sub-path wherever the kept half is interrupted (no chords across the gap).
    const line = (keep: (d: number) => boolean) => {
      let d = "", on = false;
      for (const p of pts) {
        if (keep(p.depth)) { d += `${on ? "L" : "M"}${(cx + p.sx * r).toFixed(1)},${(cy + p.sy * r).toFixed(1)}`; on = true; }
        else on = false;
      }
      return d;
    };
    return { k, label: ring.label, back: line((d) => d < 0), front: line((d) => d >= 0), lx: cx + r * 0.75, ly: cy - r * 1.18 + k * Math.max(28, r * 0.1) };
  });
  const ringStroke = { fill: "none", stroke: C.neutral, strokeWidth: 4, strokeDasharray: "10 8" } as const;

  return (
    <g>
      <defs>
        <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor={C.neutral} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.neutral} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="ocean" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#1d4f8f" />
          <stop offset="100%" stopColor="#081a33" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.12} fill="url(#atmo)" />
      {ringParts.map((p) => <path key={p.k} d={p.back} {...ringStroke} strokeOpacity={0.3} />)}
      <circle cx={cx} cy={cy} r={r} fill="url(#ocean)" />
      <path d={grat} fill="none" stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1} />
      <path d={land} fill="#2c5f8a" stroke="#6fa3d6" strokeOpacity={0.35} strokeWidth={0.8} />
      {hl.map((h, i) => (
        <path key={i} d={path(h.c) ?? ""} fill={h.color} />
      ))}
      {satEls}
      {ringParts.map((p) => (
        <g key={p.k}>
          <path d={p.front} {...ringStroke} strokeOpacity={1} />
          <line x1={p.lx - 44} y1={p.ly - 8} x2={p.lx - 10} y2={p.ly - 8} {...ringStroke} strokeOpacity={1} />
          <text x={p.lx} y={p.ly} fill={C.neutral} fontFamily={body} fontWeight={800} fontSize={Math.max(18, r * 0.07)}>{p.label}</text>
        </g>
      ))}
    </g>
  );
};
