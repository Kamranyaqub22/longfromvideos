/**
 * Automated quality control on the finished files. Nothing ships unless this passes.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import type { Timeline } from "../../src/schema";
import { chaptersFromTimeline, checkChapters } from "../../src/lib/time";
import { Issues } from "./issues";
import { paths } from "./paths";
import { run } from "./proc";

type Probe = {
  streams: { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string; pix_fmt?: string; color_range?: string; color_space?: string; sample_rate?: string }[];
  format: { duration: string };
};

const probe = async (file: string) =>
  JSON.parse((await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file])).stdout) as Probe;

/** Parse "key: value" pairs that ffmpeg filters print to stderr. */
const ranges = (stderr: string, startKey: string, endKey: string) => {
  const out: { start: number; end: number }[] = [];
  const re = new RegExp(`${startKey}[:=]\\s*([\\d.]+)[\\s\\S]*?${endKey}[:=]\\s*([\\d.]+)`, "g");
  for (const m of stderr.matchAll(re)) out.push({ start: +m[1], end: +m[2] });
  return out;
};

export async function qcEpisode(slug: string, timeline: Timeline, allowMock = false): Promise<{ issues: Issues; report: Record<string, unknown> }> {
  const p = paths(slug);
  const issues = new Issues();
  const report: Record<string, unknown> = { slug, mock: timeline.mock, checkedAt: new Date().toISOString() };
  const expected = timeline.durationInFrames / timeline.fps;

  if (timeline.mock) (allowMock ? issues.warn.bind(issues) : issues.error.bind(issues))("timeline", "built with --mock (silent placeholder voice): not publishable");

  // ---- container / streams
  if (!existsSync(p.video)) {
    issues.error("video", "missing video.mp4");
    return { issues, report };
  }
  const info = await probe(p.video);
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const duration = parseFloat(info.format.duration);
  report.video = { codec: v?.codec_name, size: `${v?.width}x${v?.height}`, fps: v?.r_frame_rate, pixFmt: v?.pix_fmt, color: `${v?.color_range}/${v?.color_space}`, duration };
  report.audio = { codec: a?.codec_name, sampleRate: a?.sample_rate };
  if (v?.codec_name !== "h264") issues.error("video", `codec ${v?.codec_name}, expected h264`);
  if (v?.width !== timeline.width || v?.height !== timeline.height) issues.error("video", `size ${v?.width}x${v?.height}, expected ${timeline.width}x${timeline.height}`);
  if (v?.r_frame_rate !== `${timeline.fps}/1`) issues.error("video", `frame rate ${v?.r_frame_rate}, expected ${timeline.fps}/1`);
  if (v?.pix_fmt !== "yuv420p") issues.error("video", `pixel format ${v?.pix_fmt}, expected yuv420p`);
  if (v?.color_range !== "tv" || v?.color_space !== "bt709") issues.error("video", `color ${v?.color_range}/${v?.color_space}, expected tv/bt709`);
  if (!a) issues.error("audio", "no audio stream");
  else if (a.codec_name !== "aac") issues.error("audio", `codec ${a.codec_name}, expected aac`);
  if (Math.abs(duration - expected) > 0.25) issues.error("video", `duration ${duration.toFixed(2)}s, timeline says ${expected.toFixed(2)}s`);

  // ---- one decode pass: loudness, silence, black frames, frozen frames
  const { stderr } = await run("ffmpeg", [
    "-hide_banner", "-nostats", "-i", p.video,
    "-filter_complex", "[0:a]ebur128=peak=true,silencedetect=n=-45dB:d=2.5[ao];[0:v]blackdetect=d=0.5:pix_th=0.03,freezedetect=n=-60dB:d=5[vo]",
    "-map", "[ao]", "-map", "[vo]", "-f", "null", "-",
  ]);
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const lufs = parseFloat(summary.match(/I:\s*(-?[\d.]+) LUFS/)?.[1] ?? "NaN");
  const peak = parseFloat(summary.match(/Peak:\s*(-?[\d.]+|-inf) dBFS/)?.[1] ?? "NaN");
  const silences = ranges(stderr, "silence_start", "silence_end");
  const blacks = ranges(stderr, "black_start", "black_end");
  const freezes = ranges(stderr, "freeze_start", "freeze_end");
  report.loudness = { integratedLUFS: lufs, truePeakDBFS: peak };
  report.silences = silences;
  report.blackFrames = blacks;
  report.frozenFrames = freezes;

  if (!timeline.mock) {
    if (!Number.isFinite(lufs) || lufs < -16 || lufs > -12) issues.error("loudness", `integrated ${lufs} LUFS, target -14 ±2`);
    if (Number.isFinite(peak) && peak > -1) issues.error("loudness", `true peak ${peak} dBFS, must be ≤ -1`);
    for (const s of silences) issues.warn("audio", `dead air ${s.start.toFixed(1)}s–${s.end.toFixed(1)}s`);
  }
  for (const b of blacks) issues.error("video", `black frames ${b.start.toFixed(1)}s–${b.end.toFixed(1)}s`);
  for (const f of freezes) issues.warn("retention", `picture static ${f.start.toFixed(1)}s–${f.end.toFixed(1)}s (>5s)`);

  // ---- chapters
  const chapters = chaptersFromTimeline(timeline);
  report.chapters = chapters;
  for (const msg of checkChapters(chapters, expected)) issues.warn("chapters", msg);

  // ---- thumbnail
  if (!existsSync(p.thumbnail)) issues.error("thumbnail", "missing thumbnail.png");
  else {
    const t = (await probe(p.thumbnail)).streams[0];
    const bytes = statSync(p.thumbnail).size;
    report.thumbnail = { size: `${t.width}x${t.height}`, bytes };
    if (t.width !== 1280 || t.height !== 720) issues.error("thumbnail", `size ${t.width}x${t.height}, expected 1280x720`);
    if (bytes > 2 * 1024 * 1024) issues.error("thumbnail", `${(bytes / 1048576).toFixed(2)} MB, YouTube limit is 2 MB`);
  }

  // ---- description
  if (!existsSync(p.description)) issues.error("description", "missing description.txt");
  else {
    const d = readFileSync(p.description, "utf8");
    report.descriptionChars = d.length;
    if (d.length > 5000) issues.error("description", `${d.length} chars, YouTube limit is 5000`);
    if (/[<>]/.test(d)) issues.error("description", "contains < or >, which YouTube rejects");
    if (!/Sources:/.test(d)) issues.error("description", "has no Sources section");
  }

  report.errors = issues.errors;
  report.warnings = issues.warnings;
  report.pass = issues.errors.length === 0;
  return { issues, report };
}
