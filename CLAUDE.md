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

Research first (research.json), then the script. Target 8–15 minutes (~1,300–2,300 words at the
house voice pace; `check` prints the estimate including scene pauses, and warns under 8 min).

### Picking a topic

Best fit: a story in this week's news that hides a *mechanism* most viewers haven't had explained
(how money, goods or rules actually flow), backed by primary documents, with numbers that chart and
places that map. Prefer policy/trade/markets over stories resting on allegations about a named person
(rule 5). Lead with the most counter-intuitive number in a primary source (e.g. a 10-K footnote).
Check the topic doesn't need a template we lack. Avoid stories about Anthropic (conflict of interest).

### Research workflow

- News aggregators and roundup sites are *leads only*: trace each claim to a filing, government page,
  wire story, major outlet or law-firm alert, and cite those.
- SEC filings: `curl -A "research contact@example.com" <edgar url>`, strip tags, grep for the line;
  quote the exact sentence in the claim.
- Keep each claim ≤400 chars (schema limit); split long ones. Put caveats in `notes`
  (paywalled original, which outlet relayed it, conflicting figures and how the script handles them).
- When outlets disagree on a date or figure, use the coarser value both support (month, not day).
- Quotes on screen must be verbatim from a page you actually read, not from a search snippet.

### Structure that holds attention (lint checks most of this; read every warning)

- **Frame 0 is the preview.** The opening scene renders its first line from frame 0 (no fade from
  black); check `out/<slug>/stills/00-first-frame.jpg`.
- **Cold open, no preamble.** Scene 1 lands the surprising fact in its first sentence (≤20 words).
  No "welcome back", "in this video", "let's dive in" (lint warns).
- **Ask the question inside the intro.** The intro (everything before the first chapter card) must
  contain the question the video answers, and should run ≤50 s. A second `hook` card with the
  question ("Where did the chips go?") works well as a pattern break.
- **Give a roadmap** right after the question (a `bullets` scene naming the parts): viewers stay for
  the part they want.
- **Chapters** every 1.5–3 min, each opening on a question ("So how did some still get there?").
  Lint warns when a chapter card's narration has no question or open loop.
- **Visual every ~5–15 s.** One scene ≈ 1–3 sentences. Lint warns at three of the same template in a
  row and when one template exceeds ~25% of scenes. Bullets are the default trap: turn lists of
  places into maps and lists of numbers into bar charts.
- **Escalate**: billing → court cases → vivid detail (e.g. prosecutors' "hair dryer" allegation) → the
  rule → who pays. Put a concrete, visual detail around the 40% mark when attention dips.
- **Fairness beat** early: give the subject's own explanation (in their words) before the doubts.
  It builds trust and keeps the video clear of rule 5.
- **End**: what to watch (dated), a 10–15 s "short version" recap card, then a one-line outro.
  No financial advice.
- Data on screen (bignumber, barchart, drop) must use the exact figures from cited facts.

### Voice: writing for the ear

- House voice settings (set in script.json `voice`): `stability 0.4, similarity 0.8, style 0.2,
  speed 1.05`. Measured: the narrator reads ~155 wpm at speed 1.0, so ~163 wpm at 1.05 (lively but
  clear for numbers). Lower stability/higher style = more expressive but less consistent; change
  them on a short paid test of 2–3 scenes before a full run.
- Sentences ≤30 words (lint warns); most should be 8–15. Vary length; a three-word sentence after a
  long one is how the voice "lands" a point ("Singapore." / "That proves nothing.").
- Say numbers the way a person would ("about two and a half billion dollars"); exact on screen.
- Attribution in the sentence itself ("prosecutors allege", "according to the Financial Times").

### Sound design

Sparse cues, synthesized by `npm run sfx` into `public/sfx/` (our own, no licensing): an impact
under the hook's first line and each big number, a whoosh on each chapter card. Each sits ~10 dB under
the narration (see `src/lib/sfx.ts`). There is no music bed yet: one would need a track we hold rights
to (or generated with a licence that covers YouTube), mixed ~20 dB under the voice.

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

Map notes: country names are checked by `check` (aliases like "USA", "UK", "UAE" work; typos get
suggestions). The map centres itself on the story (US–Asia → Pacific), frames mainlands (France without
French Guiana), and rings tiny countries (Singapore). Geometry is Natural Earth, bundled; no tiles, no API keys.
Line charts: every point must come from a cited source; never interpolate or smooth missing data.

### Thumbnails

`thumbnail` is one object or up to 3 variants (`layout`: `number` = huge figure, `statement` = headline +
badge + arrow). Variants render to `thumbnail.png`, `thumbnail-2.png`, `thumbnail-3.png` for YouTube's
"Test & compare". Make variants genuinely different angles (number vs. question vs. consequence).
Every number on a thumbnail must exist in research.json (lint warns).

Every scene: `narration`, `facts` (fact ids), optional `chapter` (starts a YouTube chapter; first scene
should be "Intro"; YouTube needs 3+ chapters, each ≥10 s).

Write narration for the ear: spell out awkward symbols ("percent", "billion"), short sentences, numbers
rounded the way a person would say them (on screen can be exact).

### Map tips (learned on ai-chip-loophole)

- At `view: "world"`, label at most one country per region; neighbouring labels collide.
- Statement thumbnails: keep `top` ≤17 chars so it doesn't orphan a word; tone `up`/`down` draws an
  arrow, so use `accent` when the story isn't a rise or fall.
- Well-sourced episodes overflow YouTube's 5,000-char description: the description then lists one
  source per fact, and `render` writes `sources-comment.txt` to pin under the video (also in upload.json).
- Multi-part countries anchor oddly (Malaysia's anchor sits in Borneo): start routes from a compact
  country (Singapore) or name the countries in the `title` instead of labelling each one.

## Episode log

| slug | topic | status |
|---|---|---|
| `ai-chip-loophole` | US licence rule for AI chips to SE Asia + Brazil (Nov 2026) | script + mock build + QC pass; awaiting voice go-ahead (~7,800 chars) |

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
- `npm run verify`: typecheck + tests + full mock build of the fixture through QC (~3 min).
- `npm run ep -- build voice-smoke`: real-audio path from cached audio (no credits).

## Environment notes

- Fonts are bundled in `public/fonts` (offline, deterministic renders). Don't switch to Google Fonts loading.
- Renders use the pre-installed headless Chromium when present (`pipeline/lib/paths.ts`); override with `REMOTION_BROWSER`.
- Render speed here: ~2.2× real time on 4 cores (a 10-minute episode ≈ 20–25 minutes).
- ElevenLabs: in cloud sessions the proxy injects the key (requests must carry no key header);
  locally set `ELEVENLABS_API_KEY`.
- Remotion license: free for individuals and teams of up to 3 people; a company license is needed beyond that.
