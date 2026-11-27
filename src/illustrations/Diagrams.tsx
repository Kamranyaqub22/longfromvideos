import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import type { DiagramKind } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { C } from "../theme";
import { Stars, rng, seg } from "./common";

/** Diagram drawings live in a 1000×700 box. Each exports anchor points (in that box) for its labelled parts. */
export const ART_W = 1000, ART_H = 700;

type ArtProps = { highlight?: string };
const glow = (on: boolean) => (on ? { filter: "drop-shadow(0 0 14px rgba(255,204,51,0.9))" } : {});

// ------------------------------------------------------------------ satellite
export const SATELLITE_ANCHORS = { solar: [760, 300], compute: [500, 310], radiator: [500, 520], antenna: [500, 140] } as const;
const SatelliteArt: React.FC<ArtProps> = ({ highlight }) => {
  const frame = useCurrentFrame();
  const D = useSceneDuration();
  const t = frame / D;
  const unfold = seg(t, 0.05, 0.3);
  const bob = Math.sin(frame * 0.05) * 8;
  const heat = 0.5 + 0.5 * Math.sin(frame * 0.12);
  const glint = ((frame * 6) % 700) - 150;
  const Wing: React.FC<{ side: -1 | 1 }> = ({ side }) => (
    <g transform={`translate(${500 + side * 70} 300) scale(${side * unfold} 1)`} style={glow(highlight === "solar")}>
      <rect x={0} y={-60} width={330} height={120} fill="#173a6b" stroke="#5aa9ff" strokeWidth={3} />
      {Array.from({ length: 10 }, (_, i) => <line key={i} x1={33 * i} y1={-60} x2={33 * i} y2={60} stroke="#5aa9ff" strokeOpacity={0.5} />)}
      <line x1={0} y1={0} x2={330} y2={0} stroke="#5aa9ff" strokeOpacity={0.5} />
      <rect x={glint * 0.5} y={-60} width={40} height={120} fill="#ffffff" opacity={0.18} />
    </g>
  );
  return (
    <g>
      <Stars w={ART_W} h={ART_H} n={90} seed={3} />
      <ellipse cx={500} cy={1150} rx={900} ry={520} fill="#0d2a52" stroke="#5aa9ff" strokeOpacity={0.6} strokeWidth={6} />
      <g transform={`translate(0 ${bob})`}>
        <Wing side={-1} />
        <Wing side={1} />
        <g style={glow(highlight === "antenna")}>
          <line x1={500} y1={200} x2={500} y2={160} stroke="#c4ccd8" strokeWidth={6} />
          <path d="M455 160 Q500 100 545 160 Z" fill="#c4ccd8" />
        </g>
        <g style={glow(highlight === "compute")}>
          <rect x={430} y={200} width={140} height={220} rx={10} fill="#e9edf4" />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <rect x={445} y={215 + i * 33} width={110} height={24} rx={4} fill="#1b2d4a" />
              <circle cx={540} cy={227 + i * 33} r={4} fill={(frame + i * 7) % 24 < 12 ? C.up : "#2a4a3a"} />
            </g>
          ))}
        </g>
        <g style={glow(highlight === "radiator")}>
          <line x1={500} y1={420} x2={500} y2={470} stroke="#c4ccd8" strokeWidth={8} />
          <rect x={330} y={470} width={340} height={90} rx={6} fill={`rgb(${200 + 55 * heat},${90 + 40 * heat},60)`} opacity={0.9} />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1={345 + i * 28} y1={478} x2={345 + i * 28} y2={552} stroke="#7a2f1a" strokeWidth={3} />)}
          {Array.from({ length: 3 }, (_, i) => {
            const k = ((frame * 0.02 + i / 3) % 1);
            return <path key={i} d={`M340 ${580 + k * 80} Q500 ${600 + k * 80} 660 ${580 + k * 80}`} fill="none" stroke="#ff8a4d" strokeOpacity={0.6 * (1 - k)} strokeWidth={4} />;
          })}
        </g>
      </g>
    </g>
  );
};

// ------------------------------------------------------------------ data centre
export const DATACENTER_ANCHORS = { building: [900, 470], power: [370, 352], cooling: [880, 250] } as const;
const DataCenterArt: React.FC<ArtProps> = ({ highlight }) => {
  const frame = useCurrentFrame();
  const lights = useMemo(() => { const g = rng(5); return Array.from({ length: 60 }, () => g() * 40); }, []);
  return (
    <g>
      <rect x={0} y={590} width={ART_W} height={110} fill="#101a2a" />
      <g style={glow(highlight === "power")}>
        {[110, 250].map((px, k) => (
          <g key={k}>
            <path d={`M${px} 590 L${px - 30} 590 L${px} 300 L${px + 30} 590 Z`} fill="none" stroke="#45597a" strokeWidth={5} />
            <line x1={px - 40} y1={320} x2={px + 40} y2={320} stroke="#45597a" strokeWidth={5} />
          </g>
        ))}
        <path d="M150 320 Q200 345 290 320 Q340 310 380 360" fill="none" stroke={C.accent} strokeWidth={4} strokeDasharray="14 12" strokeDashoffset={-frame * 3} />
      </g>
      <g style={glow(highlight === "building")}>
        <rect x={380} y={300} width={560} height={290} fill="#1b2d4a" stroke="#5aa9ff" strokeOpacity={0.5} strokeWidth={3} />
        {lights.map((ph, i) => {
          const col = i % 10, row = Math.floor(i / 10);
          const on = (frame + ph) % 40 < 26;
          return <rect key={i} x={405 + col * 52} y={325 + row * 42} width={34} height={18} rx={3} fill={on ? C.neutral : "#24375a"} opacity={on ? 0.9 : 1} />;
        })}
      </g>
      <g style={glow(highlight === "cooling")}>
        {[480, 660, 840].map((fx, k) => (
          <g key={k} transform={`translate(${fx} 275)`}>
            <rect x={-55} y={-20} width={110} height={45} fill="#2a3a52" />
            <g transform={`rotate(${frame * 12 + k * 30})`}>
              {[0, 90].map((a) => <rect key={a} x={-38} y={-5} width={76} height={10} rx={5} fill="#9aa4b8" transform={`rotate(${a})`} />)}
            </g>
          </g>
        ))}
        {Array.from({ length: 9 }, (_, i) => {
          const k = (frame * 0.015 + i / 9) % 1;
          const bx = 450 + (i % 3) * 180;
          return <path key={i} d={`M${bx} ${240 - k * 200} q15 -20 0 -40 q-15 -20 0 -40`} fill="none" stroke="#ff8a4d" strokeOpacity={0.55 * (1 - k)} strokeWidth={4} />;
        })}
      </g>
    </g>
  );
};

// ------------------------------------------------------------------ heat on a chip, radiated to space
export const HEAT_ANCHORS = { chip: [545, 360], radiator: [830, 300], space: [700, 90] } as const;
const HeatArt: React.FC<ArtProps> = ({ highlight }) => {
  const frame = useCurrentFrame();
  const D = useSceneDuration();
  const grow = seg(frame / D, 0.15, 0.7);
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.15);
  const panelH = 140 + 300 * grow;
  return (
    <g>
      <g style={glow(highlight === "space")}><Stars w={ART_W} h={ART_H} n={80} seed={11} /></g>
      {Array.from({ length: 5 }, (_, i) => {
        const k = (frame * 0.012 + i / 5) % 1;
        return <circle key={i} cx={500} cy={360} r={90 + k * 330} fill="none" stroke="#ff7a3d" strokeOpacity={0.5 * (1 - k)} strokeWidth={5} />;
      })}
      <g style={glow(highlight === "radiator")}>
        {[-1, 1].map((sd) => (
          <g key={sd}>
            <line x1={500 + sd * 95} y1={360} x2={500 + sd * 270} y2={360} stroke="#c4ccd8" strokeWidth={8} />
            <rect x={sd < 0 ? 110 : 770} y={360 - panelH / 2} width={120} height={panelH} rx={6} fill="#c25a35" opacity={0.85} />
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1={sd < 0 ? 125 + i * 13 : 785 + i * 13} y1={360 - panelH / 2 + 8} x2={sd < 0 ? 125 + i * 13 : 785 + i * 13} y2={360 + panelH / 2 - 8} stroke="#7a2f1a" strokeWidth={3} />
            ))}
          </g>
        ))}
      </g>
      <g style={glow(highlight === "chip")}>
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i} stroke="#9aa4b8" strokeWidth={6}>
            <line x1={440 + i * 20} y1={262} x2={440 + i * 20} y2={282} />
            <line x1={440 + i * 20} y1={438} x2={440 + i * 20} y2={458} />
          </g>
        ))}
        <rect x={410} y={280} width={180} height={160} rx={12} fill="#1b2d4a" stroke="#5aa9ff" strokeWidth={3} />
        <rect x={455} y={315} width={90} height={90} rx={8} fill={`rgb(255,${120 + 80 * (1 - pulse)},${50 + 40 * (1 - pulse)})`} />
      </g>
    </g>
  );
};

// ------------------------------------------------------------------ sunlight in a dawn-dusk orbit
export const SUNLIGHT_ANCHORS = { sun: [120, 350], earth: [600, 470], orbit: [600, 120] } as const;
const SunlightArt: React.FC<ArtProps> = ({ highlight }) => {
  const frame = useCurrentFrame();
  const th = frame * 0.03;
  const sx = 600 + 70 * Math.cos(th), sy = 350 + 250 * Math.sin(th);
  return (
    <g>
      <Stars w={ART_W} h={ART_H} n={70} seed={21} />
      <g style={glow(highlight === "sun")}>
        <circle cx={120} cy={350} r={80} fill={C.accent} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + frame * 0.01;
          return <line key={i} x1={120 + Math.cos(a) * 100} y1={350 + Math.sin(a) * 100} x2={120 + Math.cos(a) * 135} y2={350 + Math.sin(a) * 135} stroke={C.accent} strokeWidth={6} strokeLinecap="round" />;
        })}
      </g>
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={220} y1={200 + i * 60} x2={940} y2={200 + i * 60} stroke={C.accent} strokeOpacity={0.12} strokeWidth={3} strokeDasharray="20 18" strokeDashoffset={-frame * 4} />
      ))}
      <g style={glow(highlight === "earth")}>
        <circle cx={600} cy={350} r={160} fill="#1d4f8f" />
        <path d="M600 190 A160 160 0 0 1 600 510 Z" fill="#050b16" opacity={0.75} />
      </g>
      <g style={glow(highlight === "orbit")}>
        <ellipse cx={600} cy={350} rx={70} ry={250} fill="none" stroke={C.neutral} strokeWidth={3} strokeDasharray="10 8" />
        <g transform={`translate(${sx} ${sy})`}>
          <rect x={-28} y={-8} width={56} height={16} fill={C.accent} />
          <rect x={-7} y={-12} width={14} height={24} fill="#e9edf4" />
        </g>
      </g>
    </g>
  );
};

export const DIAGRAM_ART: Record<DiagramKind, { Art: React.FC<ArtProps>; anchors: Record<string, readonly [number, number]> }> = {
  satellite: { Art: SatelliteArt, anchors: SATELLITE_ANCHORS },
  datacenter: { Art: DataCenterArt, anchors: DATACENTER_ANCHORS },
  heat: { Art: HeatArt, anchors: HEAT_ANCHORS },
  sunlight: { Art: SunlightArt, anchors: SUNLIGHT_ANCHORS },
};
