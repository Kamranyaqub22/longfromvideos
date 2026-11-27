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

### Plan what the viewer SEES (visual audit, part of `check`)

A script that is mostly text cards looks like a news bulletin. For every scene ask: *what does the viewer see?*
If the narration names something drawable (a rocket, satellites, the Earth, a data centre, heat, a trade route),
show it with an illustrated template, not a quote or bullet card. `check` measures screen time by kind and enforces it:

| rule | warning | error |
|---|---|---|
| text cards (headline, quote, bullets, and hook/chapter/outro without `visual`) | > 35% | > 50% |
| illustrated (globe, launch, diagram, map, hook/chapter/outro with `visual`) | < 25% | – |
| longest stretch of text cards in a row | > 35 s | > 60 s |

It also warns, scene by scene, when narration mentions a drawable noun on a text card and names the template to use,
and prints `visuals: N% illustrated · N% data · N% text`. Thresholds live in `pipeline/lib/visuals.ts`.
Swapping a scene's template keeps its narration, so the cached voice is reused (0 credits).

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
| `map` | where things happen: countries, trade routes | `title`, `view` (`fit`/`world`), `highlights[{country,tone,label}]` (≤8), `routes[{from,to,label,tone}]` (≤5), `source` |
| `linechart` | a real series over time (prices, rates) | `title`, `points[{label,value}]` (3–120), `prefix`, `suffix`, `decimals`, `annotations[{index,text}]` (≤2), `source` |
| `globe` | satellites, orbits, "the whole planet", scale | `title`, `satellites{from,to,label,counter}` (counter is an on-screen number: cite it), `rings[{label}]` (≤3), `highlights[{country,tone}]`, `note`, `source` |
| `launch` | rockets, launch cost, "getting to orbit" | `title`, `stat{value,prefix,suffix,decimals,label}`, `note`, `source` |
| `diagram` | how a thing works, part by part | `illustration` (`satellite`, `datacenter`, `heat`, `sunlight`), `callouts[{part,text}]` (≤4; parts per drawing in `DIAGRAM_PARTS`), `title`, `source` |

`hook`, `chapter` and `outro` take an optional `visual` backdrop (`globe`, `rocket`, `satellite`, `datacenter`, `heat`,
`sunlight`). Illustrations are generic code-drawn objects (`src/illustrations/`): no real vehicles' liveries, logos or
people. To add a drawing, add it to `src/illustrations/Diagrams.tsx` with its anchor points and to `DIAGRAM_PARTS`.

Map notes: country names are checked by `check` (aliases like "USA", "UK", "UAE" work; typos get
suggestions). The map centres itself on the story (US–Asia → Pacific), frames mainlands (France without
French Guiana), and rings tiny countries (Singapore). Geometry is Natural Earth, bundled; no tiles, no API keys.
Line charts: every point must come from a cited source; never interpolate or smooth missing data.

### Thumbnails

`thumbnail` is one object or up to 3 variants (`layout`: `number` = huge figure, `statement` = headline +
badge + arrow). Variants render to `thumbnail.png`, `thumbnail-2.png`, `thumbnail-3.png` for YouTube's
"Test & compare". Make variants genuinely different angles (number vs. question vs. consequence).
Every number on a thumbnail must exist in research.json (lint warns).
Give every variant a `visual` (`globe`, `rocket`, `satellite`, `datacenter`, `heat`, `sunlight`): one big bright drawing
on the right, 2–3 huge words on the left. Text-only thumbnails don't stand out in the feed. Each drawing is rendered at
its most dramatic frame (`THUMB_FRAMES` in `src/schema.ts`).

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

## Remotion agent skills (`.claude/skills/remotion-*`)

Official skills from remotion-dev/skills, pinned in `skills-lock.json`. Load the relevant one before
writing Remotion code: `remotion-markup` (animation rules), `remotion-maps` (map scenes),
`remotion-elements` (ready-made charts/titles), `remotion-captions`, `remotion-docs` (search the docs).
Our conventions win where they differ: scene content comes from `script.json`, not hard-coded markup,
and media components come from `@remotion/media`.

## Verifying changes

- `npm run typecheck` and `npm test`: fast, run after any change.
- `npm run verify`: typecheck + tests + full mock build of the fixture through QC (~6 min).
- `npm run ep -- build voice-smoke`: real-audio path from cached audio (no credits).

## Environment notes

- Fonts are bundled in `public/fonts` (offline, deterministic renders). Don't switch to Google Fonts loading.
- Renders use the pre-installed headless Chromium when present (`pipeline/lib/paths.ts`); override with `REMOTION_BROWSER`.
- Render speed here: ~2.2× real time on 4 cores (a 10-minute episode ≈ 20–25 minutes).
- ElevenLabs: in cloud sessions the proxy injects the key (requests must carry no key header);
  locally set `ELEVENLABS_API_KEY`.
- Remotion license: free for individuals and teams of up to 3 people; a company license is needed beyond that.
