import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** 0 → 1 spring starting at `delay` frames. */
export function useEnter(delay = 0, damping = 200) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
}

/** Eased 0 → 1 progress between two frames (clamped). */
export function useProgress(from: number, to: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

/** Spread n items over the first `share` of a scene: returns the start frame of item i. */
export function staggerFrame(i: number, n: number, durationInFrames: number, share = 0.75, lead = 6) {
  if (n <= 1) return lead;
  return Math.round(lead + (i / (n - 1)) * (durationInFrames * share - lead));
}
