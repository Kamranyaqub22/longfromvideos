import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "../schema";
import { groupWords, phraseAt } from "../lib/captions";
import { C, body } from "../theme";

/** Word-synced captions; the word being spoken is highlighted. */
export const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phrases = useMemo(() => groupWords(words), [words]);
  const t = frame / fps;
  const p = phraseAt(phrases, t);
  if (!p) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
      <div
        style={{
          fontFamily: body,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: 1.2,
          color: C.text,
          background: "rgba(0,0,0,0.55)",
          padding: "14px 30px",
          borderRadius: 18,
          maxWidth: 1500,
          textAlign: "center",
          textShadow: "0 3px 10px rgba(0,0,0,0.6)",
        }}
      >
        {p.words.map((w, i) => (
          <span key={i} style={{ color: t >= w.start && t < w.end + 0.05 ? C.accent : C.text }}>
            {w.text}
            {i < p.words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
