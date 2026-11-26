import type { Word } from "../schema";

export type Phrase = { words: Word[]; start: number; end: number };

/**
 * Group words into short on-screen caption phrases.
 * Breaks after sentence/clause punctuation, or when a phrase reaches maxWords / maxChars.
 */
export function groupWords(words: Word[], maxWords = 6, maxChars = 38): Phrase[] {
  const phrases: Phrase[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) phrases.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  for (const w of words) {
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (cur.length && (cur.length >= maxWords || chars > maxChars)) flush();
    cur.push(w);
    if (/[.!?;:,]["')\]]?$/.test(w.text)) flush();
  }
  flush();
  return phrases;
}

/** Phrase visible at time t (seconds). Holds the previous phrase through short gaps. */
export function phraseAt(phrases: Phrase[], t: number, holdGap = 0.6): Phrase | null {
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const next = phrases[i + 1];
    const until = next ? Math.min(next.start, p.end + holdGap) : p.end + holdGap;
    if (t >= p.start && t < until) return p;
  }
  return null;
}
