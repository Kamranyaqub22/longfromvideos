import type { SceneOf } from "../schema";
import { useEnter, useProgress } from "../components/anim";
import { formatNumber } from "../lib/format";
import { C, body, display, toneColor } from "../theme";

export const BigNumber: React.FC<{ scene: SceneOf<"bignumber"> }> = ({ scene }) => {
  const { value, prefix = "", suffix = "", decimals, label, tone, note } = scene.props;
  const count = useProgress(4, 40);
  const e = useEnter(30);
  const text = `${prefix}${formatNumber(value * count, decimals)}${suffix}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontFamily: display, fontSize: text.length > 9 ? 230 : 300, color: toneColor(tone), lineHeight: 1 }}>{text}</div>
      <div style={{ fontFamily: body, fontWeight: 800, fontSize: 56, color: C.text, marginTop: 20, opacity: e, maxWidth: 1500 }}>{label}</div>
      {note ? <div style={{ fontFamily: body, fontSize: 30, color: C.dim, marginTop: 18, opacity: e }}>{note}</div> : null}
    </div>
  );
};
