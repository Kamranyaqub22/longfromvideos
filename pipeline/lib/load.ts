import { existsSync, readFileSync } from "node:fs";
import { Research, Script } from "../../src/schema";
import { Issues, PipelineError } from "./issues";
import { paths } from "./paths";

function readJson(file: string): unknown {
  if (!existsSync(file)) throw new PipelineError(`missing file: ${file}`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new PipelineError(`invalid JSON in ${file}: ${(e as Error).message}`);
  }
}

/** Parse script.json + research.json against the schema. Schema errors are collected into `issues`. */
export function loadEpisode(slug: string, issues: Issues) {
  const p = paths(slug);
  const s = Script.safeParse(readJson(p.script));
  const r = Research.safeParse(readJson(p.research));
  for (const [name, res] of [["script.json", s], ["research.json", r]] as const) {
    if (!res.success) for (const e of res.error.issues) issues.error(`${name}:${e.path.join(".") || "(root)"}`, e.message);
  }
  if (!s.success || !r.success) return null;
  return { script: s.data, research: r.data };
}
