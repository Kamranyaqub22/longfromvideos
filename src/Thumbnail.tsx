import { AbsoluteFill } from "remotion";
import type { ThumbnailProps } from "./schema";
import { Background } from "./components/Background";
import { C, display, toneColor } from "./theme";

/** 1280x720 thumbnail: three short lines, the middle one huge. Readable at phone size. */
export const Thumbnail: React.FC<ThumbnailProps> = ({ top, big, bottom, tone = "down" }) => (
  <AbsoluteFill>
    <Background />
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: 50 }}>
      <div style={{ fontFamily: display, fontSize: 92, color: C.text, textTransform: "uppercase", lineHeight: 1 }}>{top}</div>
      <div
        style={{
          fontFamily: display,
          fontSize: big.length > 7 ? 230 : 300,
          color: toneColor(tone),
          lineHeight: 1,
          textShadow: "0 12px 40px rgba(0,0,0,0.7)",
        }}
      >
        {big}
      </div>
      {bottom ? (
        <div style={{ fontFamily: display, fontSize: 80, color: C.bg, background: C.accent, padding: "4px 28px", textTransform: "uppercase", lineHeight: 1.1 }}>
          {bottom}
        </div>
      ) : null}
    </AbsoluteFill>
  </AbsoluteFill>
);
