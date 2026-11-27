import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Illustration } from "../schema";
import { useSceneDuration } from "../components/SceneContext";
import { C } from "../theme";
import { DIAGRAM_ART, ART_H, ART_W } from "./Diagrams";
import { Globe, dotsFor } from "./Globe";
import { RocketArt } from "./Rocket";
import { Stars } from "./common";

/** A full-frame illustration drawn behind a title card (hook, chapter, outro), dimmed so the text stays readable. */
export const Backdrop: React.FC<{ visual: Illustration }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const D = useSceneDuration();
  const t = Math.min(1, frame / D);
  // Absolute children are placed against the scene shell's padding box, i.e. the whole frame.
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        {visual === "globe" ? (
          <>
            <Stars w={1920} h={1080} n={150} />
            <Globe cx={1420} cy={560} r={420} dots={dotsFor(2000 + 300000 * t)} />
          </>
        ) : visual === "rocket" ? (
          <RocketArt x={1450} />
        ) : (
          <g transform={`translate(${1920 - ART_W * 1.35 - 40} ${(1080 - ART_H * 1.35) / 2}) scale(1.35)`}>
            {(() => {
              const { Art } = DIAGRAM_ART[visual];
              return <Art />;
            })()}
          </g>
        )}
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 50%, ${C.bg}ee 0%, ${C.bg}99 45%, transparent 75%)` }} />
    </div>
  );
};
