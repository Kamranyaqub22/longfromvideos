/**
 * Editorial checks that run before any credits are spent or frames rendered.
 * Errors block the pipeline. Warnings are printed and must be read by a human.
 */
import type { Research, Scene, Script, Timeline } from "../../src/schema";
import { DESCRIPTION_LIMIT, MORE_SOURCES, buildDescription } from "./describe";
import { Issues } from "./issues";
import { TAIL } from "./timeline";
import { resolveCountry, suggestCountries } from "../../src/lib/geo";

/** Measured on the default narrator at speed 1.0: ~155 wpm. Scales with the voice's `speed`. */
export const WORDS_PER_SECOND = 2.6;

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const estimateSeconds = (s: string, speed = 1) => countWords(s) / (WORDS_PER_SECOND * speed);

/** Sentences as a listener hears them (split on . ! ? followed by space or end). */
export const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

// ---- retention heuristics (warnings: they flag, a human decides)
/** Openers that make viewers click away in the first seconds. */
const FILLER = /\b(welcome (back|to)|in (this|today'?s) video|hey (guys|everyone)|before we (begin|start|get started)|don'?t forget to (like|subscribe)|without further ado|let'?s dive in|let'?s get (into|started))\b/i;
/** Words that open a question in the viewer's head even without a "?". */
const OPEN_LOOP = /\?|\b(why|how|what|who|where|here'?s|but)\b/i;
/** Longest sentence the ear follows comfortably. */
export const MAX_SENTENCE_WORDS = 30;
/** Intro (everything before the first chapter card) should get to the story fast. */
export const MAX_INTRO_SECONDS = 50;

const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b|\?\?\?/i;
const ATTRIBUTION = /\b(according to|in (its|their|his|her) (own )?words|reported|reports|reportedly|alleg\w*|claim\w*|said|says|told|estimate\w*|per )\b/i;
const SENSATIONAL = /\b(shocking|insane|destroyed|you won'?t believe|gone wrong|exposed|meltdown)\b/i;
const ANGLE = /[<>]/; // YouTube rejects < and > in titles and descriptions

/** Scenes that put numbers on screen must be backed by facts. */
const DATA_SCENES: Scene["type"][] = ["bignumber", "barchart", "drop", "timeline", "headline", "quote", "map", "linechart"];

/** Every number written in a text, as values ("1,200" → 1200, "97.80" → 97.8). */
export const numbersIn = (text: string) => (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => parseFloat(n.replace(/,/g, "")));

/** True if `num` appears in `text` as a value: "12" matches "12%" and "$12.00" but not "120" or "1.12". */
export const containsNumber = (text: string, num: string | number) => {
  const v = Math.abs(typeof num === "number" ? num : parseFloat(num.replace(/,/g, "")));
  return numbersIn(text).some((x) => Math.abs(x - v) < 1e-9);
};

const where = (i: number, s: Scene) => `scene ${i + 1} (${s.type})`;


export function lintEpisode(slug: string, script: Script, research: Research, today = new Date()): Issues {
  const issues = new Issues();
  const facts = new Map(research.facts.map((f) => [f.id, f]));
  const speed = script.voice.speed;

  // ---- identity
  if (script.slug !== slug) issues.error("script.json:slug", `slug "${script.slug}" does not match folder "${slug}"`);

  // ---- research ledger
  const seen = new Set<string>();
  for (const f of research.facts) {
    if (seen.has(f.id)) issues.error(`research ${f.id}`, "duplicate fact id");
    seen.add(f.id);
    const outlets = new Set(f.sources.map((s) => s.outlet.toLowerCase()));
    if (f.status === "verified" && outlets.size < 2)
      issues.error(`research ${f.id}`, `marked verified but has ${outlets.size} independent outlet(s); needs 2+ or status "single-source"`);
  }
  const ageDays = (today.getTime() - Date.parse(research.researchedAt)) / 86_400_000;
  if (ageDays > 3) issues.warn("research.json", `research is ${Math.floor(ageDays)} days old; re-check facts for a news video`);
  if (ageDays < -1) issues.error("research.json", "researchedAt is in the future");

  // ---- text hygiene
  const allText = JSON.stringify(script);
  if (PLACEHOLDER.test(allText)) issues.error("script.json", `placeholder text found: "${allText.match(PLACEHOLDER)![0]}"`);
  if (ANGLE.test(script.title)) issues.error("title", "YouTube titles cannot contain < or >");
  if (ANGLE.test(script.summary)) issues.error("summary", "YouTube descriptions cannot contain < or >");
  const texts: [string, string][] = [["title", script.title], ...script.thumbnail.map((t, i): [string, string] => [`thumbnail ${i + 1}`, [t.top, t.big, t.bottom ?? ""].join(" ")])];
  // Thumbnails make the strongest claim in the video: their numbers must exist in the research.
  const allClaims = research.facts.map((f) => f.claim).join(" ");
  script.thumbnail.forEach((t, i) => {
    for (const num of [t.top, t.big, t.bottom ?? ""].join(" ").match(/\d+(?:[.,]\d+)?/g) ?? [])
      if (!containsNumber(allClaims, num)) issues.warn(`thumbnail ${i + 1}`, `number "${num}" does not appear in any fact; is the thumbnail accurate?`);
  });
  for (const [k, v] of texts)
    if (SENSATIONAL.test(v)) issues.warn(k, `sensational wording ("${v.match(SENSATIONAL)![0]}") can limit ads on news content`);

  // ---- structure
  if (script.scenes[0].type !== "hook") issues.error("scene 1", "first scene must be a hook");
  if (script.scenes[script.scenes.length - 1].type !== "outro") issues.warn("last scene", "episode should end with an outro scene");
  if (!script.scenes[0].chapter) issues.warn("scene 1", 'first scene has no chapter title; it will not be labelled (use e.g. "Intro")');

  // ---- per-scene
  const used = new Set<string>();
  script.scenes.forEach((s, i) => {
    const w = where(i, s);
    const cited = s.facts.map((id) => facts.get(id));
    s.facts.forEach((id, k) => {
      if (!cited[k]) issues.error(w, `cites unknown fact "${id}"`);
      else used.add(id);
    });
    const valid = cited.filter((f): f is NonNullable<typeof f> => !!f);

    if (/\d/.test(s.narration) && s.facts.length === 0) issues.error(w, "narration contains a number but cites no facts");
    if (DATA_SCENES.includes(s.type) && s.facts.length === 0) issues.error(w, `${s.type} scenes show factual content and must cite facts`);

    for (const f of valid) {
      if (f.status === "disputed" && !ATTRIBUTION.test(s.narration))
        issues.error(w, `uses disputed fact ${f.id} without attribution ("according to…", "reportedly…")`);
      if (f.status === "single-source" && !ATTRIBUTION.test(s.narration))
        issues.warn(w, `uses single-source fact ${f.id}; attribute it in the narration`);
    }

    // On-screen numbers should appear in a cited claim.
    const claims = valid.map((f) => f.claim).join(" ");
    const onScreen: number[] =
      s.type === "bignumber" ? [s.props.value]
      : s.type === "drop" ? [s.props.pct]
      : s.type === "barchart" ? s.props.bars.map((b) => b.value)
      : s.type === "linechart" ? [s.props.points[0].value, s.props.points[s.props.points.length - 1].value]
      : [];
    for (const n of onScreen)
      if (!containsNumber(claims, n))
        issues.warn(w, `on-screen number ${n} does not appear in any cited fact's claim; double-check it`);

    if (s.type === "map") {
      const names = [...s.props.highlights.map((h) => h.country), ...s.props.routes.flatMap((r) => [r.from, r.to])];
      for (const n of names)
        if (!resolveCountry(n)) {
          const hint = suggestCountries(n);
          issues.error(w, `unknown country "${n}"${hint.length ? `; did you mean ${hint.map((h) => `"${h}"`).join(", ")}?` : ""}`);
        }
    }

    const secs = estimateSeconds(s.narration, speed);
    if (s.type === "hook" && secs > 18) issues.warn(w, `hook runs ~${secs.toFixed(0)}s; keep it under ~15s`);
    else if (secs > 30) issues.warn(w, `one visual for ~${secs.toFixed(0)}s; split into more scenes to hold attention`);

    for (const sent of sentences(s.narration)) {
      const n = countWords(sent);
      if (n > MAX_SENTENCE_WORDS) issues.warn(w, `${n}-word sentence is hard to follow by ear; split it: "${sent.slice(0, 50)}…"`);
    }
    if (FILLER.test(s.narration) && i < 3) issues.warn(w, `filler opener ("${s.narration.match(FILLER)![0]}") loses viewers in the first seconds; open on the story`);
    if (i > 0 && s.type === script.scenes[i - 1].type && i > 1 && s.type === script.scenes[i - 2].type)
      issues.warn(w, `third ${s.type} scene in a row; vary the visual to hold attention`);
    if (s.type === "chapter" && !OPEN_LOOP.test(s.narration))
      issues.warn(w, "chapter opens without a question or open loop; give viewers a reason to stay for this part");
  });

  // ---- retention: the first seconds decide whether anyone watches the rest
  const hook = script.scenes[0];
  const first = sentences(hook.narration)[0] ?? "";
  if (countWords(first) > 20) issues.warn("hook", `first sentence is ${countWords(first)} words; land the surprising fact in under ~20`);
  if (FILLER.test(hook.narration)) issues.warn("hook", "hook starts with filler; open with the most surprising fact");
  const firstChapter = script.scenes.findIndex((s, i) => i > 0 && s.type === "chapter");
  const intro = script.scenes.slice(0, firstChapter < 0 ? script.scenes.length : firstChapter);
  if (!intro.some((s) => s.narration.includes("?")))
    issues.warn("hook", "the intro never asks the question the video answers; viewers need a reason to keep watching");
  const introSecs = intro.reduce((n, s) => n + estimateSeconds(s.narration, speed), 0);
  if (firstChapter > 0 && introSecs > MAX_INTRO_SECONDS) issues.warn("hook", `intro runs ~${introSecs.toFixed(0)}s before the first chapter; keep it under ~${MAX_INTRO_SECONDS}s`);
  const counts = new Map<string, number>();
  for (const s of script.scenes) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
  for (const [type, n] of counts)
    if (script.scenes.length >= 12 && n / script.scenes.length > 0.25 && !["chapter"].includes(type))
      issues.warn("pacing", `${n} of ${script.scenes.length} scenes are ${type}; that much of one template starts to feel repetitive`);
  const avg = script.scenes.reduce((n, s) => n + estimateSeconds(s.narration, speed), 0) / script.scenes.length;
  if (avg > 15) issues.warn("pacing", `average scene is ~${avg.toFixed(0)}s; aim for 5–15s per visual`);

  for (const f of research.facts) if (!used.has(f.id)) issues.warn(`research ${f.id}`, "fact is never cited (fine, but check nothing was dropped)");

  // ---- whole-episode
  const chapters = script.scenes.filter((s) => s.chapter).length;
  if (chapters < 3) issues.warn("chapters", `only ${chapters} chapter(s); YouTube shows chapters only with 3+`);
  // Same breathing room the timeline adds after each scene, so this matches the rendered length.
  const total = script.scenes.reduce((n, s) => n + estimateSeconds(s.narration, speed) + (TAIL[s.type as keyof typeof TAIL] ?? TAIL.default), 0);
  if (total < 8 * 60) issues.warn("length", `estimated ${(total / 60).toFixed(1)} min; 8+ min enables mid-roll ads`);
  if (total > 25 * 60) issues.warn("length", `estimated ${(total / 60).toFixed(1)} min; consider tightening`);

  // ---- description: catch overflow before a 20-minute render, not after
  const fakeTimeline = { scenes: script.scenes.map((s, i) => ({ ...s, startFrame: i * 600, durationInFrames: 600, audio: "", words: [] })), durationInFrames: script.scenes.length * 600, fps: 30 } as unknown as Timeline;
  const description = buildDescription(script, research, fakeTimeline);
  if (description.length > DESCRIPTION_LIMIT)
    issues.error("description", `${description.length} chars even with one source per fact; YouTube's limit is ${DESCRIPTION_LIMIT}. Shorten the summary or merge facts`);
  else if (description.includes(MORE_SOURCES))
    issues.warn("description", "too many sources to list in full: the description lists one per fact and render writes sources-comment.txt to pin");

  return issues;
}
