# Roadmap

This file tracks features that are designed but not yet implemented.

## Done

### Phase 1: Newsroom redesign
- Newsroom design tokens (Playfair Display, Newsreader, IBM Plex Mono, paper background)
- Light/dark toggle persisted in localStorage with no-flash bootstrap
- ScoreDial, BiasSpectrum, MiniScore, SectionHeader, HeroScores, SentimentChart primitives
- New Topbar with brand mark and primary nav (Search/Compare/History/Dashboard marked Soon)
- Rebuilt input card and results layout

### Phase 2: Richer analysis payload
- Extended `AnalysisResult` with `verdict`, `sub_bias`, `sub_tone`, `sub_fact`, `sub_fake`, `sentiment_series`, `entities`, `topics`
- Updated Gemini prompt + raised `max_output_tokens` to 4000
- Frontend renders sub-metrics per axis, sentiment trace, topic tags, entity list

### Polish: privacy / discoverability / scraper hygiene
- `/privacy`, `/terms`, `/contact` pages
- `app/sitemap.ts` and `app/robots.ts` for our own site
- Scraper now sends a real-browser User-Agent and friendly per-status error messages
- Backend honors target sites' `robots.txt` (1 hour in-process cache, permissive on fetch failure)

### Phase 3: Article highlights
- New `Highlight` type with char offsets, type tag, note, and an echoed `text` field for self-verification
- `AnalysisResult.highlights[]` field, populated only in deep mode (capped at 30 spans)
- New `deep: bool` flag on `POST /analyze`. Caps article at 7,500 chars (about 1,500 words) in deep mode; rejects oversized input up front
- Backend `reconcile_highlights()` post-processes the model output: validates offsets, snaps drifted ones via substring search, drops unreconcilable spans, removes overlaps
- `prompt_defense.build_prompt(deep=True)` appends an instruction block listing the six highlight types, requiring 10 to 25 non-overlapping spans with literal text echo
- Frontend deep-analysis checkbox in the input card. UI gates the new section on `data.deep && data.article_text && analysis.highlights.length > 0`
- New `ArticleBody` component renders the article with `<mark>` overlays and click-to-show note tooltips; `HighlightLegend` shows the six color codes
- CSS adds `.h-loaded`, `.h-tone`, `.h-source-good`, `.h-source-bad`, `.h-fact-good`, `.h-fact-bad` using `--c-tone` / `--c-fake` / `--c-fact` tokens with dashed borders for sourcing

## Coming next

### Phase 4: Persistence — History, Dashboard, Compare
Add an `analyses` table:
- `id` (uuid), `url`, `title`, `source_domain`, `created_at`
- `political_score`, `emotional_score`, `factual_score`, `fake_likelihood` (denormalized for queries)
- `analysis_json` (full result)

Endpoints:
- `POST /analyze` writes a row and returns `{ id, ... }`
- `GET /analyses` returns paginated history
- `GET /analyses/:id`
- `GET /analyses/stats` powers the Dashboard (KPIs, time series, source x topic heatmap)

Compare = analyze N URLs sequentially, render side-by-side from the response payloads. No new "find related" step on the backend.

### Phase 5: News feed via RSS
RSS-first approach (the same model Ground News uses). RSS feeds are publisher-published and intended for redistribution, so this avoids the ToS questions of fetching article HTML directly.

Backend job (cron or on-demand):
- Pull a curated set of RSS feeds (~30 outlets across the lean spectrum)
- For each item: store {source, headline, url, published_at, summary, lean_hint}
- Optionally pre-analyze a subset so the Search screen has scores already

Endpoints:
- `GET /feed?lean=&topic=&source=&q=` powers the Search screen
- `GET /feed/related?url=` returns recent items with overlapping topics (powers the "Related coverage" block on Report)

UI:
- Search screen shows the index with filters (lean, min trust, source, topic)
- Click an item to analyze it (existing flow)
- "Related coverage" appears under the verdict on Report

Notes: keep using a real browser User-Agent and honor robots.txt for any direct fetches (e.g. when a user clicks an item to analyze). RSS items themselves do not need fetching — the headline + summary in the feed is enough for indexing. Cache feed reads for 10-15 minutes per source. Skip feeds that 403 us.

### Phase 6: Tweaks panel
Floating panel from the design that lets you live-flip:
- vibe (newsroom / editorial / saas / terminal)
- mode (light / dark)
- density (compact / regular / comfy)
- accent
- results layout (scroll / tabs / sidebar)
- hero metric style (cards / trust / spectrum / radar)

Implementation note: tokens are already keyed off `data-mode`, so adding `data-vibe` and `data-density` is straightforward. The other axes need component-level branching.

### Phase 7: Source profile
Static curated data from `lib/sources.ts` plus an "outlet detail" screen with: ownership, AllSides + MBFC ratings over time, lean drift, top topics, top authors. No new API calls.

### Phase 8: Self-trained model
Long-term: replace Gemini with a fine-tuned classifier. The `AIProvider` interface already supports this. Targets: BERT-family for bias/tone heads, RoBERTa for fake-news, separate sentiment head. Train on AllSides + MBFC + LIAR datasets. Distill into a single small model for hosting cost.

## Won't ship
- Reader comments / community notes (out of scope for a class project)
- PDF export with full report (nice-to-have, low priority)
- Multi-language UI (analysis is multi-lingual already; UI stays English)
