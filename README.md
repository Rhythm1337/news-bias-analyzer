# News Bias Analyzer

Paste a news article URL or text and get an AI-generated analysis — political bias, emotional tone, factual reliability, fake-news likelihood, summary, and red flags. Built as a cybersecurity course project; the angle is misinformation as a social-engineering threat.

## Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind v4, Motion (animations), lucide-react (icons) — `frontend/`
- **Backend:** Python + FastAPI — `backend/`
- **Database:** PostgreSQL (cloud — Aiven, Neon, Supabase, Railway, etc.)
- **AI:** Gemini 2.5 Flash via the `google-genai` SDK; provider interface is pluggable

## Local development

### Prerequisites
- Node.js 20+
- Python 3.12+
- A cloud Postgres URL (Neon free tier works great)

### First-time setup

```sh
npm run setup
copy backend\.env.example backend\.env       # then fill in DATABASE_URL + GEMINI_API_KEY
copy frontend\.env.local.example frontend\.env.local
```

`.env` example values:

```
DATABASE_URL=postgresql+psycopg://USER:PASS@HOST/DBNAME?sslmode=require
GEMINI_API_KEY=your-key
CORS_ORIGIN=http://localhost:3000
AI_PROVIDER=gemini
```

> If your provider gives you `postgres://...`, change the prefix to `postgresql+psycopg://` so SQLAlchemy uses the right driver.

### Daily dev

```sh
npm run dev
```

Custom orchestrator at [`scripts/dev.mjs`](scripts/dev.mjs) starts both services and auto-restarts a child if Windows console signals kill it during reload.

Open http://localhost:3000.

### Other scripts

| Command | Does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` on the frontend |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run setup:backend` | Re-create Python venv from `requirements.txt` |

---

## Deploying

The app is two services — frontend on **Vercel**, backend on **Railway**, talking to a cloud Postgres.

### 1. Push to GitHub first

See the GitHub section below — both Vercel and Railway import directly from a GitHub repo.

### 2. Backend on Railway

1. Sign in to https://railway.app with GitHub.
2. **New Project → Deploy from GitHub repo** → pick this repo.
3. In the service settings, set **Root Directory** to `backend`. Railway will detect Python via `requirements.txt` and the `Procfile`.
4. Add environment variables (Variables tab):
   - `DATABASE_URL` — your Aiven/Neon Postgres URL (with `postgresql+psycopg://` prefix)
   - `GEMINI_API_KEY` — your key
   - `AI_PROVIDER=gemini`
   - `CORS_ORIGIN` — temporarily `https://*.vercel.app` until you have a real frontend URL; replace later
5. After it deploys, click "Generate Domain" to get a public URL like `https://your-backend.up.railway.app`.
6. Verify: open `https://your-backend.up.railway.app/ping` — should return JSON with `db_ok: true`.

Files involved:
- [`backend/Procfile`](backend/Procfile) — start command
- [`backend/railway.json`](backend/railway.json) — healthcheck on `/ping`, restart-on-failure
- [`backend/.python-version`](backend/.python-version) — Python 3.12 (Railway's nixpacks builder reads this)

### 3. Frontend on Vercel

1. Sign in to https://vercel.com with GitHub.
2. **Add New → Project** → import this repo.
3. **Root Directory: `frontend`** (critical — this is a monorepo).
4. Framework should auto-detect as Next.js. Build command and output directory will fill in.
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` — your Railway URL from step 2 (e.g. `https://your-backend.up.railway.app`)
6. Deploy. You'll get a URL like `https://your-app.vercel.app`.

Files involved:
- [`frontend/vercel.json`](frontend/vercel.json) — explicit framework hint

### 4. Tighten CORS

Once you have your Vercel URL, go back to Railway → service → Variables and update:

```
CORS_ORIGIN=https://your-app.vercel.app
```

The backend supports comma-separated origins, so add preview URLs as you need them:

```
CORS_ORIGIN=https://your-app.vercel.app,https://your-app-git-main-you.vercel.app
```

### 5. Custom domain (optional)

Both Vercel and Railway support custom domains under "Settings → Domains". Vercel issues SSL automatically. After connecting a domain (e.g. `news-bias.example.com`), update `NEXT_PUBLIC_API_URL` (frontend) and `CORS_ORIGIN` (backend) accordingly.

---

## Pushing to GitHub

```sh
# from repo root, first time only
git add .
git commit -m "Initial commit: News Bias Analyzer v1"
git branch -M main

# Create the empty repo on GitHub first (no README, no .gitignore — we have ours).
# Then:
git remote add origin https://github.com/YOUR-USERNAME/news-bias-analyzer.git
git push -u origin main
```

**Before committing, double-check:**

```sh
git status
```

You should NOT see any of these in the list:
- `backend/.env`
- `frontend/.env.local`
- `backend/.venv/`
- `node_modules/`
- `.next/`

If you do, your `.gitignore` isn't being applied — stop and check.

---

## Architecture / security notes

- **Pluggable AI provider** — `backend/app/ai/base.py` defines an `AIProvider` ABC; current implementation is `gemini.py`. Swap by setting `AI_PROVIDER` env var (currently only `gemini` is wired).
- **Prompt-injection defense** — articles are wrapped in untrusted-data delimiters; the system prompt instructs the model to treat the content between markers as data, not instructions; delimiter tokens are stripped from input; length is capped.
- **SSRF protection** — URL fetching validates scheme (http/https only), resolves hostname, rejects private/loopback/link-local/cloud-metadata IPs, and re-validates each redirect hop.
- **Rate limiting** — 20 requests/min per IP on `/analyze` via `slowapi`.
- **Schemas** — Gemini's structured-output is used (`response_schema=AnalysisResult`) so the model's output is type-validated by Pydantic.

## Roadmap

- v1 (current): URL/text analysis, source-credibility lookup, /learn page, prompt-injection defense.
- v1.5: Postgres-backed cache of analyses to cut Gemini cost.
- v2: Topic search (Reddit + News API), comparison view.
- v3: User accounts, history.
- v4: Replace Gemini with a self-trained model (slot in as new `AIProvider`).
