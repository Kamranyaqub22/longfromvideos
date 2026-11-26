import type { SceneOf } from "../schema";
import { useEnter, useProgress } from "../components/anim";
import { formatPct } from "../lib/format";
import { C, body, display } from "../theme";
import { SourceNote, Title } from "./common";

/** Two-point move: draws only the start and end values it was given (no invented data in between). */
export const Drop: React.FC<{ scene: SceneOf<"drop"> }> = ({ scene }) => {
  const { title, fromLabel, toLabel, pct, note, source } = scene.props;
  const down = pct < 0;
  const color = down ? C.down : C.up;
  const draw = useProgress(10, 50);
  const e = useEnter(45);
  const W = 1100, H = 400;
  // Whole numbers read cleaner without ".0"; long values shrink so they never run off the frame.
  const label = formatPct(pct, Number.isInteger(pct) ? 0 : 1);
  const fontSize = Math.min(190, Math.floor((190 * 5) / label.length));
  const y0 = down ? 40 : H - 40, y1 = down ? H - 40 : 40;
  const x = 40 + (W - 80) * draw, y = y0 + (y1 - y0) * draw;
  return (
    <>
      <Title>{title}</Title>
      <div style={{ display: "flex", alignItems: "center", gap: 70 }}>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          <line x1={40} y1={y0} x2={x} y2={y} stroke={color} strokeWidth={10} strokeLinecap="round" />
          <circle cx={40} cy={y0} r={14} fill={C.text} />
          <circle cx={x} cy={y} r={16} fill={color} />
          <text x={40} y={down ? y0 - 30 : y0 + 50} fill={C.dim} fontFamily={body} fontSize={30} fontWeight={600}>{fromLabel}</text>
          <text x={W - 40} y={down ? y1 + 55 : y1 - 30} fill={C.dim} fontFamily={body} fontSize={30} fontWeight={600} textAnchor="end" opacity={e}>{toLabel}</text>
        </svg>
        <div style={{ fontFamily: display, fontSize, whiteSpace: "nowrap", color, opacity: e, transform: `scale(${0.8 + e * 0.2})` }}>{label}</div>
      </div>
      {note ? <div style={{ fontFamily: body, fontSize: 34, color: C.text, marginTop: 30, opacity: e }}>{note}</div> : null}
      <SourceNote>{source}</SourceNote>
    </>
  );
};
