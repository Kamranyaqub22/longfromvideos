import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import type { Tone } from "./schema";

// Fonts are bundled in public/fonts (SIL OFL) so renders are offline and deterministic.
const fonts: [string, string, string][] = [
  ["Inter", "400", "inter-latin-400-normal.woff2"],
  ["Inter", "600", "inter-latin-600-normal.woff2"],
  ["Inter", "800", "inter-latin-800-normal.woff2"],
  ["Anton", "400", "anton-latin-400-normal.woff2"],
];
for (const [family, weight, file] of fonts) {
  loadFont({ family, weight, url: staticFile(`fonts/${file}`), format: "woff2" });
}

export const body = "Inter, sans-serif";
export const display = "Anton, Impact, sans-serif";

export const C = {
  bg: "#0b0f1a",
  bg2: "#121a2b",
  panel: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.12)",
  text: "#f4f6fb",
  dim: "#9aa4b8",
  up: "#2fd27a",
  down: "#ff4d5e",
  accent: "#ffcc33",
  neutral: "#5aa9ff",
};

export const toneColor = (t: Tone = "neutral") => C[t];
