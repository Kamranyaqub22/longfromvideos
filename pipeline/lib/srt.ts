/**
 * Subtitles (.srt) for YouTube closed captions, built from the voice-over's word timings, so they match the speech
 * exactly. Cues use the same phrase-breaking rules as the burned-in captions, a little longer per line.
 */
import type { Timeline } from "../../src/schema";
import { groupWords } from "../../src/lib/captions";

const HOLD = 0.6; // keep a cue on screen briefly after its last word, unless the next one starts

function stamp(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

export function buildSrt(t: Timeline): string {
  const cues: { start: number; end: number; text: string }[] = [];
  for (const s of t.scenes) {
    const offset = s.startFrame / t.fps;
    for (const p of groupWords(s.words, 9, 52)) {
      cues.push({ start: offset + p.start, end: offset + p.end, text: p.words.map((w) => w.text).join(" ") });
    }
  }
  return cues
    .map((c, i) => {
      const next = cues[i + 1];
      const end = Math.max(c.end, next ? Math.min(next.start, c.end + HOLD) : c.end + HOLD);
      return `${i + 1}\n${stamp(c.start)} --> ${stamp(end)}\n${c.text}\n`;
    })
    .join("\n");
}
