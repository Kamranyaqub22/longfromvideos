import { useCurrentFrame } from "remotion";
import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { staggerFrame } from "../components/anim";
import { ART_H, DIAGRAM_ART } from "../illustrations/Diagrams";
import { C, body } from "../theme";
import { SourceNote, Title } from "./common";

const BOX_W = 1640, BOX_H = 720; // the scene's content area
const ART_SCALE = 0.98;
const CARD_X = 1060, CARD_W = 560;
const ELBOW_X = 1010; // leader lines turn just right of the drawing, so they never cross it

/** A code-drawn object; its labelled parts light up one by one, each with a callout card on the right. */
export const DiagramScene: React.FC<{ scene: SceneOf<"diagram"> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const D = useSceneDuration();
  const { title, illustration, callouts, source } = scene.props;
  const { Art, anchors } = DIAGRAM_ART[illustration];
  const n = callouts.length;
  const starts = callouts.map((_, i) => staggerFrame(i, n, D, 0.7, Math.round(0.12 * D)));
  const active = starts.reduce((a, s, i) => (frame >= s ? i : a), -1);
  const H = title ? BOX_H - 110 : BOX_H;
  const top = (H - ART_H * ART_SCALE) / 2;
  const cardGap = H / Math.max(n, 1);
  return (
    <>
      {title ? <Title size={58}>{title}</Title> : null}
      <div style={{ position: "relative", width: BOX_W, height: H }}>
        <svg viewBox={`0 0 ${BOX_W} ${H}`} width={BOX_W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g transform={`translate(0 ${top}) scale(${ART_SCALE})`}>
            <Art highlight={active >= 0 ? callouts[active].part : undefined} />
          </g>
          {callouts.map((c, i) => {
            const k = Math.max(0, Math.min(1, (frame - starts[i]) / 12));
            if (k <= 0) return null;
            const [ax, ay] = anchors[c.part];
            const x0 = ax * ART_SCALE, y0 = top + ay * ART_SCALE;
            const y1 = cardGap * (i + 0.5);
            const x1 = x0 + (CARD_X - 12 - x0) * k;
            const ex = Math.max(x0 + 20, ELBOW_X), yk = y0 + (y1 - y0) * k;
            return (
              <g key={i} opacity={i === active ? 1 : 0.7}>
                <circle cx={x0} cy={y0} r={10} fill={C.accent} />
                <polyline points={`${x0},${y0} ${ex},${y0} ${ex + 24},${yk} ${Math.max(ex + 24, x1)},${yk}`} fill="none" stroke={C.accent} strokeWidth={3} />
              </g>
            );
          })}
        </svg>
        {callouts.map((c, i) => {
          const k = Math.max(0, Math.min(1, (frame - starts[i] - 6) / 12));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: CARD_X,
                top: cardGap * (i + 0.5),
                width: CARD_W,
                transform: `translate(${(1 - k) * 40}px, -50%)`,
                opacity: k * (i === active ? 1 : 0.75),
                fontFamily: body,
                fontWeight: 800,
                fontSize: 36,
                lineHeight: 1.2,
                color: C.text,
                background: C.panel,
                borderLeft: `6px solid ${i === active ? C.accent : C.line}`,
                padding: "16px 22px",
                borderRadius: 8,
              }}
            >
              {c.text}
            </div>
          );
        })}
      </div>
      <SourceNote>{source}</SourceNote>
    </>
  );
};
