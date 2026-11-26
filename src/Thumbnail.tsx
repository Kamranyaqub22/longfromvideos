import { AbsoluteFill } from "remotion";
import type { ThumbnailProps } from "./schema";
import { Background } from "./components/Background";
import { C, display, toneColor } from "./theme";

/** 1280x720 thumbnail. Two layouts so variants can be A/B tested on YouTube. */
export const Thumbnail: React.FC<ThumbnailProps> = (p) => (
  <AbsoluteFill>
    <Background />
    {p.layout === "statement" ? <Statement {...p} /> : <BigNumber {...p} />}
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
