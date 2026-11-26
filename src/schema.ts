/**
 * Single source of truth for episode data.
 * Used by the Remotion compositions (types) and by the pipeline (runtime validation).
 * Text-length limits here are layout limits: if a value passes, it fits on screen.
 */
import { z } from "zod";

export const Tone = z.enum(["up", "down", "neutral", "accent"]);
export type Tone = z.infer<typeof Tone>;

const str = (max: number) => z.string().trim().min(1).max(max);

// ---------------------------------------------------------------- research

export const Source = z.object({
  outlet: str(60),
  url: z.string().url(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").optional(),
});

export const Fact = z.object({
  id: z.string().regex(/^f\d+$/, "fact ids look like f1, f2, ..."),
  claim: str(400),
  sources: z.array(Source).min(1),
  /** How the claim may be used in narration. */
  status: z.enum(["verified", "single-source", "disputed"]),
  notes: z.string().optional(),
});
export type Fact = z.infer<typeof Fact>;

export const Research = z.object({
  topic: str(200),
  researchedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  facts: z.array(Fact).min(1),
});
export type Research = z.infer<typeof Research>;

// ---------------------------------------------------------------- scenes

const sceneBase = {
  /** Text the narrator reads while this scene is on screen. */
  narration: str(1200),
  /** Fact ids from research.json backing any factual claim in the narration. */
  facts: z.array(z.string()).default([]),
  /** Starts a new YouTube chapter at this scene. */
  chapter: str(60).optional(),
};

export const HookScene = z.object({
  type: z.literal("hook"),
  ...sceneBase,
  props: z.object({ lines: z.array(str(28)).min(1).max(4), accent: str(28).optional() }),
});
export const HeadlineScene = z.object({
  type: z.literal("headline"),
  ...sceneBase,
  props: z.object({ source: str(40), date: str(30), headline: str(120), dek: str(160).optional() }),
});
export const BigNumberScene = z.object({
  type: z.literal("bignumber"),
  ...sceneBase,
  props: z.object({
    value: z.number().finite(),
    prefix: z.string().max(3).optional(),
    suffix: z.string().max(4).optional(),
    decimals: z.number().int().min(0).max(2).default(0),
    label: str(70),
    tone: Tone.default("accent"),
    note: str(90).optional(),
  }),
});
export const BarChartScene = z.object({
  type: z.literal("barchart"),
  ...sceneBase,
  props: z.object({
    title: str(60),
    bars: z
      .array(z.object({ label: str(18), value: z.number().finite().nonnegative(), display: str(12).optional(), tone: Tone.optional() }))
      .min(2)
      .max(7),
    source: str(80).optional(),
  }),
});
export const DropScene = z.object({
  type: z.literal("drop"),
  ...sceneBase,
  props: z.object({
    title: str(50),
    fromLabel: str(30),
    toLabel: str(30),
    pct: z.number().finite().min(-100).max(1000).refine((v) => v !== 0, "pct must not be 0"),
    note: str(90).optional(),
    source: str(80).optional(),
  }),
});
export const TimelineScene = z.object({
  type: z.literal("timeline"),
  ...sceneBase,
  props: z.object({ title: str(50), events: z.array(z.object({ date: str(16), text: str(60) })).min(2).max(5) }),
});
export const QuoteScene = z.object({
  type: z.literal("quote"),
  ...sceneBase,
  props: z.object({ text: str(220), author: str(40), role: str(60).optional() }),
});
export const BulletsScene = z.object({
  type: z.literal("bullets"),
  ...sceneBase,
  props: z.object({ title: str(50), items: z.array(str(60)).min(2).max(5) }),
});
export const ChapterScene = z.object({
  type: z.literal("chapter"),
  ...sceneBase,
  props: z.object({ number: z.number().int().min(1).max(20), title: str(40) }),
});
export const OutroScene = z.object({
  type: z.literal("outro"),
  ...sceneBase,
  props: z.object({ title: str(50), cta: str(60).optional() }),
});

export const Scene = z.discriminatedUnion("type", [
  HookScene,
  HeadlineScene,
  BigNumberScene,
  BarChartScene,
  DropScene,
  TimelineScene,
  QuoteScene,
  BulletsScene,
  ChapterScene,
  OutroScene,
]);
export type Scene = z.infer<typeof Scene>;
export type SceneType = Scene["type"];
export type SceneOf<T extends SceneType> = Extract<Scene, { type: T }>;

export const ThumbnailProps = z.object({
  top: str(30),
  big: str(12),
  bottom: str(36).optional(),
  tone: Tone.default("down"),
});
export type ThumbnailProps = z.infer<typeof ThumbnailProps>;

export const Voice = z.object({
  voiceId: z.string().default("dPah2VEoifKnZT37774q"), // "Knox Dark – Serious, Deep, Steady"
  modelId: z.string().default("eleven_multilingual_v2"),
  stability: z.number().min(0).max(1).default(0.45),
  similarity: z.number().min(0).max(1).default(0.8),
  style: z.number().min(0).max(1).default(0.15),
  speed: z.number().min(0.7).max(1.2).default(1.0),
});
export type Voice = z.infer<typeof Voice>;

export const Script = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case"),
  /** YouTube title hard limit is 100 characters. */
  title: str(100),
  /** One-paragraph summary used at the top of the description. */
  summary: str(1000),
  tags: z.array(str(30)).max(30).default([]),
  voice: Voice.prefault({}),
  thumbnail: ThumbnailProps,
  scenes: z.array(Scene).min(3),
});
export type Script = z.infer<typeof Script>;

// ---------------------------------------------------------------- timeline (generated)

export const Word = z.object({ text: z.string(), start: z.number(), end: z.number() });
export type Word = z.infer<typeof Word>;

export type TimedScene = Scene & {
  /** Path relative to public/, used with staticFile(). */
  audio: string;
  startFrame: number;
  durationInFrames: number;
  /** Word timings in seconds relative to the scene start. */
  words: Word[];
};

export type Timeline = {
  slug: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  /** True when built with placeholder (silent) audio: never publishable. */
  mock: boolean;
  /** Hash of the script.json it was built from; used to detect a stale timeline. */
  scriptHash: string;
  scenes: TimedScene[];
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
