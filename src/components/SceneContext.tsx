import { createContext, useContext } from "react";

/**
 * Length of the current scene in frames.
 * Needed because useVideoConfig().durationInFrames inside a <Sequence> is the WHOLE video's length.
 */
const SceneDuration = createContext<number | null>(null);
export const SceneDurationProvider = SceneDuration.Provider;

export function useSceneDuration(): number {
  const d = useContext(SceneDuration);
  if (d === null) throw new Error("useSceneDuration() used outside a scene");
  return d;
}
