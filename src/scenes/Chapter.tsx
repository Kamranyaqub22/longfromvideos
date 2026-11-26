import type { SceneOf } from "../schema";
import { useEnter, useProgress } from "../components/anim";
import { C, body, display } from "../theme";

export const Chapter: React.FC<{ scene: SceneOf<"chapter"> }> = ({ scene }) => {
  const { number, title } = scene.props;
  const wipe = useProgress(0, 20);
  const e = useEnter(8);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: body, fontWeight: 800, fontSize: 40, letterSpacing: 12, color: C.accent }}>PART {number}</div>
      <div style={{ height: 6, width: 600 * wipe, background: C.accent, margin: "28px 0" }} />
      <div style={{ fontFamily: display, fontSize: title.length > 24 ? 120 : 150, color: C.text, textTransform: "uppercase", textAlign: "center", opacity: e, transform: `scale(${0.9 + 0.1 * e})` }}>
        {title}
      </div>
    </div>
  );
};
