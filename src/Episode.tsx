import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import type { Timeline } from "./schema";
import { Background } from "./components/Background";
import { Captions } from "./components/Captions";
import { Overlay } from "./components/Overlay";
import { SceneShell } from "./components/SceneShell";
import { SceneView } from "./scenes";
import { SFX, sfxFor } from "./lib/sfx";

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
          <SceneSfx scene={s} index={i} />
        </Sequence>
      ))}
      <Overlay timeline={timeline} />
    </AbsoluteFill>
  );
};

const SceneSfx: React.FC<{ scene: Timeline["scenes"][number]; index: number }> = ({ scene, index }) => {
  const cue = sfxFor(scene, index);
  if (!cue) return null;
  const { src, volume } = SFX[cue.cue];
  return (
    <Sequence from={cue.at} layout="none" name={`sfx-${cue.cue}`}>
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
};
