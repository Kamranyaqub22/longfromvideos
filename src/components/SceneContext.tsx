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

/** True inside the video's opening scene, which must show content from frame 0. */
const FirstScene = createContext(false);
export const FirstSceneProvider = FirstScene.Provider;
export const useIsFirstScene = () => useContext(FirstScene);
