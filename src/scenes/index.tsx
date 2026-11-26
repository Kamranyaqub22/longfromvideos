import type { Scene } from "../schema";
import { BarChart } from "./BarChart";
import { BigNumber } from "./BigNumber";
import { Bullets } from "./Bullets";
import { Chapter } from "./Chapter";
import { Drop } from "./Drop";
import { Headline } from "./Headline";
import { Hook } from "./Hook";
import { Outro } from "./Outro";
import { Quote } from "./Quote";
import { TimelineScene } from "./TimelineScene";

/** Exhaustive switch: adding a scene type to the schema without a renderer is a type error. */
export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  switch (scene.type) {
    case "hook": return <Hook scene={scene} />;
    case "headline": return <Headline scene={scene} />;
    case "bignumber": return <BigNumber scene={scene} />;
    case "barchart": return <BarChart scene={scene} />;
    case "drop": return <Drop scene={scene} />;
    case "timeline": return <TimelineScene scene={scene} />;
    case "quote": return <Quote scene={scene} />;
    case "bullets": return <Bullets scene={scene} />;
    case "chapter": return <Chapter scene={scene} />;
    case "outro": return <Outro scene={scene} />;
    default: {
      const never: never = scene;
      throw new Error(`Unknown scene type: ${JSON.stringify(never)}`);
    }
  }
};
