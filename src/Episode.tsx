import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import type { Timeline } from "./schema";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { Overlay } from "./components/Overlay";
import { SceneShell } from "./components/SceneShell";
import { SceneView } from "./scenes";

export type EpisodeProps = { slug: string; timeline: Timeline | null };

export const Episode: React.FC<EpisodeProps> = ({ timeline }) => {
  if (!timeline) throw new Error("Episode rendered without a timeline");
  return (
    <AbsoluteFill>
      <Background />
      {timeline.scenes.map((s, i) => (
        <Sequence key={i} from={s.startFrame} durationInFrames={s.durationInFrames} name={`${i + 1}-${s.type}`}>
          <SceneShell durationInFrames={s.durationInFrames}>
            <SceneView scene={s} />
          </SceneShell>
          <Captions words={s.words} />
          {timeline.mock ? null : <Audio src={staticFile(s.audio)} />}
        </Sequence>
      ))}
      <Overlay timeline={timeline} />
    </AbsoluteFill>
  );
};
