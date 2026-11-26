import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const paths = (slug: string) => {
  const publicRel = `episodes/${slug}`;
  return {
    episodeDir: path.join(ROOT, "episodes", slug),
    script: path.join(ROOT, "episodes", slug, "script.json"),
    research: path.join(ROOT, "episodes", slug, "research.json"),
    publicDir: path.join(ROOT, "public", publicRel),
    publicRel,
    audioDir: path.join(ROOT, "public", publicRel, "audio"),
    timeline: path.join(ROOT, "public", publicRel, "timeline.json"),
    outDir: path.join(ROOT, "out", slug),
    rawVideo: path.join(ROOT, "out", slug, "render-raw.mp4"),
    video: path.join(ROOT, "out", slug, "video.mp4"),
    stillsDir: path.join(ROOT, "out", slug, "stills"),
    /** Variant 0 is thumbnail.png (the default); others are thumbnail-2.png, thumbnail-3.png. */
    thumbnail: (i = 0) => path.join(ROOT, "out", slug, i === 0 ? "thumbnail.png" : `thumbnail-${i + 1}.png`),
    description: path.join(ROOT, "out", slug, "description.txt"),
    upload: path.join(ROOT, "out", slug, "upload.json"),
    qcReport: path.join(ROOT, "out", slug, "qc-report.json"),
  };
};

/** Chrome for Remotion: env override, then the pre-installed headless shell, else Remotion's own download. */
export function browserExecutable(): string | null {
  const candidates = [
    process.env.REMOTION_BROWSER,
    "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell",
  ];
  return candidates.find((c): c is string => !!c && existsSync(c)) ?? null;
}
