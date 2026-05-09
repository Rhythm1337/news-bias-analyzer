# Frontend overview (light)

The owner asked for the backend in depth and the frontend at a basic level.
This file is the basic level. If you want to go deeper, the source is in
[frontend/app/](../frontend/app/) and the patterns are standard Next.js
App Router.

## Stack

- **Next.js 16 App Router**: file-based routing where any `page.tsx` becomes
  a route. Server-rendered HTML on first load, then React hydrates.
- **React 18**: function components, hooks, no class components anywhere.
- **TypeScript**: every component file is `.tsx`. Types live in
  [frontend/app/lib/types.ts](../frontend/app/lib/types.ts).
- **Tailwind v4**: utility CSS classes plus a custom design-token system in
  [globals.css](../frontend/app/globals.css). Light/dark themes are toggled
  by setting `data-mode` on `<html>`.
- **Motion** (the maintained successor to Framer Motion): used for the
  results enter/exit transitions and the WakingModal animation.
- **lucide-react**: icon set.

## Pages

Every route is a folder with a `page.tsx`:

```
frontend/app/
  page.tsx          /          home: input + results
  learn/page.tsx    /learn     field guide on bias / misinformation
  privacy/page.tsx  /privacy   privacy policy
  terms/page.tsx    /terms     terms of use
  contact/page.tsx  /contact   one-page contact card
  layout.tsx        wraps every page (fonts, theme bootstrap script, body)
  globals.css       design tokens for light + dark, all utility classes
  sitemap.ts        Next's sitemap.xml generator
  robots.ts         Next's robots.txt generator
```

The home page is the only complex one. The others are static text + a
shared Topbar.

## Component map

[frontend/app/components/](../frontend/app/components/) hosts every reusable
piece. Group by purpose:

**Status and shell**
- `Topbar.tsx`: brand mark + nav (Analyze / Report / Learn) + theme toggle.
- `BackendStatus.tsx`: small pill showing checking / waking / ready / down.
- `BackendToast.tsx`: top-of-page toast announcing the same state changes.
- `WakingModal.tsx`: full-screen accessible dialog during cold-start.
- `ThemeToggle.tsx`: light/dark switch backed by `localStorage`.

**Input**
- `SampleCards.tsx`: three click-to-load sample articles.
- `ProviderDropdown.tsx`: shows the active AI model with future options
  marked Coming Soon.
- `AboutPanel.tsx`: right-rail pitch and "what's coming" summary.

**Results**
- `HeroScores.tsx`: four big score cards (bias, tone, factuality, fake
  risk). Each uses `ScoreDial.tsx` for the circular ring.
- `BiasSpectrum.tsx`: horizontal -1 to +1 bar with a marker.
- `MiniScore.tsx`: sub-metric line under each axis. Detects backfilled
  zeros and shows a "no signal" pill.
- `SectionHeader.tsx`: shared eyebrow + serif title block.
- `SentimentChart.tsx`: paragraph-by-paragraph sentiment sparkline.
- `RedFlagChip.tsx`: pill with click-popover explaining each red flag.
- `SourceRatingCard.tsx`: AllSides + MBFC outlet ratings, when known.

**Article highlights (deep mode)**
- `ArticleBody.tsx`: renders the article with `<mark>` overlays per
  highlight. The popover with the model's "why this is flagged" note is
  rendered through `createPortal` so it isn't clipped by the article scroll
  container, with click-outside and Escape to close.
- `HighlightLegend.tsx`: tiny legend showing the six highlight types.

**Educational**
- `HowThisWorks.tsx`, `SpectrumPrimer.tsx`, `TechniqueAccordion.tsx`,
  `InfoTooltip.tsx`: used on the home page primer and the /learn page.

**Loading**
- `ResultsSkeleton.tsx`: skeleton placeholders shown while a request is in
  flight.

## State management

There is no global state library. The home page in
[page.tsx](../frontend/app/page.tsx) holds a few `useState` values:

| State | What it tracks |
|---|---|
| `mode` | input tab: `"url"` or `"text"` |
| `urlValue`, `textValue` | the actual input |
| `deep` | "deep analysis" toggle |
| `result` | the response from `/analyze` once it lands |
| `error` | last error message |
| `loading` | request in-flight |
| `minTextChars` | min characters server requires for text mode |

Two `useRef` slots:

- `abortRef`: the AbortController for the active request, so a new submit
  cancels the old one.
- `cancelReasonRef`: marker telling the catch block whether the abort came
  from a timeout (show a "took too long" message) or a deliberate cancel
  (stay silent).

The backend status (checking / ready / waking / down) lives in a small
hook at [useBackendStatus.ts](../frontend/app/lib/useBackendStatus.ts) so
the badge, toast, and modal all read the same source.

## Theming and design tokens

[globals.css](../frontend/app/globals.css) defines a CSS custom-property
system:

- Colors: `--bg`, `--paper`, `--ink`, `--ink-2`..`--ink-5`, `--rule`,
  `--rule-2`, `--accent`.
- Score-axis colors: `--c-bias`, `--c-tone`, `--c-fact`, `--c-fake` (each
  with a `-soft` variant for backgrounds).
- Fonts: `--display` (Playfair Display, serif), `--body` (Newsreader,
  serif), `--mono` (IBM Plex Mono).

Everything is set inside `:root` for light and overridden inside
`[data-mode="dark"]`. Components reference the variables (no hard-coded
hex values), so the dark theme works without per-component changes.

`@theme inline` at the top wires the tokens into Tailwind v4 so utilities
like `bg-foreground` resolve to `--ink`.

## How a request looks from the frontend's side

```
user types URL + clicks Analyze
   |
   v
submit() in page.tsx
   |
   |  abort old controller, create new one
   |  set up 30s timeout
   |  POST /analyze with { url|text, deep }
   |
   v
receive response
   |
   |  if ok: setResult(json)
   |  if AbortError + timeout: show "took too long"
   |  if AbortError + user cancel: stay silent
   |  else: show e.message (the backend's friendly error)
   |
   v
React re-renders -> Results component -> HeroScores + verdict + DeepDives
                  + SentimentChart + Topics/Entities + Summary +
                  RedFlags + (deep mode) ArticleBody + HighlightLegend
```

## A couple of things worth knowing

**No data store.** The frontend never saves anything. Refreshing the page
loses the result. That matches the privacy posture (we tell users
"nothing is saved").

**Cold start UX.** Render's free tier sleeps after idle. The first request
of the day takes ~60 seconds. The WakingModal + BackendToast + status pill
all trigger off the same hook and tell the user what's happening.

**Schema drift.** The TypeScript types in
[lib/types.ts](../frontend/app/lib/types.ts) mirror the backend's
`AnalysisResult` Pydantic model. They are NOT auto-generated; if you
change the backend schema, update the TS types by hand. JSDoc comments on
each numeric range help spot mismatches.

**A11y.** WakingModal is a real `role="dialog"` with focus trap and
Escape. ArticleBody marks have `role="button"`. Toast announcements use
`role="status"`. Theme toggle hides its icon until `mounted` to avoid
SSR/client hydration drift.

That's the whole frontend at a glance. The interesting code is in
`page.tsx`, `ArticleBody.tsx`, and `useBackendStatus.ts`. Read those three
and you've seen 80% of the application logic.
