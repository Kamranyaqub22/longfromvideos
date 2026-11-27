/**
 * Visual audit: what the viewer SEES, scene by scene. A long-form explainer that is mostly text cards reads like a
 * news bulletin; this measures how much screen time is text, data or illustration, finds long stretches with nothing
 * drawn, and points at scenes whose narration names something drawable while the screen shows a text card.
 */
import type { Scene, Script } from "../../src/schema";
import type { Issues } from "./issues";
import { estimateSeconds } from "./lint";

export type VisualKind = "illustration" | "data" | "text";

/** Hook, chapter and outro count as illustrated only when they carry a `visual` backdrop. */
export function visualKind(s: Scene): VisualKind {
  switch (s.type) {
    case "globe": case "launch": case "diagram": case "map": return "illustration";
    case "barchart": case "linechart": case "drop": case "bignumber": case "timeline": return "data";
    case "hook": case "chapter": case "outro": return s.props.visual ? "illustration" : "text";
    case "headline": case "quote": case "bullets": return "text";
  }
}

/** Words in narration that something on screen could show, and the template that shows it. */
export const VISUAL_CUES: { re: RegExp; suggest: string }[] = [
  { re: /\b(satellites?|orbits?|orbital|constellation|low earth orbit|the earth|planet|globe|night sky)\b/i, suggest: 'globe (or diagram "satellite")' },
  { re: /\b(rockets?|launch(es|ed|ing)?|lift-?off|starship|falcon|booster|reusable)\b/i, suggest: "launch" },
  { re: /\b(solar (panels?|power|array)|sunlight|the sun)\b/i, suggest: 'diagram "sunlight" or "satellite"' },
  { re: /\b(heat|cool(ing)?|radiators?|vacuum)\b/i, suggest: 'diagram "heat"' },
  { re: /\b(data cent(er|re)s?|servers?|racks?|electricity|power grid|grids?)\b/i, suggest: 'diagram "datacenter"' },
  { re: /\b(countr(y|ies)|exports?|imports?|trade routes?|shipping|border)\b/i, suggest: "map" },
];

/** Thresholds. Errors block the build; warnings must be read. */
export const VISUAL_RULES = {
  maxTextShareError: 0.5,
  maxTextShareWarn: 0.35,
  minIllustrationShare: 0.25,
  maxTextRunError: 60,
  maxTextRunWarn: 35,
};

export type VisualReport = {
  seconds: Record<VisualKind, number>;
  share: Record<VisualKind, number>;
  longestTextRun: { seconds: number; from: number; to: number };
  suggestions: { scene: number; type: string; cue: string; suggest: string }[];
};

export function auditVisuals(script: Script): VisualReport {
  const seconds: Record<VisualKind, number> = { illustration: 0, data: 0, text: 0 };
  let run = 0, runFrom = 0, best = { seconds: 0, from: 0, to: 0 };
  const suggestions: VisualReport["suggestions"] = [];
  script.scenes.forEach((s, i) => {
    const secs = estimateSeconds(s.narration);
    const kind = visualKind(s);
    seconds[kind] += secs;
    if (kind === "text") {
      if (run === 0) runFrom = i;
      run += secs;
      if (run > best.seconds) best = { seconds: run, from: runFrom, to: i };
      // Only chapter/hook/outro without a backdrop or a plain text card can be upgraded.
      const cue = VISUAL_CUES.find((c) => c.re.test(s.narration));
      if (cue) suggestions.push({ scene: i, type: s.type, cue: s.narration.match(cue.re)![0], suggest: cue.suggest });
    } else run = 0;
  });
  const total = Math.max(1, seconds.illustration + seconds.data + seconds.text);
  const share = { illustration: seconds.illustration / total, data: seconds.data / total, text: seconds.text / total };
  return { seconds, share, longestTextRun: best, suggestions };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function lintVisuals(script: Script, issues: Issues): VisualReport {
  const r = auditVisuals(script);
  const R = VISUAL_RULES;
  const run = r.longestTextRun;
  const span = `scenes ${run.from + 1}–${run.to + 1}`;
  if (r.share.text > R.maxTextShareError)
    issues.error("visuals", `${pct(r.share.text)} of screen time is text cards (max ${pct(R.maxTextShareError)}); swap some for globe/launch/diagram/map scenes`);
  else if (r.share.text > R.maxTextShareWarn)
    issues.warn("visuals", `${pct(r.share.text)} of screen time is text cards; aim for under ${pct(R.maxTextShareWarn)}`);
  if (r.share.illustration < R.minIllustrationShare)
    issues.warn("visuals", `only ${pct(r.share.illustration)} of screen time is illustrated; aim for ${pct(R.minIllustrationShare)}+ (globe, launch, diagram, map, or a backdrop on hook/chapter/outro)`);
  if (run.seconds > R.maxTextRunError)
    issues.error("visuals", `~${Math.round(run.seconds)}s of text cards in a row (${span}); break it up with a visual`);
  else if (run.seconds > R.maxTextRunWarn)
    issues.warn("visuals", `~${Math.round(run.seconds)}s of text cards in a row (${span}); consider a visual in between`);
  for (const s of r.suggestions)
    issues.warn(`scene ${s.scene + 1} (${s.type})`, `narration mentions "${s.cue}" but the screen is a text card; consider ${s.suggest}`);
  return r;
}

export function formatVisualReport(r: VisualReport): string {
  const run = r.longestTextRun;
  return `visuals: ${pct(r.share.illustration)} illustrated · ${pct(r.share.data)} data · ${pct(r.share.text)} text; longest text stretch ~${Math.round(run.seconds)}s`;
}
