import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { Episode, EpisodeProps } from "./Episode";
import { Thumbnail } from "./Thumbnail";
import { FPS, HEIGHT, THUMB_SCENE_FRAMES, WIDTH, type ThumbnailProps, type Timeline } from "./schema";

/** The pipeline passes the timeline as input props; Studio falls back to fetching it by slug. */
const calculateMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const timeline: Timeline =
    props.timeline ?? (await fetch(staticFile(`episodes/${props.slug}/timeline.json`)).then((r) => r.json()));
  return {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
    props: { ...props, timeline },
  };
};

// No `bottom` here: Remotion merges defaultProps under inputProps, so a default would leak onto variants that omit it.
const thumbDefaults: ThumbnailProps = { layout: "number", top: "Thumbnail", big: "PREVIEW", tone: "accent" };

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={Episode}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={FPS}
      defaultProps={{ slug: "pipeline-fixture", timeline: null } as EpisodeProps}
      calculateMetadata={calculateMetadata}
    />
    {/* A short composition, not a <Still>: thumbnails with a drawing are rendered at a chosen frame (THUMB_FRAMES). */}
    <Composition id="Thumbnail" component={Thumbnail} width={1280} height={720} fps={FPS} durationInFrames={THUMB_SCENE_FRAMES} defaultProps={thumbDefaults} />
  </>
);
