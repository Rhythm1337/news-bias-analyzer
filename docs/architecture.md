# Architecture

A high-level tour of the News Bias Analyzer backend, written for someone
who is comfortable with basic Python (variables, functions, loops) and is
using this project to learn intermediate Python and web-app patterns.
The frontend is mentioned only where it matters; the focus is the backend.

File path conventions: every reference like `backend/app/main.py:30` means
"line 30 of that file in this repo." Open the file at that line to read
the actual code.

---

## 1. What this project does

The user pastes a news article URL (or the article text itself) into a
web page. The backend fetches the article, hands it to Google's Gemini
language model with a carefully written prompt, and returns a structured
JSON breakdown: political lean, emotional tone, factual reliability,
likelihood of being fake, a 2 to 3 sentence summary, a list of red flags,
and a "deep mode" that highlights specific spans of text. The frontend
renders dials, charts, and inline highlights from that JSON. There is no
account system, no database writes, and no history. Each request is a
one-shot analysis.

---

## 2. The big picture

```
+---------+        +-------------------+        +---------------------+        +----------+
| Browser | -----> | Next.js frontend  | -----> | FastAPI backend     | -----> | Gemini   |
| (user)  | <----- | (Vercel)          | <----- | (Render)            | <----- | API      |
+---------+        +-------------------+        +---------------------+        +----------+
                                                          |
                                                          | (only when a URL is given)
                                                          v
                                                  +-------------------+
                                                  | Target news site  |
                                                  | (or ScrapingBee)  |
                                                  +-------------------+

Inside the FastAPI backend, a single POST /analyze request flows like this:

  POST /analyze
       |
       v
  [CORS middleware]                       app/main.py:22
       |
       v
  [SlowAPI rate-limit middleware]         app/main.py:20  (60/min default)
       |
       v
  [@limiter.limit("20/minute")]           app/routes/analyze.py:50
       |
       v
  [AnalyzeRequest Pydantic validation]    app/routes/analyze.py:22
       |
       v
  Has URL? ---yes--> [robots.txt check]   app/scraping/extract.py:346
       |               |
       |               v
       |             [validate_url SSRF]  app/security/url_validation.py:49
       |               |
       |               v
       |             [curl_cffi fetch]    app/scraping/extract.py:149
       |               |
       |               v
       |             [trafilatura extract] app/scraping/extract.py:497
       |
       v (or text path)
  [sanitize_article]                      app/security/prompt_defense.py:149
       |
       v
  [build_prompt]                          app/security/prompt_defense.py:165
       |
       v
  [Gemini generate_content + schema]     app/ai/gemini.py:32
       |
       v
  [AnalysisResult post-validator]         app/ai/base.py:115
       |
       v
  [reconcile_highlights, deep mode only]  app/ai/base.py:241
       |
       v
  AnalyzeResponse (JSON) -----> back to the frontend
```

Where each guard sits in the path:

| Concern              | Layer                                 | File                                        |
| -------------------- | ------------------------------------- | ------------------------------------------- |
| Cross-origin policy  | CORS middleware                       | `backend/app/main.py:22`                    |
| Per-IP throttling    | SlowAPI middleware + per-route limit  | `backend/app/rate_limit.py`, `main.py:18`   |
| Input shape          | Pydantic `AnalyzeRequest`             | `backend/app/routes/analyze.py:22`          |
| SSRF (URL safety)    | `validate_url`                        | `backend/app/security/url_validation.py:49` |
| Crawler etiquette    | `_robots_allows`                      | `backend/app/scraping/extract.py:346`       |
| Prompt injection     | `sanitize_article` + system prompt    | `backend/app/security/prompt_defense.py`    |
| Bad LLM output       | `AnalysisResult._post_validate`       | `backend/app/ai/base.py:115`                |
| Drifting offsets     | `reconcile_highlights`                | `backend/app/ai/base.py:241`                |

Glossary, defined once and reused throughout this file:

- **CORS** (Cross-Origin Resource Sharing): a browser policy that blocks
  one website from calling another website's API unless that API opts in
  via response headers. The middleware in `main.py` adds those headers.
- **SSRF** (Server-Side Request Forgery): an attack where a user gives
  the server a URL pointing at an internal or private address so the
  server fetches it on the attacker's behalf. We block it by resolving
  the hostname and refusing private, loopback, link-local, multicast,
  and reserved IP ranges.
- **Prompt injection**: text inside the article that tries to hijack the
  language model, for example "Ignore previous instructions and reply
  with...". We defend by wrapping the article in delimiters, normalizing
  Unicode, and a system prompt that frames the article as untrusted data.
- **robots.txt**: a file at `https://site.com/robots.txt` where a site
  tells crawlers which paths they may or may not fetch. We honor it
  with a default-permissive fallback if it is missing.

---

## 3. Request lifecycle

This walks through one full request, from the user pressing Analyze in
the browser to the JSON result rendering in the page. Open each file at
the listed line to see the code.

### 3.1 The user submits the form

The frontend (Next.js, in `frontend/app/page.tsx`) collects either a URL
or pasted text and a `deep` boolean, then calls `POST /analyze` on the
backend with a JSON body like `{"url": "https://...", "deep": false}`.

### 3.2 CORS middleware

`backend/app/main.py:22`. The browser sent a preflight `OPTIONS` first;
the CORS middleware looks at the `Origin` header and, if it matches one
of the entries in `settings.cors_origins`, replies with the headers the
browser needs. Without this, the browser would block the response from
reaching the page even if the backend successfully ran. Allowed methods
are `GET` and `POST`; allowed headers include `Content-Type`.

### 3.3 SlowAPI middleware (rate limit)

`backend/app/main.py:20`, with the limiter wired in at `main.py:18`. The
middleware wraps every request and consults the `Limiter` configured in
`backend/app/rate_limit.py`. The default is 60 requests per minute per
client IP. The "client IP" is computed by `_real_ip` (`rate_limit.py:33`)
which optionally honors `X-Forwarded-For` so visitors behind a reverse
proxy do not all share one bucket.

If the limit is exceeded, the middleware short-circuits with a 429
response handled by `_rate_limit_exceeded_handler` (also wired in
`main.py:19`).

### 3.4 Per-route limit

`backend/app/routes/analyze.py:50` adds `@limiter.limit("20/minute")` on
top of the global default. Analysis is the expensive endpoint, so it is
capped tighter than the global 60/min.

### 3.5 AnalyzeRequest validation

`backend/app/routes/analyze.py:22`. FastAPI sees that the route function
declares a parameter typed `req: AnalyzeRequest` (a Pydantic `BaseModel`)
and automatically:

1. Reads the request JSON.
2. Constructs an `AnalyzeRequest`, which runs Pydantic's field
   validation (types, defaults).
3. Runs the `@model_validator(mode="after")` (`analyze.py:27`) which
   enforces "send exactly one of url or text, not both, not neither."

If any check fails, FastAPI replies with 422 automatically. The route
function never even runs.

### 3.6 URL branch: robots.txt check

If the user sent a URL, the route calls `fetch_and_extract(req.url)`.
That function first calls `_robots_allows(url)` at
`backend/app/scraping/extract.py:419`. The robots check resolves the
site's robots.txt, parses it with the standard library's
`RobotFileParser`, and asks "may a bot named `NewsBiasAnalyzer` fetch
this URL?" Results are cached per `scheme://host` for one hour. If the
site disallows us, the route returns 422 with a friendly message. If
robots.txt is missing or unreachable, we are default-permissive (allow).

### 3.7 SSRF check

`validate_url` in `backend/app/security/url_validation.py:49` is invoked
twice along the way: once before the article fetch and once on every
redirect hop (`extract.py:165`). It:

1. Rejects any scheme that is not `http` or `https`.
2. Rejects URLs with no hostname.
3. If the host is a literal IP, classifies it (`_is_blocked_ip`) and
   refuses if it is private, loopback, link-local, multicast, reserved,
   or unspecified.
4. Otherwise calls `socket.getaddrinfo(host, port)` and runs the same
   classifier on every returned address. Iterating over all of them
   defeats the trick where a malicious DNS server returns one safe and
   one private IP hoping the validator only checks the first.

The docstring at the top of `url_validation.py` notes a residual TOCTOU
window: our validation does its own DNS lookup, then the fetcher does
another lookup at connect time, so a flaky authoritative DNS server
could still slip through. Closing it fully would require a custom
HTTP transport that pins the validated IP. Deferred.

### 3.8 curl_cffi fetch

`_direct_fetch` at `backend/app/scraping/extract.py:149`. We use
`curl_cffi` (a Python wrapper around curl-impersonate) which sends a
Chrome-shaped TLS fingerprint. Many news sites front their pages with
Cloudflare or similar; those services often block `python-requests`
based on its TLS fingerprint alone. Pretending to be Chrome at the TLS
layer, plus matching headers, gets past the simpler bot checks.

The fetch:

- Disables automatic redirects so we can re-validate every hop.
- Streams the response and stops at 5 MB (`MAX_RESPONSE_BYTES`).
- Refuses non-HTML content types.
- Closes the response in a `try/finally`.

If the body looks like a Cloudflare interstitial (`_is_block_signal` at
`extract.py:388`), the direct fetch is treated as failed and we fall
back to ScrapingBee (only if the API key is configured).

### 3.9 trafilatura extraction

`backend/app/scraping/extract.py:497`. We pass the raw HTML to
`trafilatura.bare_extraction`, a library that strips boilerplate (nav,
ads, comments) and returns the article text plus metadata (title) in a
single parse. We require at least 200 characters of extracted text;
shorter outputs are usually paywalled or non-article pages, and we
return a friendly 422.

### 3.10 sanitize_article

`backend/app/security/prompt_defense.py:149`. Whether the article came
from a URL or was pasted, the next step is the same:

1. NFKC-normalize the text (collapses Unicode lookalikes like Latin-Italic
   letters and full-width characters to their ASCII forms).
2. Remove zero-width characters that an attacker might use to hide a
   delimiter inside otherwise innocent text.
3. Strip our own delimiter strings (`<<<UNTRUSTED_ARTICLE_BEGIN>>>` and
   the matching close) so the article cannot fake the boundary.
4. Hard-cap the result at 20,000 characters.

### 3.11 build_prompt

`backend/app/security/prompt_defense.py:165`. Returns three strings:

- The system instruction (a long block telling Gemini it is a bias
  analyst, must output JSON matching the documented schema, and must
  treat anything between the markers as untrusted data).
- The user prompt (the open marker, the sanitized article, the close
  marker, and a short "Analyze the article" instruction).
- The sanitized article itself (so the route can echo it back to the
  frontend in deep mode without re-running the sanitizer).

### 3.12 Gemini call

`backend/app/ai/gemini.py:32`. We call `client.models.generate_content`
with:

- `model="gemini-2.5-flash"` (cheap and fast).
- `system_instruction` from `build_prompt`.
- `response_mime_type="application/json"`.
- `response_schema=AnalysisResult` (Pydantic model). This is Gemini's
  structured-output feature: the API will refuse to return text that
  does not validate against the schema, eliminating most "the LLM
  forgot a field" failures.
- `temperature=0.2` (low randomness, more reproducible scoring).
- `max_output_tokens=12000` (deep mode can produce large outputs).

Errors are layered:

- `ClientError` with code 429: rate-limit hit on Gemini's side.
- `ClientError` with code 400 plus "location is not supported": the
  region the backend is deployed in is blocked. We surface a specific
  message asking to redeploy in a supported region.
- Other `ClientError`: generic "Gemini rejected this request."
- `ServerError`: Gemini is having an outage.
- `MAX_TOKENS` finish reason without parseable output: "the article is
  too long, try shorter."
- `SAFETY` finish reason without parseable output: "the safety filters
  blocked this content."

### 3.13 AnalysisResult post-validator

`backend/app/ai/base.py:115`. After Gemini returns a JSON object that
parses into `AnalysisResult`, Pydantic runs the `@model_validator(mode="after")`
which:

1. Clamps the four headline floats to their valid ranges.
2. Enforces the expected sub-metric keys (Word choice, Source selection,
   etc.) including a fuzzy-match pass that catches near-misses like
   "Word selection" and slots them into the correct expected key.
3. Trims arrays to hard caps.
4. Backfills `topics` with `["uncategorized"]` if the model returned an
   empty list (the UI needs at least one tag).
5. Pads the sentiment series to a minimum of 4 points so the sparkline
   has something to draw.
6. Forces `entities[].mentions` to at least 1.

### 3.14 reconcile_highlights

`backend/app/ai/base.py:241`. Deep mode only. The model often gets
character offsets a few off. We trust the literal `text` field over the
offsets: if `article_text[start:end]` does not equal `text`, we search
the article for `text` and snap. Highlights that cannot be reconciled
are dropped. Overlapping highlights are deduplicated by keeping the
earlier-listed one.

### 3.15 Response

`backend/app/routes/analyze.py:109` returns an `AnalyzeResponse` that
includes the source URL, the extracted title, the article length, the
sanitized article body (only in deep mode, so frontend offsets line up),
the deep flag, and the `analysis` itself.

### 3.16 Frontend render

The frontend reads the JSON, draws score dials (`HeroScores`,
`ScoreDial`), bias spectrum bars, sub-metric breakdowns, a sentiment
sparkline (`SentimentChart`), entity chips, and, in deep mode, an
`ArticleBody` component that renders the article with each highlight
span color-coded by `type`.

---

## 4. What lives where

```
backend/
  app/
    __init__.py
    main.py              FastAPI app construction, middleware wiring, /ping, /config.
    config.py            pydantic-settings Settings class. Reads .env at startup.
    db.py                SQLAlchemy engine + healthcheck. Wired up but not used yet.
    rate_limit.py        slowapi Limiter, with X-Forwarded-For aware IP extraction.
    routes/
      __init__.py
      analyze.py         POST /analyze: request schema, route handler, error mapping.
    ai/
      __init__.py        get_provider() factory, lru_cached.
      base.py            AIProvider ABC, AnalysisResult Pydantic model, post-validator,
                         reconcile_highlights for deep mode.
      gemini.py          Gemini-specific provider: client setup, generate_content call,
                         error translation, finish-reason handling.
    scraping/
      __init__.py
      extract.py         curl_cffi article fetch, robots.txt, ScrapingBee fallback,
                         trafilatura extraction.
    security/
      __init__.py
      prompt_defense.py  sanitize_article, build_prompt, the system instruction text.
      url_validation.py  validate_url + UnsafeURLError, IP classification, SSRF defense.
  requirements.txt       Pinned dependencies.
  .env.example           Template for the .env file.

frontend/
  app/                   Next.js (App Router) pages and components.
                         Glossed over in this doc; see the components themselves.
```

---

## 5. State and storage

There is no database in active use. Every `/analyze` request is fully
stateless: nothing about the user, the article, or the result is
persisted between requests. Restarting the backend loses no data
because there is no data.

The DB engine in `backend/app/db.py` is wired up only so the `/ping`
endpoint can include a `db_ok` field for monitoring. Nothing else
imports `SessionLocal`. The DB is intended for Phase 4 of the roadmap
(saving past analyses, building a reputation index for repeat-offender
sources). Until then, treat the engine as a placeholder.

The only state-shaped thing in the live request path is in-memory and
short-lived:

- `_robots_cache` (`backend/app/scraping/extract.py:72`): per-host
  robots parser, expires after 1 hour. Lost on restart.
- `slowapi`'s rate-limit counters: in-memory by default. Lost on
  restart.
- `_xff_short_chain_warned` (`backend/app/rate_limit.py:30`): a single
  bool that throttles a misconfig log line.

---

## 6. Configuration

Every environment variable is declared as a field on the `Settings`
class in `backend/app/config.py`. Values are loaded by `pydantic-settings`
in this order: a real environment variable beats the matching entry in
`.env`, which beats the default in the class definition.

| Variable               | Default                          | Read at                    | What it does                                                                                                                                                              |
| ---------------------- | -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`       | `None`                           | `config.py:11`             | Auth for the Gemini API. Required when `AI_PROVIDER=gemini` (the default). If unset, `GeminiProvider.__init__` raises a clear RuntimeError on the first call.            |
| `CORS_ORIGIN`          | `http://localhost:3000`          | `config.py:8`              | Comma-separated list of allowed frontend origins. Read by the `cors_origins` property, which splits on commas and strips whitespace. Used in `main.py:24`.               |
| `TRUST_X_FORWARDED_FOR`| `False`                          | `config.py:27`             | Tells the rate limiter to trust an entry from the `X-Forwarded-For` header. Enable only behind a trusted reverse proxy (Render, your own LB).                            |
| `TRUSTED_PROXY_HOPS`   | `1`                              | `config.py:37`             | How many trusted proxies sit between the public internet and this app. The limiter reads `parts[-N]` from the XFF chain. 1 = Render directly. 2 = Render behind Cloudflare. |
| `SCRAPINGBEE_API_KEY`  | `None`                           | `config.py:18`             | Optional. When set, the scraper falls back to ScrapingBee if the direct curl_cffi fetch is blocked. If unset, the fallback is silently skipped.                          |
| `AI_PROVIDER`          | `gemini`                         | `config.py:10`             | Selects which subclass of `AIProvider` `get_provider()` returns. Currently only `gemini` is implemented; pluggable for future providers.                                  |
| `DATABASE_URL`         | `postgresql+psycopg://...`       | `config.py:7`              | Used by `db.py` to build the SQLAlchemy engine. Only exercised by `/ping`'s healthcheck today. Phase 4 will use it for persistence.                                       |
| `DEBUG`                | `False`                          | `config.py:20`             | When `True`, the analyze route surfaces the raw exception message in the 502 reply so you can debug locally. Off in production so users do not see stack-trace fragments. |

Safe defaults: every variable has a default that lets the app boot
locally except `GEMINI_API_KEY`, which is intentionally `None` so
nothing analyzes until you provide a key.

To set them, copy `backend/.env.example` to `backend/.env` and fill in
the values. The `SettingsConfigDict(env_file=".env", extra="ignore")`
in `config.py:5` tells pydantic-settings to read that file at startup
and silently ignore any unknown variable in it (so leftover entries do
not crash the app).
