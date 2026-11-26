import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SceneDurationProvider } from "./SceneContext";
import { useEnter } from "./anim";

/**
 * Wraps every scene: fade/slide in, fade out, and a slow push-in so the frame keeps moving.
 * Content area leaves the bottom 220px free for captions.
 */
export const SceneShell: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const push = interpolate(frame, [0, durationInFrames], [1, 1.04]);
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(enter, out),
        transform: `translateY(${(1 - enter) * 40}px) scale(${push})`,
        padding: "110px 140px 220px",
        justifyContent: "center",
      }}
    >
      <SceneDurationProvider value={durationInFrames}>{children}</SceneDurationProvider>
    </AbsoluteFill>
  );
};
