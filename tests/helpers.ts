import { readFileSync } from "node:fs";
import { Research, Script } from "../src/schema";

export const fixture = () => ({
  script: Script.parse(JSON.parse(readFileSync("episodes/pipeline-fixture/script.json", "utf8"))),
  research: Research.parse(JSON.parse(readFileSync("episodes/pipeline-fixture/research.json", "utf8"))),
});
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
export const msgs = (list: { level: string; msg: string }[], level: "error" | "warn") => list.filter((i) => i.level === level).map((i) => i.msg).join("\n");

/** First scene of a given type (tests must not depend on fixture order). */
export function sceneOf<T extends import("../src/schema").Scene["type"]>(script: import("../src/schema").Script, type: T) {
  const s = script.scenes.find((x) => x.type === type);
  if (!s) throw new Error(`fixture has no ${type} scene`);
  return s as Extract<import("../src/schema").Scene, { type: T }>;
}
