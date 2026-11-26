# Long-form YouTube pipeline: business, economy & tech explainers (faceless)

Each episode is two JSON files written by Claude, turned into a finished, quality-checked video by code.

```
episodes/<slug>/research.json   fact ledger: every claim, its sources, its status
episodes/<slug>/script.json     scenes: narration + which visual template + cited fact ids
        │  npm run ep -- check   schema + editorial lint (free)
        │  npm run ep -- voice   ElevenLabs voice-over + word timings → public/episodes/<slug>/timeline.json
        │  npm run ep -- stills  one review still per scene → out/<slug>/stills/  (LOOK AT THEM)
        │  npm run ep -- render  video → loudness master → thumbnail → description
        ▼  npm run ep -- qc      automated QC → out/<slug>/qc-report.json
out/<slug>/video.mp4, thumbnail.png, description.txt, upload.json
```

`npm run ep -- build <slug> --spend` runs all of it and stops at the first error.

## Hard rules

1. **Never spend ElevenLabs credits without the user's go-ahead for that episode.** `voice` refuses to
   generate without `--spend`; use `--mock` (free, silent) while iterating. Run `check` first: it prints
   how many characters a voice run will cost. Audio is cached by narration text, so only changed scenes cost.
2. **Every factual claim is in research.json with real sources.** A fact is `verified` only with 2+
   independent outlets; otherwise `single-source` (narration must attribute it: "according to…") or
   `disputed` (must attribute, and avoid unless essential). Never invent numbers, quotes or dates.
   Never use secondary aggregator sites as the only source; prefer wire services, major outlets, filings.
3. **No realistic AI images or video of real people or real events.** Visuals are our own templates.
4. **No broadcaster footage, logos or music we don't have rights to.**
5. **Sober tone on tragedies or legal allegations.** Don't accuse people of crimes; say what is
   alleged, by whom. Sensational wording in titles/thumbnails limits ads (lint warns).
6. **Don't publish.** The pipeline stops at files ready for upload; the user uploads (or approves an upload).
7. Before handing over, look at the stills sheet yourself and read every lint/QC warning.

## Writing an episode (`npm run ep -- new <slug>` scaffolds it)

Research first (research.json), then the script. Target 8–15 minutes (~1,200–2,200 words).

Structure that holds attention:
- **Hook (≤15 s)**: the most surprising true fact + the question the video answers. No "welcome back".
- **Chapter scenes** every 1.5–3 minutes; each chapter opens with a mini-hook / open question.
- Change the visual every ~5–20 s: one scene ≈ 1–3 sentences. Lint warns above ~30 s.
- Data on screen (bignumber, barchart, drop) must use the exact figures from cited facts.
- End with "what happens next / what to watch" and a one-line outro. No financial advice.

### Scene templates (see `src/schema.ts` for exact props and length limits)

| type | use for | key props |
|---|---|---|
| `hook` | opening title cards | `lines` (≤4, ≤28 chars), `accent` |
| `headline` | "here's what was reported" | `source`, `date`, `headline`, `dek` |
| `bignumber` | one striking figure | `value`, `prefix`, `suffix`, `decimals`, `label`, `note`, `tone` |
| `barchart` | comparing 2–7 values | `title`, `bars[{label,value,display,tone}]`, `source` |
| `drop` | a move between two real data points | `title`, `fromLabel`, `toLabel`, `pct`, `source` |
| `timeline` | sequence of events (2–5) | `title`, `events[{date,text}]` |
| `quote` | a sourced quote | `text`, `author`, `role` |
| `bullets` | lists (2–5) | `title`, `items` |
| `chapter` | section break | `number`, `title` |
| `outro` | ending + CTA | `title`, `cta` |

Every scene: `narration`, `facts` (fact ids), optional `chapter` (starts a YouTube chapter; first scene
should be "Intro"; YouTube needs 3+ chapters, each ≥10 s).

Write narration for the ear: spell out awkward symbols ("percent", "billion"), short sentences, numbers
rounded the way a person would say them (on screen can be exact).

## Adding a new scene template

1. Add the zod schema to `src/schema.ts` (with text-length limits) and to the `Scene` union.
2. Add the component in `src/scenes/`, use `useSceneDuration()` (NOT `useVideoConfig().durationInFrames`,
   which is the whole video's length inside a Sequence).
3. Add it to the switch in `src/scenes/index.tsx` (TypeScript errors until you do).
4. Add it to `episodes/pipeline-fixture`, run `npm run ep -- stills pipeline-fixture`, look at it.
5. `npm run verify`.

## Verifying changes

- `npm run typecheck` and `npm test`: fast, run after any change.
- `npm run verify`: typecheck + tests + full mock build of the fixture through QC (~3 min).
- `npm run ep -- build voice-smoke`: real-audio path from cached audio (no credits).

## Environment notes

- Fonts are bundled in `public/fonts` (offline, deterministic renders). Don't switch to Google Fonts loading.
- Renders use the pre-installed headless Chromium when present (`pipeline/lib/paths.ts`); override with `REMOTION_BROWSER`.
- Render speed here: ~2.2× real time on 4 cores (a 10-minute episode ≈ 20–25 minutes).
- ElevenLabs: in cloud sessions the proxy injects the key (requests must carry no key header);
  locally set `ELEVENLABS_API_KEY`.
- Remotion license: free for individuals and teams of up to 3 people; a company license is needed beyond that.
