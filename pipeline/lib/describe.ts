import type { Research, Script, Timeline } from "../../src/schema";
import { chaptersFromTimeline, formatTimestamp } from "../../src/lib/time";

export const DISCLAIMER = "This video is for information and education only. It is not financial or investment advice.";
export const AI_NOTE = "Narration is AI-generated; every factual claim is backed by the sources listed above.";

export const DESCRIPTION_LIMIT = 5000;
export const MORE_SOURCES = "More sources: see the pinned comment.";

type Line = { factId: string; first: boolean; text: string; textNoDate: string };

/** One line per unique source URL, in research order, for the facts the script cites. */
export function sourceLines(script: Script, research: Research): Line[] {
  const cited = new Set(script.scenes.flatMap((s) => s.facts));
  const seen = new Set<string>();
  const lines: Line[] = [];
  for (const f of research.facts) {
    if (!cited.has(f.id)) continue;
    let first = true;
    for (const s of f.sources) {
      if (seen.has(s.url)) { first = false; continue; }
      seen.add(s.url);
      lines.push({ factId: f.id, first, text: `• ${s.outlet}${s.date ? ` (${s.date})` : ""}: ${s.url}`, textNoDate: `• ${s.outlet}: ${s.url}` });
      first = false;
    }
  }
  return lines;
}

/**
 * YouTube description: summary, chapters, sources actually cited, disclaimers.
 * Well-sourced episodes can pass YouTube's 5,000-character limit, so it compacts in steps:
 * all sources with dates → without dates → the first source of each fact plus a pointer to the
 * pinned comment (see buildSourcesComment). Never drops a fact's only source.
 */
export function buildDescription(script: Script, research: Research, timeline: Timeline): string {
  const chapters = chaptersFromTimeline(timeline)
    .map((c) => `${formatTimestamp(c.startSeconds)} ${c.title}`)
    .join("\n");
  const tags = script.tags.length ? `\n\n${script.tags.slice(0, 3).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}` : "";
  const assemble = (sources: string[], more = false) =>
    [script.summary, chapters && `Chapters:\n${chapters}`, sources.length && `Sources:\n${sources.join("\n")}${more ? `\n${MORE_SOURCES}` : ""}`, `${DISCLAIMER}\n${AI_NOTE}`]
      .filter(Boolean)
      .join("\n\n") + tags;

  const lines = sourceLines(script, research);
  const attempts = [
    () => assemble(lines.map((l) => l.text)),
    () => assemble(lines.map((l) => l.textNoDate)),
    () => assemble(lines.filter((l) => l.first).map((l) => l.textNoDate), lines.some((l) => !l.first)),
  ];
  let d = "";
  for (const a of attempts) if ((d = a()).length <= DESCRIPTION_LIMIT) return d;
  return d; // still too long: QC reports it
}

/** Full source list for a pinned comment, when the description had to leave sources out. */
export function buildSourcesComment(script: Script, research: Research, description: string): string | null {
  if (!description.includes(MORE_SOURCES)) return null;
  return `All sources for this video:\n${sourceLines(script, research).map((l) => l.text).join("\n")}`;
}

/** Metadata for the upload step (title, description, tags). */
export function buildUploadMeta(script: Script, description: string, sourcesComment: string | null = null) {
  const thumbnails = script.thumbnail.map((_, i) => (i === 0 ? "thumbnail.png" : `thumbnail-${i + 1}.png`));
  return { title: script.title, description, tags: script.tags, thumbnails, categoryId: "25" /* News & Politics */, madeForKids: false, privacyStatus: "private", ...(sourcesComment ? { pinnedComment: sourcesComment } : {}) };
}
