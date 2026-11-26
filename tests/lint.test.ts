import assert from "node:assert/strict";
import { test } from "node:test";
import { Script } from "../src/schema";
import { lintEpisode } from "../pipeline/lib/lint";
import { clone, fixture, msgs } from "./helpers";

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
  script.scenes[3].narration = "Part two. Spending rose 40 percent.";
  assert.match(msgs(lint(script, research), "error"), /number but cites no facts/);
});

test("data scenes must cite facts", () => {
  const { script, research } = fixture();
  script.scenes[4].facts = [];
  assert.match(msgs(lint(script, research), "error"), /must cite facts/);
});

test("unknown fact ids are errors", () => {
  const { script, research } = fixture();
  script.scenes[1].facts = ["f99"];
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
  script.scenes[6].narration = "The chief executive is building for the next decade.";
  assert.match(msgs(lint(script, research), "warn"), /single-source fact f3/);
});

test("on-screen numbers missing from cited claims warn", () => {
  const { script, research } = fixture();
  const s = script.scenes[4];
  if (s.type !== "bignumber") throw new Error("fixture order changed");
  s.props.value = 999;
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
