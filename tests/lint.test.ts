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

test("thumbnail numbers with several thousands separators are read whole", () => {
  const { script, research } = fixture();
  research.facts[0].claim += " It sold 1,000,000 units.";
  script.thumbnail = [{ layout: "number", top: "Units", big: "1,000,000", tone: "up" }];
  assert.doesNotMatch(msgs(lint(script, research), "warn"), /thumbnail 1/);
});

test("unknown map countries are errors, with suggestions", () => {
  const { script, research } = fixture();
  const m = sceneOf(script, "map");
  m.props.highlights = [{ country: "Germny", tone: "accent" }];
  m.props.routes = [];
  assert.match(msgs(lint(script, research), "error"), /unknown country "Germny"; did you mean "Germany"/);
});

// ---- visual audit
test("a script that is mostly text cards fails the visual audit", () => {
  const { script, research } = fixture();
  script.scenes = script.scenes.map((s) =>
    s.type === "hook" || s.type === "outro" || s.type === "chapter" ? { ...s, props: { ...s.props, visual: undefined } } as typeof s
    : ({ type: "quote", narration: s.narration, facts: ["f3"], props: { text: "A quote.", author: "Someone" } } as typeof s));
  script.scenes[0] = { ...fixture().script.scenes[0], props: { lines: ["Pipeline test"] } } as (typeof script.scenes)[number];
  const errs = msgs(lint(script, research), "error");
  assert.match(errs, /of screen time is text cards/);
  assert.match(errs, /text cards in a row/);
});

test("drawable nouns on a text card get a template suggestion", () => {
  const { script, research } = fixture();
  sceneOf(script, "quote").narration = "The rocket lifted off with a satellite on board.";
  assert.match(msgs(lint(script, research), "warn"), /mentions "(rocket|satellite)".*consider/);
});

test("illustrated scenes with figures must cite facts, and their counters are checked", () => {
  const { script, research } = fixture();
  const g = sceneOf(script, "globe");
  g.props.satellites!.to = 9999;
  assert.match(msgs(lint(script, research), "warn"), /on-screen number 9999/);
  g.facts = [];
  assert.match(msgs(lint(script, research), "error"), /globe scene shows figures/);
});

test("diagram callouts must name a part of their illustration", () => {
  const bad = clone(fixture().script) as any;
  bad.scenes.find((s: any) => s.type === "diagram").props.callouts[0].part = "wing";
  assert.equal(Script.safeParse(bad).success, false);
});

test("hook, chapter and outro with a backdrop count as illustrated", async () => {
  const { auditVisuals } = await import("../pipeline/lib/visuals");
  const { script } = fixture();
  const withVisual = auditVisuals(script).share.illustration;
  script.scenes.forEach((s) => { if (s.type === "hook" || s.type === "chapter" || s.type === "outro") delete (s.props as any).visual; });
  assert.ok(auditVisuals(script).share.illustration < withVisual);
});
