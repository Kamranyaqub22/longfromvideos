export type Level = "error" | "warn";
export type Issue = { level: Level; where: string; msg: string };

export class Issues {
  list: Issue[] = [];
  error(where: string, msg: string) { this.list.push({ level: "error", where, msg }); }
  warn(where: string, msg: string) { this.list.push({ level: "warn", where, msg }); }
  get errors() { return this.list.filter((i) => i.level === "error"); }
  get warnings() { return this.list.filter((i) => i.level === "warn"); }
  print(title: string) {
    const icon = (l: Level) => (l === "error" ? "✖" : "⚠");
    console.log(`\n${title}: ${this.errors.length} error(s), ${this.warnings.length} warning(s)`);
    for (const i of this.list) console.log(`  ${icon(i.level)} [${i.where}] ${i.msg}`);
  }
}

export class PipelineError extends Error {}
