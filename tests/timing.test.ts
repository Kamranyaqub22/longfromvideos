import assert from "node:assert/strict";
import { test } from "node:test";
import { FPS } from "../src/schema";
import { groupWords, phraseAt } from "../src/lib/captions";
import { chaptersFromTimeline, checkChapters, formatTimestamp } from "../src/lib/time";
import { buildTimeline, checkTimeline } from "../pipeline/lib/timeline";
import { alignmentToWords, cacheKey, mockWords } from "../pipeline/lib/voice";
import { buildDescription } from "../pipeline/lib/describe";
import { fixture } from "./helpers";

test("alignmentToWords splits characters into timed words", () => {
  const text = "Hi there, world";
  const chars = [...text];
  const starts = chars.map((_, i) => i * 0.1);
  const ends = chars.map((_, i) => i * 0.1 + 0.08);
  const w = alignmentToWords({ characters: chars, character_start_times_seconds: starts, character_end_times_seconds: ends });
  assert.deepEqual(w.map((x) => x.text), ["Hi", "there,", "world"]);
  assert.ok(Math.abs(w[1].start - 0.3) < 1e-9);
  assert.ok(Math.abs(w[2].end - 1.48) < 1e-9);
});

test("cache key changes with text and voice settings", () => {
  const v = { voiceId: "a", modelId: "m", stability: 0.5, similarity: 0.8, style: 0, speed: 1 };
  assert.equal(cacheKey("x", v), cacheKey("x", { ...v }));
  assert.notEqual(cacheKey("x", v), cacheKey("y", v));
  assert.notEqual(cacheKey("x", v), cacheKey("x", { ...v, speed: 1.1 }));
  const reordered = { speed: 1, style: 0, similarity: 0.8, stability: 0.5, modelId: "m", voiceId: "a" };
  assert.equal(cacheKey("x", v), cacheKey("x", reordered), "key must not depend on key order");
});

test("captions break on punctuation and length", () => {
  const words = "One two three four five six seven. Eight nine".split(" ").map((t, i) => ({ text: t, start: i, end: i + 0.9 }));
  const p = groupWords(words);
  assert.deepEqual(p.map((x) => x.words.map((w) => w.text).join(" ")), ["One two three four five six", "seven.", "Eight nine"]);
  assert.equal(phraseAt(p, 0.5)?.words[0].text, "One");
  assert.equal(phraseAt(p, 100), null);
});

test("timeline is contiguous, frame-accurate and passes invariants", () => {
  const { script } = fixture();
  const voiced = script.scenes.map((s) => mockWords(s.narration));
  const t = buildTimeline(script, voiced, true, "h");
  assert.equal(checkTimeline(t).errors.length, 0);
  t.scenes.forEach((s, i) => {
    assert.ok(s.durationInFrames / FPS >= voiced[i].duration, "scene shorter than its narration");
    if (i) assert.equal(s.startFrame, t.scenes[i - 1].startFrame + t.scenes[i - 1].durationInFrames);
  });
  t.scenes[2].startFrame += 1;
  assert.ok(checkTimeline(t).errors.length > 0, "gap must be detected");
});

test("timestamps and YouTube chapter rules", () => {
  assert.equal(formatTimestamp(0), "00:00");
  assert.equal(formatTimestamp(75.9), "01:15");
  assert.equal(formatTimestamp(3725), "1:02:05");
  assert.deepEqual(checkChapters([{ title: "a", startSeconds: 0 }, { title: "b", startSeconds: 20 }, { title: "c", startSeconds: 40 }], 60), []);
  assert.match(checkChapters([{ title: "a", startSeconds: 0 }, { title: "b", startSeconds: 5 }], 60).join(), /at least 3.*shorter than 10s/);
});

test("description has chapters from 00:00, only cited sources, disclaimer, no angle brackets", () => {
  const { script, research } = fixture();
  const t = buildTimeline(script, script.scenes.map((s) => mockWords(s.narration)), true, "h");
  const d = buildDescription(script, research, t);
  assert.match(d, /Chapters:\n00:00 Intro/);
  assert.deepEqual(chaptersFromTimeline(t).map((c) => c.title), ["Intro", "The spending", "Supply chain", "What to watch"]);
  assert.match(d, /example\.org\/times2/);
  assert.match(d, /not financial or investment advice/);
  assert.doesNotMatch(d, /[<>]/);
  assert.ok(d.length <= 5000);
});

test("map geography: mainland framing, centring and anchors", async () => {
  const { anchor, centreLongitude, getCountry, mainland } = await import("../src/lib/geo");
  const { geoBounds } = await import("d3-geo");
  // France's mainland excludes French Guiana (lon ≈ -53).
  const [[west]] = geoBounds(mainland(getCountry("France")));
  assert.ok(west > -10, `France mainland west edge ${west}`);
  // US anchor sits in the contiguous states, not pulled toward Alaska/Hawaii.
  const [lon, lat] = anchor(getCountry("USA"));
  assert.ok(lon > -110 && lon < -85 && lat > 30 && lat < 45, `US anchor ${lon},${lat}`);
  // US + East Asia centres on the Pacific; Europe stays near 0.
  assert.ok(Math.abs(centreLongitude([[-98, 39], [121, 24], [128, 36]])) > 120);
  assert.ok(Math.abs(centreLongitude([[2, 46], [10, 51]])) < 15);
});

test("description compacts sources to fit YouTube's limit and overflows to a pinned comment", async () => {
  const { buildSourcesComment, DESCRIPTION_LIMIT, MORE_SOURCES } = await import("../pipeline/lib/describe");
  const { script, research } = fixture();
  const t = buildTimeline(script, script.scenes.map((s) => mockWords(s.narration)), true, "h");
  assert.equal(buildSourcesComment(script, research, buildDescription(script, research, t)), null, "small episodes list everything");
  const f = research.facts.find((x) => script.scenes.some((s) => s.facts.includes(x.id)))!;
  f.sources = Array.from({ length: 60 }, (_, i) => ({ outlet: `Outlet ${i}`, url: `https://example.com/${"x".repeat(60)}/${i}`, date: "2026-01-01" }));
  const d = buildDescription(script, research, t);
  assert.ok(d.length <= DESCRIPTION_LIMIT, `description is ${d.length} chars`);
  assert.match(d, new RegExp(MORE_SOURCES.replace(/[.]/g, "\\.")));
  assert.match(d, /Outlet 0:/, "each fact keeps its first source");
  const comment = buildSourcesComment(script, research, d)!;
  assert.match(comment, /Outlet 59 \(2026-01-01\)/, "pinned comment has the full list");
});
