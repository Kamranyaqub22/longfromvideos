import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { useEnter, staggerFrame } from "../components/anim";
import { C, display } from "../theme";

const Line: React.FC<{ text: string; accent?: string; delay: number; size: number }> = ({ text, accent, delay, size }) => {
  const e = useEnter(delay, 14);
  const isAccent = accent && text.toUpperCase().includes(accent.toUpperCase());
  return (
    <div
      style={{
        fontFamily: display,
        fontSize: size,
        lineHeight: 1.02,
        textTransform: "uppercase",
        color: isAccent ? C.accent : C.text,
        opacity: Math.min(1, e * 1.5),
        transform: `translateY(${(1 - e) * 60}px) scale(${0.9 + e * 0.1})`,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
};

export const Hook: React.FC<{ scene: SceneOf<"hook"> }> = ({ scene }) => {
  const durationInFrames = useSceneDuration();
  const { lines, accent } = scene.props;
  const longest = Math.max(...lines.map((l) => l.length));
  // Anton uppercase ≈ 0.5em per char; fit 1640px, cap at 170px.
  const size = Math.min(170, Math.floor(1640 / (longest * 0.5)), lines.length > 3 ? 130 : 170);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {lines.map((l, i) => (
        <Line key={i} text={l} accent={accent} size={size} delay={staggerFrame(i, lines.length, durationInFrames, 0.6)} />
      ))}
    </div>
  );
};
