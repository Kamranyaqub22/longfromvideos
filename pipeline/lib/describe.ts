import type { Research, Script, Timeline } from "../../src/schema";
import { chaptersFromTimeline, formatTimestamp } from "../../src/lib/time";

export const DISCLAIMER = "This video is for information and education only. It is not financial or investment advice.";
export const AI_NOTE = "Narration is AI-generated; every factual claim is backed by the sources listed above.";

/** YouTube description: summary, chapters, sources actually cited, disclaimers. */
export function buildDescription(script: Script, research: Research, timeline: Timeline): string {
  const chapters = chaptersFromTimeline(timeline)
    .map((c) => `${formatTimestamp(c.startSeconds)} ${c.title}`)
    .join("\n");

  const cited = new Set(script.scenes.flatMap((s) => s.facts));
  const seen = new Set<string>();
  const sources: string[] = [];
  for (const f of research.facts) {
    if (!cited.has(f.id)) continue;
    for (const s of f.sources) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      sources.push(`• ${s.outlet}${s.date ? ` (${s.date})` : ""}: ${s.url}`);
    }
  }

  const tags = script.tags.length ? `\n\n${script.tags.slice(0, 3).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}` : "";
  return [script.summary, chapters && `Chapters:\n${chapters}`, sources.length && `Sources:\n${sources.join("\n")}`, `${DISCLAIMER}\n${AI_NOTE}`]
    .filter(Boolean)
    .join("\n\n") + tags;
}

/** Metadata for the upload step (title, description, tags). */
export function buildUploadMeta(script: Script, description: string) {
  return { title: script.title, description, tags: script.tags, categoryId: "25" /* News & Politics */, madeForKids: false, privacyStatus: "private" };
}
