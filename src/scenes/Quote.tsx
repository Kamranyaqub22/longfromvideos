import { interpolate, useCurrentFrame } from "remotion";
import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { useEnter } from "../components/anim";
import { C, body, display } from "../theme";

export const Quote: React.FC<{ scene: SceneOf<"quote"> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const durationInFrames = useSceneDuration();
  const { text, author, role } = scene.props;
  const words = text.split(/\s+/);
  const shown = interpolate(frame, [6, durationInFrames * 0.7], [0, words.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = useEnter(10);
  return (
    <div style={{ maxWidth: 1500, alignSelf: "center" }}>
      <div style={{ fontFamily: display, fontSize: 220, color: C.accent, lineHeight: 0.6, opacity: e }}>“</div>
      <div style={{ fontFamily: body, fontWeight: 800, fontSize: text.length > 140 ? 54 : 66, lineHeight: 1.25, color: C.text }}>
        {words.map((w, i) => (
          <span key={i} style={{ opacity: i < shown ? 1 : 0.15 }}>
            {w}{" "}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: body, fontSize: 34, color: C.dim, marginTop: 36, opacity: e }}>
        — <b style={{ color: C.text }}>{author}</b>
        {role ? `, ${role}` : ""}
      </div>
    </div>
  );
};
