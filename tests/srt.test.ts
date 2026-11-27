import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSrt } from "../pipeline/lib/srt";

const toSec = (s: string) => { const [h, m, rest] = s.split(":"); const [sec, ms] = rest.split(","); return +h * 3600 + +m * 60 + +sec + +ms / 1000; };

test("subtitles are numbered, in order, never overlap, and fit the video", () => {
  const t = JSON.parse(readFileSync("public/episodes/voice-smoke/timeline.json", "utf8"));
  const cues = buildSrt(t).trim().split("\n\n").map((b) => b.split("\n"));
  assert.ok(cues.length > 0);
  let prevEnd = 0;
  cues.forEach((c, i) => {
    assert.equal(c[0], String(i + 1));
    const [a, b] = c[1].split(" --> ").map(toSec);
    assert.ok(b > a, `cue ${i + 1} has no duration`);
    assert.ok(a >= prevEnd - 1e-6, `cue ${i + 1} overlaps the previous one`);
    assert.ok(c[2].trim().length > 0);
    prevEnd = b;
  });
  assert.ok(prevEnd <= t.durationInFrames / t.fps + 1, "subtitles run past the end of the video");
});
