import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { useSceneDuration } from "../components/SceneContext";
import { C } from "../theme";
import { Stars, rng, seg } from "./common";

const W = 1920, H = 1080;

/**
 * A generic rocket (no real vehicle's livery or logo) lifting off at horizontal position `x`.
 * Beats over the scene: ignition and smoke (0–15%), lift-off (15–55%), then the camera tracks it climbing:
 * the ground falls away, the sky turns to space and the stars streak past.
 */
export const RocketArt: React.FC<{ x?: number }> = ({ x = 1300 }) => {
  const frame = useCurrentFrame();
  const D = useSceneDuration();
  const t = frame / D;
  const lift = seg(t, 0.15, 0.55); // rocket rises to its tracked height
  const climb = Math.max(0, t - 0.4) / 0.6; // after that, the world scrolls past
  const rocketY = 760 - 380 * lift * lift; // nose position
  const groundY = 880 + Math.pow(climb, 1.4) * 900;
  const space = seg(t, 0.35, 0.85);
  const flicker = 0.85 + 0.15 * Math.sin(frame * 1.7) + 0.08 * Math.sin(frame * 3.1);
  const ignite = seg(t, 0.03, 0.12);

  const puffs = useMemo(() => {
    const g = rng(9);
    return Array.from({ length: 46 }, () => ({ born: g() * 0.5, dir: g() * 2 - 1, size: 30 + g() * 60, rise: g() }));
  }, []);

  const body = "#eef2f8", shade = "#c4ccd8", trim = C.neutral;
  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1a33" />
          <stop offset="100%" stopColor="#24456f" />
        </linearGradient>
        <radialGradient id="flame" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#fff6c8" />
          <stop offset="40%" stopColor={C.accent} />
          <stop offset="100%" stopColor="#ff5a2e" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#sky)" opacity={1 - space} />
      <Stars w={W} h={H} n={140} drift={climb > 0 ? 6 : 0} streak={climb > 0.05 ? 14 * Math.min(1, climb * 2) : 0} />
      {/* ground and launch tower */}
      <g transform={`translate(0 ${groundY - 880})`} opacity={1 - seg(t, 0.75, 0.95)}>
        <rect x={0} y={880} width={W} height={300} fill="#101a2a" />
        <rect x={x - 160} y={560} width={26} height={320} fill="#2a3a52" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={x - 160} y1={580 + i * 38} x2={x - 134} y2={600 + i * 38} stroke="#45597a" strokeWidth={4} />
        ))}
        <rect x={x - 120} y={866} width={240} height={18} fill="#2a3a52" />
        {puffs.map((p, i) => {
          const age = t - p.born * 0.6 - 0.04;
          if (age <= 0) return null;
          const k = Math.min(1, age * 2.2);
          return (
            <circle key={i} cx={x + p.dir * (40 + 520 * k)} cy={870 - p.rise * 120 * k} r={p.size * (0.4 + 1.6 * k)} fill="#d9dee8" opacity={0.55 * (1 - k) * ignite} />
          );
        })}
      </g>
      {/* rocket */}
      <g transform={`translate(${x} ${rocketY})`}>
        <ellipse cx={0} cy={330} rx={34 * flicker} ry={(90 + 160 * lift) * flicker * ignite} fill="url(#flame)" />
        <path d="M-38 120 L-38 300 L38 300 L38 120 Q38 30 0 -10 Q-38 30 -38 120 Z" fill={body} />
        <path d="M10 120 L10 300 L38 300 L38 120 Q38 30 0 -10 Q20 40 10 120 Z" fill={shade} opacity={0.6} />
        <rect x={-38} y={170} width={76} height={14} fill={trim} />
        <circle cx={0} cy={110} r={14} fill="#1b2d4a" stroke={trim} strokeWidth={4} />
        <path d="M-38 240 L-74 310 L-38 300 Z" fill={trim} />
        <path d="M38 240 L74 310 L38 300 Z" fill={trim} />
        <rect x={-26} y={300} width={52} height={18} fill="#56637a" />
      </g>
    </g>
  );
};
