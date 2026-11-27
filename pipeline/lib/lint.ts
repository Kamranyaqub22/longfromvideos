/**
 * Editorial checks that run before any credits are spent or frames rendered.
 * Errors block the pipeline. Warnings are printed and must be read by a human.
 */
import type { Research, Scene, Script } from "../../src/schema";
import { Issues } from "./issues";
import { resolveCountry, suggestCountries } from "../../src/lib/geo";
import { lintVisuals } from "./visuals";

export const WORDS_PER_SECOND = 2.5; // ~150 wpm documentary narration

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const estimateSeconds = (s: string) => countWords(s) / WORDS_PER_SECOND;

const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX|lorem ipsum)\b|\?\?\?/i;
const ATTRIBUTION = /\b(according to|reported|reports|reportedly|alleg\w*|claim\w*|said|says|told|estimate\w*|per )\b/i;
const SENSATIONAL = /\b(shocking|insane|destroyed|you won'?t believe|gone wrong|exposed|meltdown)\b/i;
const ANGLE = /[<>]/; // YouTube rejects < and > in titles and descriptions

/** Scenes that put numbers on screen must be backed by facts. */
const DATA_SCENES: Scene["type"][] = ["bignumber", "barchart", "drop", "timeline", "headline", "quote", "map", "linechart"];
/** Illustrated scenes that put a figure on screen (counter, stat) must cite facts too; diagrams with callouts as well. */
const FIGURE_SCENES: Scene["type"][] = ["globe", "launch", "diagram"];

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
    for (const num of [t.top, t.big, t.bottom ?? ""].join(" ").match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
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
    const showsFigure =
      (s.type === "globe" && (s.props.satellites?.counter || s.props.satellites?.label || s.props.note)) ||
      (s.type === "launch" && (s.props.stat || s.props.note)) ||
      (s.type === "diagram" && s.props.callouts.length > 0);
    if (FIGURE_SCENES.includes(s.type) && showsFigure && s.facts.length === 0)
      issues.error(w, `${s.type} scene shows figures or labels and must cite facts`);

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
      : s.type === "globe" && s.props.satellites?.counter ? [s.props.satellites.to]
      : s.type === "launch" && s.props.stat ? [s.props.stat.value]
      : [];
    for (const n of onScreen)
      if (!containsNumber(claims, n))
        issues.warn(w, `on-screen number ${n} does not appear in any cited fact's claim; double-check it`);

    if (s.type === "map" || s.type === "globe") {
      const names = s.type === "map" ? [...s.props.highlights.map((h) => h.country), ...s.props.routes.flatMap((r) => [r.from, r.to])] : s.props.highlights.map((h) => h.country);
      for (const n of names)
        if (!resolveCountry(n)) {
          const hint = suggestCountries(n);
          issues.error(w, `unknown country "${n}"${hint.length ? `; did you mean ${hint.map((h) => `"${h}"`).join(", ")}?` : ""}`);
        }
    }

    const secs = estimateSeconds(s.narration);
    if (s.type === "hook" && secs > 18) issues.warn(w, `hook runs ~${secs.toFixed(0)}s; keep it under ~15s`);
    else if (secs > 30) issues.warn(w, `one visual for ~${secs.toFixed(0)}s; split into more scenes to hold attention`);
  });

  for (const f of research.facts) if (!used.has(f.id)) issues.warn(`research ${f.id}`, "fact is never cited (fine, but check nothing was dropped)");

  // ---- whole-episode
  const chapters = script.scenes.filter((s) => s.chapter).length;
  if (chapters < 3) issues.warn("chapters", `only ${chapters} chapter(s); YouTube shows chapters only with 3+`);
  const total = script.scenes.reduce((n, s) => n + estimateSeconds(s.narration), 0);
  if (total < 8 * 60) issues.warn("length", `estimated ${(total / 60).toFixed(1)} min; 8+ min enables mid-roll ads`);
  if (total > 25 * 60) issues.warn("length", `estimated ${(total / 60).toFixed(1)} min; consider tightening`);

  // ---- what the viewer sees
  lintVisuals(script, issues);

  return issues;
}
