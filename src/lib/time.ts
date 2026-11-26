import type { Timeline } from "../schema";

export type Chapter = { title: string; startSeconds: number };

/** YouTube chapter timestamp: M:SS, or H:MM:SS past one hour. */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

/** Chapters from scenes that declare `chapter`. The first chapter is forced to 0:00 (YouTube rule). */
export function chaptersFromTimeline(t: Timeline): Chapter[] {
  const out: Chapter[] = [];
  for (const s of t.scenes) {
    if (s.chapter) out.push({ title: s.chapter, startSeconds: s.startFrame / t.fps });
  }
  if (out.length && out[0].startSeconds > 0) out[0] = { ...out[0], startSeconds: 0 };
  return out;
}

/** The chapter active at a given frame (for the on-screen chapter tag). */
export function chapterAtFrame(t: Timeline, frame: number): string | null {
  let cur: string | null = null;
  for (const s of t.scenes) {
    if (s.startFrame > frame) break;
    if (s.chapter) cur = s.chapter;
  }
  return cur;
}

/**
 * YouTube only shows chapters when: first starts at 0:00, there are at least 3,
 * and each is at least 10 seconds long. Returns a list of problems (empty = valid).
 */
export function checkChapters(chapters: Chapter[], totalSeconds: number): string[] {
  const problems: string[] = [];
  if (chapters.length < 3) problems.push(`YouTube needs at least 3 chapters, found ${chapters.length}`);
  if (chapters.length && chapters[0].startSeconds !== 0) problems.push("first chapter must start at 0:00");
  chapters.forEach((c, i) => {
    const end = i + 1 < chapters.length ? chapters[i + 1].startSeconds : totalSeconds;
    if (end - c.startSeconds < 10) problems.push(`chapter "${c.title}" is shorter than 10s`);
    if (i > 0 && c.startSeconds <= chapters[i - 1].startSeconds) problems.push(`chapter "${c.title}" is not in ascending order`);
  });
  return problems;
}
