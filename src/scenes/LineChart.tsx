import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { formatNumber } from "../lib/format";
import { C, body, display } from "../theme";
import { SourceNote, Title } from "./common";

const W = 1640, H = 520;
const PAD = { left: 150, right: 230, top: 30, bottom: 60 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Draws a real series left to right; the end value counts with the line. */
export const LineChart: React.FC<{ scene: SceneOf<"linechart"> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const duration = useSceneDuration();
  const { title, points, prefix = "", suffix = "", decimals, annotations, source } = scene.props;
  const fmt = (v: number) => `${prefix}${formatNumber(v, decimals)}${suffix}`;

  const g = useMemo(() => {
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || Math.abs(max) || 1;
    const lo = min - span * 0.1, hi = max + span * 0.1;
    const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const xy = points.map((p, i) => [x(i), y(p.value)] as const);
    return { min, max, x, y, xy };
  }, [points]);

  const up = points[points.length - 1].value >= points[0].value;
  const color = up ? C.up : C.down;
  const drawEnd = Math.max(30, duration * 0.6);
  const t = interpolate(frame, [8, drawEnd], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // Partial polyline up to progress t (interpolating the last segment).
  const pos = t * (points.length - 1);
  const whole = Math.floor(pos);
  const visible = g.xy.slice(0, whole + 1).map(([a, b]) => [a, b] as [number, number]);
  if (whole < points.length - 1) {
    const f = pos - whole, [x0, y0] = g.xy[whole], [x1, y1] = g.xy[whole + 1];
    visible.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]);
  }
  const head = visible[visible.length - 1];
  const line = visible.map((p) => p.join(",")).join(" ");
  const area = `${PAD.left},${H - PAD.bottom} ${line} ${head[0]},${H - PAD.bottom}`;
  const current = points[Math.min(points.length - 1, Math.round(pos))].value;
  const mid = Math.floor((points.length - 1) / 2);
  const axisLabels = [0, mid, points.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
      <Title>{title}</Title>
      <svg width={W} height={H} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[g.max, g.min].map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={g.y(v)} y2={g.y(v)} stroke={C.line} strokeDasharray="6 8" />
            <text x={PAD.left - 18} y={g.y(v) + 10} textAnchor="end" fill={C.dim} fontFamily={body} fontSize={26} fontWeight={600}>{fmt(v)}</text>
          </g>
        ))}
        {axisLabels.map((i) => (
          <text key={i} x={g.x(i)} y={H - 14} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fill={C.dim} fontFamily={body} fontSize={26} fontWeight={600}>
            {points[i].label}
          </text>
        ))}
        <polygon points={area} fill="url(#lc-fill)" />
        <polyline points={line} fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
        {annotations.map((a, i) =>
          pos >= a.index ? (
            <g key={i}>
              <circle cx={g.xy[a.index][0]} cy={g.xy[a.index][1]} r={11} fill={C.accent} stroke={C.bg} strokeWidth={3} />
              <line x1={g.xy[a.index][0]} x2={g.xy[a.index][0]} y1={g.xy[a.index][1] - 16} y2={PAD.top - 4} stroke={C.accent} strokeWidth={2} strokeDasharray="4 6" />
              <text x={g.xy[a.index][0]} y={PAD.top - 14} textAnchor="middle" fill={C.accent} fontFamily={body} fontSize={26} fontWeight={800}>{a.text}</text>
            </g>
          ) : null,
        )}
        <circle cx={head[0]} cy={head[1]} r={13} fill={color} stroke={C.bg} strokeWidth={4} />
        <text x={head[0] + 26} y={head[1] + 16} fill={color} fontFamily={display} fontSize={52}>{fmt(current)}</text>
      </svg>
      <SourceNote>{source}</SourceNote>
    </>
  );
};
