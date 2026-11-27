/**
 * Episode pipeline CLI.
 *
 *   npm run ep -- new <slug>                 scaffold episodes/<slug>/{script,research}.json
 *   npm run ep -- check <slug>               schema + editorial lint (free)
 *   npm run ep -- voice <slug> [--mock] [--spend]   voice-over + timeline
 *   npm run ep -- stills <slug>              one review still per scene
 *   npm run ep -- render <slug>              render, master audio, thumbnail, description
 *   npm run ep -- qc <slug> [--allow-mock]   automated quality control on finished files
 *   npm run ep -- build <slug> [--mock] [--spend]   all of the above, stopping at the first error
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Script, Timeline } from "../src/schema";
import { buildDescription, buildUploadMeta } from "./lib/describe";
import { Issues, PipelineError } from "./lib/issues";
import { lintEpisode } from "./lib/lint";
import { loadEpisode } from "./lib/load";
import { paths } from "./lib/paths";
import { qcEpisode } from "./lib/qc";
import { master, renderEpisode, renderSceneStills, renderThumbnails } from "./lib/render";
import { buildTimeline, checkTimeline } from "./lib/timeline";
import { planVoice, voiceEpisode } from "./lib/voice";
import { auditVisuals, formatVisualReport } from "./lib/visuals";

const hashScript = (s: Script) => createHash("sha256").update(JSON.stringify(s)).digest("hex").slice(0, 16);

function fail(issues: Issues, title: string) {
  issues.print(title);
  if (issues.errors.length) throw new PipelineError(`${title} failed with ${issues.errors.length} error(s)`);
}

const checked = new Map<string, ReturnType<typeof runCheck>>();
/** Lint once per process; later stages reuse the result instead of re-printing warnings. */
function check(slug: string, strictWarnings = false) {
  const key = `${slug}:${strictWarnings}`;
  if (!checked.has(key)) checked.set(key, runCheck(slug, strictWarnings));
  return checked.get(key)!;
}

function runCheck(slug: string, strictWarnings: boolean) {
  const issues = new Issues();
  const ep = loadEpisode(slug, issues);
  if (!ep) { fail(issues, "check"); throw new PipelineError("unreachable"); }
  const lint = lintEpisode(slug, ep.script, ep.research);
  issues.list.push(...lint.list);
  if (strictWarnings) for (const w of issues.warnings) w.level = "error";
  fail(issues, "check");
  return ep;
}

/** Load the built timeline and make sure it matches the current script. */
function loadTimeline(slug: string, script: Script): Timeline {
  const p = paths(slug);
  if (!existsSync(p.timeline)) throw new PipelineError(`no timeline yet; run: npm run ep -- voice ${slug}`);
  const t = JSON.parse(readFileSync(p.timeline, "utf8")) as Timeline;
  if (t.scriptHash !== hashScript(script)) throw new PipelineError("script.json changed since the voice-over was built; re-run voice");
  fail(checkTimeline(t), "timeline");
  return t;
}

async function voice(slug: string, mock: boolean, spend: boolean) {
  const { script } = check(slug);
  const voiced = await voiceEpisode(slug, script, { mock, spend });
  const timeline = buildTimeline(script, voiced, mock, hashScript(script));
  fail(checkTimeline(timeline), "timeline");
  const p = paths(slug);
  mkdirSync(p.publicDir, { recursive: true });
  writeFileSync(p.timeline, JSON.stringify(timeline, null, 1));
  console.log(`voice: timeline ${(timeline.durationInFrames / timeline.fps / 60).toFixed(2)} min, ${timeline.scenes.length} scenes${mock ? " (MOCK)" : ""}`);
  return timeline;
}

async function stills(slug: string) {
  const { script } = check(slug);
  const files = await renderSceneStills(slug, loadTimeline(slug, script));
  console.log(`stills: ${files.length} written to ${paths(slug).stillsDir}`);
}

async function render(slug: string) {
  const { script, research } = check(slug);
  const t = loadTimeline(slug, script);
  const p = paths(slug);
  console.log("render: video…");
  await renderEpisode(slug, t);
  console.log("render: mastering audio to -14 LUFS…");
  await master(slug);
  console.log(`render: ${script.thumbnail.length} thumbnail variant(s)…`);
  await renderThumbnails(slug, script.thumbnail);
  const description = buildDescription(script, research, t);
  writeFileSync(p.description, description);
  writeFileSync(p.upload, JSON.stringify(buildUploadMeta(script, description), null, 2));
  console.log(`render: done → ${p.outDir}`);
}

async function qc(slug: string, allowMock: boolean) {
  const { script } = check(slug);
  const t = loadTimeline(slug, script);
  const { issues, report } = await qcEpisode(slug, t, allowMock, script.thumbnail.length);
  writeFileSync(paths(slug).qcReport, JSON.stringify(report, null, 2));
  fail(issues, "qc");
  console.log("qc: PASS");
}

function scaffold(slug: string) {
  const p = paths(slug);
  if (existsSync(p.episodeDir)) throw new PipelineError(`${p.episodeDir} already exists`);
  mkdirSync(p.episodeDir, { recursive: true });
  const template = (name: string) => readFileSync(new URL(`./templates/${name}`, import.meta.url), "utf8").replaceAll("{{slug}}", slug).replaceAll("{{today}}", new Date().toISOString().slice(0, 10));
  writeFileSync(p.script, template("script.json"));
  writeFileSync(p.research, template("research.json"));
  console.log(`created ${p.script}\ncreated ${p.research}`);
}

async function main() {
  const [cmd, slug, ...rest] = process.argv.slice(2);
  const flag = (f: string) => rest.includes(`--${f}`);
  if (!cmd || !slug) {
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]);
    process.exit(1);
  }
  switch (cmd) {
    case "new": return scaffold(slug);
    case "check": {
      const { script } = check(slug, flag("strict"));
      const plan = planVoice(slug, script);
      console.log(`voice plan: ${plan.toGenerate} scene(s) / ${plan.characters} characters to generate, ${plan.cached} cached`);
      console.log(formatVisualReport(auditVisuals(script)));
      return;
    }
    case "voice": return void (await voice(slug, flag("mock"), flag("spend")));
    case "stills": return stills(slug);
    case "render": return render(slug);
    case "qc": return qc(slug, flag("allow-mock"));
    case "build":
      await voice(slug, flag("mock"), flag("spend"));
      await stills(slug);
      await render(slug);
      return qc(slug, flag("allow-mock"));
    default:
      throw new PipelineError(`unknown command "${cmd}"`);
  }
}

main().catch((e) => {
  console.error(`\n✖ ${e instanceof PipelineError ? e.message : (e as Error).stack}`);
  process.exit(1);
});
