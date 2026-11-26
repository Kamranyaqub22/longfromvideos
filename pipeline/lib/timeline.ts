import { FPS, HEIGHT, WIDTH, type Script, type Timeline } from "../../src/schema";
import { Issues } from "./issues";
import type { Voiced } from "./voice";

/** Breathing room after each scene's narration, in seconds. */
export const TAIL = { default: 0.45, chapter: 0.8, hook: 0.3, outro: 1.5 } as const;
export const MIN_SCENE_SECONDS = 2;

export function buildTimeline(script: Script, voiced: Voiced[], mock: boolean, scriptHash: string): Timeline {
  if (voiced.length !== script.scenes.length) throw new Error("voice/scenes length mismatch");
  let cursor = 0;
  const scenes = script.scenes.map((s, i) => {
    const v = voiced[i];
    const tail = TAIL[s.type as keyof typeof TAIL] ?? TAIL.default;
    const seconds = Math.max(MIN_SCENE_SECONDS, v.duration + tail);
    const durationInFrames = Math.ceil(seconds * FPS);
    const timed = { ...s, audio: v.audio ?? "", startFrame: cursor, durationInFrames, words: v.words };
    cursor += durationInFrames;
    return timed;
  });
  return { slug: script.slug, title: script.title, fps: FPS, width: WIDTH, height: HEIGHT, durationInFrames: cursor, mock, scriptHash, scenes };
}

/** Structural invariants every timeline must satisfy before rendering. */
export function checkTimeline(t: Timeline): Issues {
  const issues = new Issues();
  let expected = 0;
  t.scenes.forEach((s, i) => {
    const w = `timeline scene ${i + 1}`;
    if (s.startFrame !== expected) issues.error(w, `starts at frame ${s.startFrame}, expected ${expected} (gap/overlap)`);
    if (s.durationInFrames < MIN_SCENE_SECONDS * t.fps) issues.error(w, "shorter than minimum scene length");
    if (!t.mock && !s.audio) issues.error(w, "no audio file");
    if (s.words.length === 0) issues.error(w, "no word timings (captions would be empty)");
    const secs = s.durationInFrames / t.fps;
    s.words.forEach((wd, k) => {
      if (wd.end < wd.start) issues.error(w, `word "${wd.text}" ends before it starts`);
      if (wd.end > secs) issues.error(w, `word "${wd.text}" ends after the scene`);
      if (k && wd.start + 1e-6 < s.words[k - 1].start) issues.error(w, `word "${wd.text}" is out of order`);
    });
    expected += s.durationInFrames;
  });
  if (expected !== t.durationInFrames) issues.error("timeline", `total ${t.durationInFrames} != sum of scenes ${expected}`);
  return issues;
}
