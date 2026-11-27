/**
 * Voice-over: one ElevenLabs request per scene, with word timings.
 * - Content-addressed cache: unchanged narration is never paid for twice.
 * - Credit pre-check and an explicit spend gate (--spend) before any paid call.
 * - Mock mode: no API calls, estimated timings, silent; for testing the pipeline for free.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EnvHttpProxyAgent, fetch } from "undici";
import type { Script, Voice, Word } from "../../src/schema";
import { PipelineError } from "./issues";
import { WORDS_PER_SECOND } from "./lint";
import { paths } from "./paths";
import { probeDuration } from "./proc";

const API = "https://api.elevenlabs.io";
// Local runs set ELEVENLABS_API_KEY. In a cloud session the proxy injects the key, and only when
// the request carries none, so never send a dummy key.
const KEY = process.env.ELEVENLABS_API_KEY;
// Honour HTTPS_PROXY / NO_PROXY when set (Node's built-in fetch ignores them); direct otherwise.
const dispatcher = new EnvHttpProxyAgent();

export type Voiced = { audio: string | null; duration: number; words: Word[] };

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

/** Turn ElevenLabs character timings into word timings (split on whitespace). */
export function alignmentToWords(a: Alignment): Word[] {
  const words: Word[] = [];
  let text = "", start = 0, end = 0;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (text) words.push({ text, start, end });
      text = "";
      return;
    }
    if (!text) start = a.character_start_times_seconds[i];
    text += ch;
    end = a.character_end_times_seconds[i];
  });
  if (text) words.push({ text, start, end });
  return words;
}

/** Evenly spaced placeholder timings at documentary pace. */
export function mockWords(narration: string, speed = 1): Voiced {
  const tokens = narration.trim().split(/\s+/);
  const step = 1 / (WORDS_PER_SECOND * speed);
  const words = tokens.map((t, i) => ({ text: t, start: 0.15 + i * step, end: 0.15 + i * step + step * 0.85 }));
  return { audio: null, duration: 0.3 + tokens.length * step, words };
}

/** Fields are listed explicitly so the key never depends on object key order. */
export const cacheKey = (text: string, v: Voice) => {
  const voice = { voiceId: v.voiceId, modelId: v.modelId, stability: v.stability, similarity: v.similarity, style: v.style, speed: v.speed };
  return createHash("sha256").update(JSON.stringify({ text, v: voice })).digest("hex").slice(0, 16);
};

async function api(pathname: string, init?: { method?: string; body?: string }, attempts = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(API + pathname, { ...init, dispatcher, headers: { ...(KEY ? { "xi-api-key": KEY } : {}), "Content-Type": "application/json" } });
      if (res.ok) return res;
      const retryable = res.status === 429 || res.status >= 500;
      const body = await res.text();
      if (!retryable || i >= attempts - 1) throw new PipelineError(`ElevenLabs ${res.status} on ${pathname}: ${body.slice(0, 300)}`);
    } catch (e) {
      if (e instanceof PipelineError || i >= attempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
  }
}

export async function remainingCredits(): Promise<number> {
  const s = (await (await api("/v1/user/subscription")).json()) as { character_limit: number; character_count: number };
  return s.character_limit - s.character_count;
}

export type VoicePlan = { cached: number; toGenerate: number; characters: number };

export function planVoice(slug: string, script: Script): VoicePlan {
  const p = paths(slug);
  let cached = 0, toGenerate = 0, characters = 0;
  for (const s of script.scenes) {
    if (existsSync(path.join(p.audioDir, `${cacheKey(s.narration, script.voice)}.json`))) cached++;
    else { toGenerate++; characters += s.narration.length; }
  }
  return { cached, toGenerate, characters };
}

/** Generate (or load from cache) the voice-over for every scene. */
export async function voiceEpisode(slug: string, script: Script, opts: { mock: boolean; spend: boolean }): Promise<Voiced[]> {
  if (opts.mock) return script.scenes.map((s) => mockWords(s.narration, script.voice.speed));

  const p = paths(slug);
  mkdirSync(p.audioDir, { recursive: true });
  const plan = planVoice(slug, script);
  console.log(`voice: ${plan.cached} scene(s) cached, ${plan.toGenerate} to generate (${plan.characters} characters)`);
  if (plan.toGenerate > 0) {
    const left = await remainingCredits();
    console.log(`voice: ElevenLabs credits remaining this period: ${left}`);
    if (plan.characters > left) throw new PipelineError(`needs ${plan.characters} characters but only ${left} remain`);
    if (!opts.spend) throw new PipelineError(`would spend ${plan.characters} ElevenLabs characters; re-run with --spend to confirm`);
  }

  const v = script.voice;
  const out: Voiced[] = [];
  for (const [i, s] of script.scenes.entries()) {
    const key = cacheKey(s.narration, v);
    const mp3 = path.join(p.audioDir, `${key}.mp3`);
    const meta = path.join(p.audioDir, `${key}.json`);
    if (!existsSync(meta) || !existsSync(mp3)) {
      console.log(`voice: scene ${i + 1}/${script.scenes.length} generating…`);
      const res = await api(`/v1/text-to-speech/${v.voiceId}/with-timestamps?output_format=mp3_44100_128`, {
        method: "POST",
        body: JSON.stringify({
          text: s.narration,
          model_id: v.modelId,
          voice_settings: { stability: v.stability, similarity_boost: v.similarity, style: v.style, speed: v.speed, use_speaker_boost: true },
          previous_text: script.scenes[i - 1]?.narration,
          next_text: script.scenes[i + 1]?.narration,
        }),
      });
      const data = (await res.json()) as { audio_base64: string; alignment: Alignment | null };
      if (!data.audio_base64 || !data.alignment) throw new PipelineError(`scene ${i + 1}: response missing audio or alignment`);
      writeFileSync(mp3, Buffer.from(data.audio_base64, "base64"));
      writeFileSync(meta, JSON.stringify({ narration: s.narration, voice: v, words: alignmentToWords(data.alignment) }));
    }
    const { words, narration } = JSON.parse(readFileSync(meta, "utf8")) as { words: Word[]; narration: string };
    if (narration !== s.narration) throw new PipelineError(`scene ${i + 1}: cache entry does not match narration`);
    const duration = await probeDuration(mp3);
    const last = words[words.length - 1];
    if (!last || last.end > duration + 0.25) throw new PipelineError(`scene ${i + 1}: word timings (${last?.end}s) exceed audio length (${duration}s)`);
    out.push({ audio: `${p.publicRel}/audio/${key}.mp3`, duration, words });
  }
  return out;
}
