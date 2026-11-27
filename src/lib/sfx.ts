import type { Timeline } from "../schema";

/**
 * Sound design: sparse, quiet cues on visual "events" (never under every cut, which gets tiring).
 * Effects are synthesized by `npm run sfx`, so we own them. Volumes put each cue ~10 dB under the narration (voice ≈ -19.5 LUFS raw, cues ≈ -29.5).
 */
export const SFX = { whoosh: { src: "sfx/whoosh.wav", volume: 0.2 }, impact: { src: "sfx/impact.wav", volume: 0.22 } } as const;

/** Which cue a scene gets, and at which frame of the scene it fires. */
export function sfxFor(s: Timeline["scenes"][number], index: number): { cue: keyof typeof SFX; at: number } | null {
  if (index === 0) return { cue: "impact", at: 4 }; // the hook's first line lands
  if (s.type === "chapter") return { cue: "whoosh", at: 0 }; // peaks as the chapter wipe opens
  if (s.type === "bignumber") return { cue: "impact", at: 36 }; // the count-up settles on frame 40
  return null;
}
