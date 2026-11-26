import { CalculateMetadataFunction, Composition, Still, staticFile } from "remotion";
import { Episode, EpisodeProps } from "./Episode";
import { Thumbnail } from "./Thumbnail";
import { FPS, HEIGHT, WIDTH, type ThumbnailProps, type Timeline } from "./schema";

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

const thumbDefaults: ThumbnailProps = { layout: "number", top: "Thumbnail", big: "PREVIEW", bottom: "edit in script.json", tone: "accent" };

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
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={thumbDefaults} />
  </>
);
