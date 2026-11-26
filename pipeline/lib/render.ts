import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { ThumbnailProps, Timeline } from "../../src/schema";
import { ROOT, browserExecutable, paths } from "./paths";
import { run } from "./proc";

let bundled: Promise<string> | null = null;
/** Bundle the Remotion project once per process. */
export const getBundle = () =>
  (bundled ??= bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") }));

const common = () => ({ browserExecutable: browserExecutable(), chromiumOptions: { gl: "swangle" as const } });

/** One still per scene at 85% of its length (all elements on screen): a visual review sheet. */
export async function renderSceneStills(slug: string, timeline: Timeline): Promise<string[]> {
  const p = paths(slug);
  rmSync(p.stillsDir, { recursive: true, force: true }); // never mix in stills of scenes that no longer exist
  mkdirSync(p.stillsDir, { recursive: true });
  const serveUrl = await getBundle();
  const inputProps = { slug, timeline };
  const composition = await selectComposition({ serveUrl, id: "Episode", inputProps, ...common() });
  const files: string[] = [];
  for (const [i, s] of timeline.scenes.entries()) {
    const file = path.join(p.stillsDir, `${String(i + 1).padStart(2, "0")}-${s.type}.jpg`);
    await renderStill({ serveUrl, composition, inputProps, frame: s.startFrame + Math.floor(s.durationInFrames * 0.85), output: file, imageFormat: "jpeg", jpegQuality: 80, ...common() });
    files.push(file);
  }
  return files;
}

export async function renderEpisode(slug: string, timeline: Timeline) {
  const p = paths(slug);
  mkdirSync(p.outDir, { recursive: true });
  const serveUrl = await getBundle();
  const inputProps = { slug, timeline };
  const composition = await selectComposition({ serveUrl, id: "Episode", inputProps, ...common() });
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: "h264",
    crf: 18,
    pixelFormat: "yuv420p",
    colorSpace: "bt709", // without this, JPEG frames yield full-range yuvj420p
    audioCodec: "aac",
    enforceAudioTrack: true,
    outputLocation: p.rawVideo,
    concurrency: Number(process.env.RENDER_CONCURRENCY ?? 4),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= last + 10) { last = pct; console.log(`render: ${pct}%`); }
    },
    ...common(),
  });
}

/** Normalize to YouTube's loudness target (-14 LUFS, -1.5 dBTP) without re-encoding video. */
export async function master(slug: string) {
  const p = paths(slug);
  await run("ffmpeg", [
    "-y", "-v", "error", "-i", p.rawVideo,
    "-c:v", "copy",
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
    "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    p.video,
  ]);
}

export async function renderThumbnails(slug: string, variants: ThumbnailProps[]) {
  const p = paths(slug);
  mkdirSync(p.outDir, { recursive: true });
  const serveUrl = await getBundle();
  for (const [i, props] of variants.entries()) {
    const composition = await selectComposition({ serveUrl, id: "Thumbnail", inputProps: props, ...common() });
    await renderStill({ serveUrl, composition, inputProps: props, output: p.thumbnail(i), imageFormat: "png", ...common() });
  }
}
