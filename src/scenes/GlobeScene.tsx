import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { SceneOf } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { useEnter } from "../components/anim";
import { Globe, dotsFor } from "../illustrations/Globe";
import { Stars } from "../illustrations/common";
import { formatNumber } from "../lib/format";
import { C, body, display } from "../theme";
import { SourceNote, Title } from "./common";

/** Turning Earth with a growing satellite swarm and an optional counter; text sits in the left column. */
export const GlobeScene: React.FC<{ scene: SceneOf<"globe"> }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const D = useSceneDuration();
  const { title, satellites, rings, highlights, note, source } = scene.props;
  const e = useEnter(10);
  const value = satellites
    ? interpolate(frame, [0.08 * D, 0.7 * D], [satellites.from, satellites.to], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      })
    : 0;
  const hasText = !!(title || (satellites && (satellites.counter || satellites.label)) || note);
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <svg viewBox="0 0 1920 1080" width="100%" height="100%">
          <Stars w={1920} h={1080} n={170} />
          <Globe cx={hasText ? 1340 : 960} cy={520} r={hasText ? 360 : 400} dots={dotsFor(value)} rings={rings} highlights={highlights} />
        </svg>
      </div>
      {hasText ? (
        <div style={{ position: "relative", width: 760 }}>
          {title ? <Title size={58}>{title}</Title> : null}
          {satellites?.counter ? (
            <div style={{ fontFamily: display, fontSize: 170, color: C.accent, lineHeight: 1 }}>{formatNumber(Math.round(value))}</div>
          ) : null}
          {satellites?.label ? <div style={{ fontFamily: body, fontWeight: 800, fontSize: 44, color: C.text, marginTop: 16, opacity: e }}>{satellites.label}</div> : null}
          {note ? <div style={{ fontFamily: body, fontSize: 28, color: C.dim, marginTop: 18, opacity: e }}>{note}</div> : null}
        </div>
      ) : null}
      <SourceNote>{source}</SourceNote>
    </>
  );
};
