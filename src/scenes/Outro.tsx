import type { SceneOf } from "../schema";
import { useEnter } from "../components/anim";
import { C, body, display } from "../theme";
import { Backdrop } from "../illustrations/Backdrop";

export const Outro: React.FC<{ scene: SceneOf<"outro"> }> = ({ scene }) => {
  const { title, cta = "Subscribe for the stories behind the headlines", visual } = scene.props;
  const e = useEnter(4);
  const b = useEnter(24, 12);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {visual ? <Backdrop visual={visual} /> : null}
      <div style={{ position: "relative", fontFamily: display, fontSize: 130, color: C.text, textTransform: "uppercase", opacity: e }}>{title}</div>
      <div style={{ position: "relative", marginTop: 50, fontFamily: body, fontWeight: 800, fontSize: 44, color: C.bg, background: C.accent, padding: "22px 48px", borderRadius: 999, transform: `scale(${b})` }}>
        {cta}
      </div>
    </div>
  );
};
