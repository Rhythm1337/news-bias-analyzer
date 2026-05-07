# News Bias Analyzer

Paste a URL or article text, get back a structured analysis: political bias, emotional tone, factual reliability, fake-news likelihood, sentiment, summary, and red flags. Built with a security angle (misinformation as social engineering).

Live: [news-bias-analyzer.vercel.app](https://news-bias-analyzer.vercel.app)

## Stack

- **Frontend** Next.js 16, TypeScript, Tailwind v4, Motion, lucide-react
- **Backend** FastAPI on Python 3.12+, SQLAlchemy, slowapi, trafilatura, httpx
- **AI** Gemini 2.5 Flash via `google-genai`, behind a pluggable `AIProvider` interface
- **DB** Postgres (cloud)

## Run locally

```sh
npm run setup
cp backend/.env.example backend/.env       # then fill DATABASE_URL + GEMINI_API_KEY
cp frontend/.env.local.example frontend/.env.local
npm run dev
```

`npm run dev` starts the FastAPI backend on `:8000` and Next on `:3000` via a small Node orchestrator (`scripts/dev.mjs`) that survives Windows console signal weirdness during uvicorn reloads.

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

## Architecture

```
                         POST /analyze
  Next.js (frontend) ─────────────────────► FastAPI
        │                                      │
        │                                      ├─► trafilatura (URL extract)
        │                                      ├─► prompt-injection wrapping
        │                                      ├─► AIProvider.analyze()
        │                                      └─► Gemini structured output
        │
        ◄──────── AnalysisResult JSON ─────────┘
```

The `AIProvider` ABC ([`backend/app/ai/base.py`](backend/app/ai/base.py)) keeps the model swap surface tiny: drop in a new class, set `AI_PROVIDER` env var, done. Roadmap calls for a self-trained model later.

## Security

- **SSRF** Scheme allowlist (http/https), IP classification rejects private/loopback/link-local/cloud-metadata, per-redirect revalidation. ([`backend/app/security/url_validation.py`](backend/app/security/url_validation.py))
- **Prompt injection** Article wrapped in untrusted-data markers, delimiter tokens stripped, length capped, system prompt frames everything inside as data. Output validated against a Pydantic schema enforced via Gemini's `response_schema`. ([`backend/app/security/prompt_defense.py`](backend/app/security/prompt_defense.py))
- **Rate limiting** 20/min/IP on `/analyze` via slowapi.
- **Error hygiene** Internal exceptions logged server-side; clients get generic 502s.

## Deploying

Frontend on Vercel (root: `frontend/`, env: `NEXT_PUBLIC_API_URL`). Backend on Render (root: `backend/`, runtime auto-detected, env: `DATABASE_URL`, `GEMINI_API_KEY`, `AI_PROVIDER`, `CORS_ORIGIN`). Both auto-deploy from `main` on push.

Config files: [`frontend/vercel.json`](frontend/vercel.json), [`backend/Procfile`](backend/Procfile), [`backend/runtime.txt`](backend/runtime.txt).

## Roadmap

- Postgres-backed cache of analyses (cut Gemini cost on repeat URLs)
- Topic search (Reddit + News API), multi-source comparison
- Self-trained model as a second `AIProvider`
