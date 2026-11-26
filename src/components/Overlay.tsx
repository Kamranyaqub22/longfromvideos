import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline } from "../schema";
import { chapterAtFrame } from "../lib/time";
import { C, body } from "../theme";

/** Chapter tag (top-left) and progress bar (bottom). */
export const Overlay: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const chapter = chapterAtFrame(timeline, frame);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 56,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: C.dim,
            borderLeft: `4px solid ${C.accent}`,
            paddingLeft: 14,
          }}
        >
          {chapter}
        </div>
      ) : null}
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 6, width: `${(frame / durationInFrames) * 100}%`, background: C.accent }} />
    </AbsoluteFill>
  );
};
