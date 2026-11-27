import assert from "node:assert/strict";
import { test } from "node:test";
import { Script } from "../src/schema";
import { lintEpisode } from "../pipeline/lib/lint";
import { clone, fixture, msgs, sceneOf } from "./helpers";

const today = new Date();
const lint = (s: ReturnType<typeof fixture>["script"], r: ReturnType<typeof fixture>["research"]) => lintEpisode(s.slug, s, r, today).list;

test("fixture passes with no errors", () => {
  const { script, research } = fixture();
  assert.equal(msgs(lint(script, research), "error"), "");
});

test("schema rejects text that would overflow the layout", () => {
  const { script } = fixture();
  const bad = clone(script) as any;
  bad.scenes[0].props.lines = ["THIS LINE IS FAR TOO LONG TO FIT ON SCREEN"];
  assert.equal(Script.safeParse(bad).success, false);
});

test("schema rejects titles over YouTube's 100 characters", () => {
  const bad = clone(fixture().script) as any;
  bad.title = "x".repeat(101);
  assert.equal(Script.safeParse(bad).success, false);
});

test("a number in narration without a cited fact is an error", () => {
  const { script, research } = fixture();
  sceneOf(script, "chapter").narration = "Part two. Spending rose 40 percent.";
  assert.match(msgs(lint(script, research), "error"), /number but cites no facts/);
});

test("data scenes must cite facts", () => {
  const { script, research } = fixture();
  sceneOf(script, "bignumber").facts = [];
  assert.match(msgs(lint(script, research), "error"), /must cite facts/);
});

test("unknown fact ids are errors", () => {
  const { script, research } = fixture();
  sceneOf(script, "headline").facts = ["f99"];
  assert.match(msgs(lint(script, research), "error"), /unknown fact "f99"/);
});

test("'verified' needs two independent outlets", () => {
  const { script, research } = fixture();
  research.facts[0].sources = [research.facts[0].sources[0]];
  assert.match(msgs(lint(script, research), "error"), /marked verified but has 1/);
});

test("disputed facts need attribution in narration", () => {
  const { script, research } = fixture();
  research.facts[0].status = "disputed";
  assert.match(msgs(lint(script, research), "error"), /disputed fact f1 without attribution/);
});

test("single-source facts without attribution warn", () => {
  const { script, research } = fixture();
  sceneOf(script, "quote").narration = "The chief executive is building for the next decade.";
  assert.match(msgs(lint(script, research), "warn"), /single-source fact f3/);
});

test("on-screen numbers missing from cited claims warn", () => {
  const { script, research } = fixture();
  sceneOf(script, "bignumber").props.value = 999;
  assert.match(msgs(lint(script, research), "warn"), /on-screen number 999/);
});

test("placeholders, angle brackets and a missing hook are errors", () => {
  const { script, research } = fixture();
  script.summary = "TODO write this <later>";
  script.scenes.reverse();
  const e = msgs(lint(script, research), "error");
  assert.match(e, /placeholder/);
  assert.match(e, /cannot contain < or >/);
  assert.match(e, /first scene must be a hook/);
});

test("stale research warns; future research errors", () => {
  const { script, research } = fixture();
  research.researchedAt = "2020-01-01";
  assert.match(msgs(lint(script, research), "warn"), /days old/);
  research.researchedAt = "2999-01-01";
  assert.match(msgs(lint(script, research), "error"), /future/);
});

test("the new-episode template fails until filled in", async () => {
  const { readFileSync } = await import("node:fs");
  const raw = readFileSync("pipeline/templates/script.json", "utf8").replaceAll("{{slug}}", "x");
  const s = Script.parse(JSON.parse(raw));
  const { research } = fixture();
  assert.match(msgs(lintEpisode("x", s, research, today).list, "error"), /placeholder/);
});

test("voice defaults are filled in when script omits them", () => {
  const { script } = fixture();
  assert.equal(script.voice.voiceId, "dPah2VEoifKnZT37774q");
  assert.equal(script.voice.modelId, "eleven_multilingual_v2");
  assert.equal(script.voice.speed, 1);
});

test("containsNumber matches whole numbers only", async () => {
  const { containsNumber } = await import("../pipeline/lib/lint");
  assert.ok(containsNumber("fell 12% today", "12"));
  assert.ok(containsNumber("costs $12.", "12"));
  assert.ok(containsNumber("down 18.5 percent", "18.5"));
  assert.ok(containsNumber("about 1,200 jobs", "1,200"));
  assert.ok(!containsNumber("peaked at 120", "12"));
  assert.ok(!containsNumber("rose 1.12 points", "12"));
  assert.ok(!containsNumber("rose 12.5 points", "12"));
  assert.ok(containsNumber("closed at 97.80 dollars", 97.8));
  assert.ok(containsNumber("fell 4.7%", -4.7), "sign is ignored: claims say 'fell 4.7%'");
});

test("thumbnail numbers not in the research warn", () => {
  const { script, research } = fixture();
  script.thumbnail = [{ layout: "number", top: "Shares", big: "+12%", tone: "up" }];
  assert.match(msgs(lint(script, research), "warn"), /thumbnail 1.*number "12"|number "12" does not appear/);
});

test("unknown map countries are errors, with suggestions", () => {
  const { script, research } = fixture();
  const m = sceneOf(script, "map");
  m.props.highlights = [{ country: "Germny", tone: "accent" }];
  m.props.routes = [];
  assert.match(msgs(lint(script, research), "error"), /unknown country "Germny"; did you mean "Germany"/);
});

// ---- retention heuristics

test("fixture has no retention warnings", () => {
  const { script, research } = fixture();
  const warns = msgs(lint(script, research), "warn");
  assert.doesNotMatch(warns, /hook|open loop|filler|in a row|ear|repetitive/);
});

test("filler openers in the first scenes warn", () => {
  const { script, research } = fixture();
  script.scenes[0].narration = "Welcome back to the channel. Today, something big happened. Why?";
  assert.match(msgs(lint(script, research), "warn"), /filler/);
});

test("a long first sentence in the hook warns", () => {
  const { script, research } = fixture();
  script.scenes[0].narration = "This is a very long opening sentence that keeps going and going without ever landing the surprising fact that should be right up front for viewers? Yes.";
  assert.match(msgs(lint(script, research), "warn"), /first sentence is \d+ words/);
});

test("an intro without a question warns", () => {
  const { script, research } = fixture();
  const firstChapter = script.scenes.findIndex((s, i) => i > 0 && s.type === "chapter");
  for (const s of script.scenes.slice(0, firstChapter)) s.narration = s.narration.replace(/\?/g, ".");
  assert.match(msgs(lint(script, research), "warn"), /never asks the question/);
});

test("chapters that open without a question warn", () => {
  const { script, research } = fixture();
  sceneOf(script, "chapter").narration = "Part two. The spending.";
  assert.match(msgs(lint(script, research), "warn"), /chapter opens without a question/);
});

test("sentences too long for the ear warn", () => {
  const { script, research } = fixture();
  sceneOf(script, "bullets").narration = Array.from({ length: 35 }, () => "word").join(" ") + ".";
  assert.match(msgs(lint(script, research), "warn"), /35-word sentence/);
});

test("three scenes of the same type in a row warn", () => {
  const { script, research } = fixture();
  const b = sceneOf(script, "bullets");
  const i = script.scenes.indexOf(b);
  script.scenes.splice(i, 0, clone(b), clone(b));
  assert.match(msgs(lint(script, research), "warn"), /third bullets scene in a row/);
});

test("length estimate follows voice speed", async () => {
  const { estimateSeconds } = await import("../pipeline/lib/lint");
  const text = Array.from({ length: 26 }, () => "word").join(" ");
  assert.ok(Math.abs(estimateSeconds(text) - 10) < 1e-9);
  assert.ok(estimateSeconds(text, 1.2) < estimateSeconds(text));
});

test("sound effects are deterministic, stereo 48 kHz, and peak at -6 dBFS", async () => {
  const { whoosh, impact } = await import("../pipeline/sfx");
  for (const make of [whoosh, impact]) {
    const a = make(), b = make();
    assert.ok(a.equals(b), "same recipe must give identical bytes");
    assert.equal(a.readUInt16LE(22), 2);
    assert.equal(a.readUInt32LE(24), 48000);
    let peak = 0;
    for (let i = 44; i < a.length; i += 2) peak = Math.max(peak, Math.abs(a.readInt16LE(i)));
    assert.ok(Math.abs(20 * Math.log10(peak / 32767) + 6) < 0.1);
  }
});

test("sfx cues: hook impact, chapter whoosh, number impact, nothing else", async () => {
  const { sfxFor } = await import("../src/lib/sfx");
  const { script } = fixture();
  const t = (await import("../pipeline/lib/timeline")).buildTimeline(script, script.scenes.map(() => ({ audio: null, duration: 3, words: [{ text: "x", start: 0, end: 1 }] })), true, "h");
  const cues = t.scenes.map((s, i) => sfxFor(s, i)?.cue ?? null);
  assert.equal(cues[0], "impact");
  t.scenes.forEach((s, i) => {
    if (i && s.type === "chapter") assert.equal(cues[i], "whoosh");
    if (i && s.type === "bignumber") assert.equal(cues[i], "impact");
    if (i && !["chapter", "bignumber"].includes(s.type)) assert.equal(cues[i], null);
  });
});
