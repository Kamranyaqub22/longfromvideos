import type { SceneOf } from "../schema";
import { useEnter, useProgress } from "../components/anim";
import { RocketArt } from "../illustrations/Rocket";
import { formatNumber } from "../lib/format";
import { C, body, display } from "../theme";
import { SourceNote, Title } from "./common";

/** A generic rocket launch on the right; an optional figure counts up in the left column. */
export const LaunchScene: React.FC<{ scene: SceneOf<"launch"> }> = ({ scene }) => {
  const { title, stat, note, source } = scene.props;
  const count = useProgress(10, 50);
  const e = useEnter(30);
  const hasText = !!(title || stat || note);
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <svg viewBox="0 0 1920 1080" width="100%" height="100%">
          <RocketArt x={hasText ? 1380 : 960} />
        </svg>
      </div>
      {hasText ? (
        <div style={{ position: "relative", width: 820, textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}>
          {title ? <Title size={58}>{title}</Title> : null}
          {stat ? (
            <>
              <div style={{ fontFamily: display, fontSize: 190, color: C.accent, lineHeight: 1 }}>
                {`${stat.prefix ?? ""}${formatNumber(stat.value * count, stat.decimals)}${stat.suffix ?? ""}`}
              </div>
              <div style={{ fontFamily: body, fontWeight: 800, fontSize: 44, color: C.text, marginTop: 16, opacity: e }}>{stat.label}</div>
            </>
          ) : null}
          {note ? <div style={{ fontFamily: body, fontSize: 28, color: C.dim, marginTop: 18, opacity: e }}>{note}</div> : null}
        </div>
      ) : null}
      <SourceNote>{source}</SourceNote>
    </>
  );
};
