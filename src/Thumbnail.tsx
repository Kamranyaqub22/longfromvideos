import { AbsoluteFill } from "remotion";
import { THUMB_SCENE_FRAMES, type Illustration, type ThumbnailProps } from "./schema";
import { Background } from "./components/Background";
import { SceneDurationProvider } from "./components/SceneContext";
import { DIAGRAM_ART, ART_H, ART_W } from "./illustrations/Diagrams";
import { Globe } from "./illustrations/Globe";
import { RocketArt } from "./illustrations/Rocket";
import { Stars } from "./illustrations/common";
import { C, display, toneColor } from "./theme";

/** 1280x720 thumbnail. Two layouts so variants can be A/B tested on YouTube. */
export const Thumbnail: React.FC<ThumbnailProps> = (p) => (
  <AbsoluteFill>
    <Background />
    {p.visual ? <Visual {...p} visual={p.visual} /> : p.layout === "statement" ? <Statement {...p} /> : <BigNumber {...p} />}
  </AbsoluteFill>
);

/** The drawing; the pipeline renders this composition at the frame in THUMB_FRAMES for each drawing. */
const ThumbArt: React.FC<{ visual: Illustration }> = ({ visual }) => {
  let art: React.ReactNode;
  if (visual === "globe") {
    art = (
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor={C.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        <Stars w={1280} h={720} n={120} />
        <circle cx={890} cy={380} r={470} fill="url(#halo)" />
        <Globe cx={890} cy={380} r={300} dots={1800} dotR={3.2} />
      </svg>
    );
  } else if (visual === "rocket") {
    art = (
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <g transform="translate(1400 380) scale(1.7) translate(-1400 -560)">
          <RocketArt x={1400} />
        </g>
      </svg>
    );
  } else {
    const { Art } = DIAGRAM_ART[visual];
    const k = 1.05;
    art = (
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <Stars w={1280} h={720} n={120} />
        <g transform={`translate(${1280 - ART_W * k + 60} ${(720 - ART_H * k) / 2}) scale(${k})`}>
          <Art highlight={visual === "satellite" ? "radiator" : undefined} />
        </g>
      </svg>
    );
  }
  return (
    <SceneDurationProvider value={THUMB_SCENE_FRAMES}>
      <AbsoluteFill>{art}</AbsoluteFill>
    </SceneDurationProvider>
  );
};

/** Big picture on the right, 2–3 huge words on the left over a dark fade. */
const Visual: React.FC<ThumbnailProps & { visual: Illustration }> = ({ top, big, bottom, tone, visual }) => (
  <AbsoluteFill>
    <ThumbArt visual={visual} />
    <AbsoluteFill style={{ background: `linear-gradient(90deg, ${C.bg} 0%, ${C.bg}e6 30%, ${C.bg}00 62%)` }} />
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 50px", gap: 6 }}>
      <div style={{ fontFamily: display, fontSize: top.length > 16 ? 84 : 104, color: C.text, textTransform: "uppercase", lineHeight: 0.95, maxWidth: 680, textShadow: "0 8px 30px rgba(0,0,0,0.8)" }}>
        {top}
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: big.length > 8 ? 150 : 190,
          color: toneColor(tone),
          lineHeight: 1,
          WebkitTextStroke: `4px ${C.bg}`,
          paintOrder: "stroke fill",
          textShadow: "0 10px 40px rgba(0,0,0,0.85)",
          maxWidth: 760,
        }}
      >
        {big}
      </div>
      {bottom ? (
        <div style={{ alignSelf: "flex-start", fontFamily: display, fontSize: 58, color: C.bg, background: C.accent, padding: "2px 20px", textTransform: "uppercase", lineHeight: 1.15 }}>
          {bottom}
        </div>
      ) : null}
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Three short lines, the middle one huge. */
const BigNumber: React.FC<ThumbnailProps> = ({ top, big, bottom, tone }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 50 }}>
    <div style={{ fontFamily: display, fontSize: 92, color: C.text, textTransform: "uppercase", lineHeight: 1 }}>{top}</div>
    <div style={{ fontFamily: display, fontSize: big.length > 7 ? 230 : 300, color: toneColor(tone), lineHeight: 1, textShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
      {big}
    </div>
    {bottom ? (
      <div style={{ fontFamily: display, fontSize: 80, color: C.bg, background: C.accent, padding: "4px 28px", textTransform: "uppercase", lineHeight: 1.1 }}>
        {bottom}
      </div>
    ) : null}
  </AbsoluteFill>
);

/** Huge headline on the left, a coloured badge, and a big arrow showing direction. */
const Statement: React.FC<ThumbnailProps> = ({ top, big, bottom, tone }) => {
  const color = toneColor(tone);
  // SVG, not a ▲ glyph: the bundled fonts are Latin-only, so a glyph could render as a box.
  const arrow = tone === "up" || tone === "down" ? (
    <svg width={260} height={300} viewBox="0 0 26 30" style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.7))", transform: tone === "down" ? "rotate(180deg)" : undefined }}>
      <path d="M13 0 L26 14 H18 V30 H8 V14 H0 Z" fill={color} />
    </svg>
  ) : null;
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 60px", gap: 30 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
        <div style={{ fontFamily: display, fontSize: top.length > 18 ? 120 : 150, color: C.text, textTransform: "uppercase", lineHeight: 0.98, textShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
          {top}
        </div>
        <div style={{ fontFamily: display, fontSize: 110, color: C.bg, background: color, padding: "0 26px", textTransform: "uppercase", lineHeight: 1.15 }}>{big}</div>
        {bottom ? <div style={{ fontFamily: display, fontSize: 60, color: C.accent, textTransform: "uppercase" }}>{bottom}</div> : null}
      </div>
      {arrow}
    </AbsoluteFill>
  );
};
