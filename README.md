# News Bias Analyzer

Paste a URL or article text, get back a structured analysis: political bias, emotional tone, factual reliability, fake-news likelihood, sentiment, summary, and red flags. Built with a security angle (misinformation as social engineering).

Hosted demo: [news-bias-analyzer.vercel.app](https://news-bias-analyzer.vercel.app) (may not include your current local changes)

## Stack

- **Frontend** Next.js 16, TypeScript, Tailwind v4, Motion, lucide-react
- **Backend** FastAPI on Python 3.12+, SQLAlchemy, slowapi, trafilatura, httpx
- **AI & NLP** Pluggable `AIProvider` supporting:
  - **Gemini**: End-to-end Gemini 2.5 Flash via `google-genai`
  - **Hybrid**: Local NLP pipeline (spaCy NER, sentiment and emotion tone from your fine-tuned ONNX models when installed, otherwise HuggingFace RoBERTa; citation density) paired with Gemini synthesis
  - **ONNX (Local)**: 100% offline inference using four fine-tuned DistilBERT ONNX models (fake-news, political bias, emotion tone, sentiment; trained on Kaggle GPU, quantized to INT8) with zero external API calls
- **DB** Postgres (cloud)

## Run locally

```powershell
npm run setup
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
# Edit backend\.env and choose AI_PROVIDER=onnx or AI_PROVIDER=gemini.
# For Gemini, also set GEMINI_API_KEY; set DATABASE_URL to your Postgres connection.
npm run dev
```

You need Node.js and Python 3.12+. For `AI_PROVIDER=onnx`, put the exported model files and tokenizers in `backend/models/` before starting. The frontend defaults to the local backend at `http://localhost:8000`, so no frontend `.env.local` file is needed for local development. ONNX inference is local, but analyzing a URL still needs internet access to fetch the article; pasted text can be analyzed offline.

`npm run dev` starts the FastAPI backend on `:8000` and Next on `:3000` via a small Node orchestrator (`scripts/dev.mjs`) that survives Windows console signal weirdness during uvicorn reloads.

To switch AI providers, set `AI_PROVIDER` in `backend/.env`:
- `AI_PROVIDER=gemini` (Cloud LLM)
- `AI_PROVIDER=hybrid` (Local NLP + Gemini)
- `AI_PROVIDER=onnx` (100% Offline Local ML Models)

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

## Architecture

```
                         POST /analyze
  Next.js (frontend) ─────────────────────► FastAPI
        │                                      │
        │                                      ├─► trafilatura (URL extract)
        │                                      ├─► prompt-injection wrapping
        │                                      ├─► AIProvider.analyze()
        │                                      │     ├─► Gemini (pure LLM)
        │                                      │     ├─► Hybrid (spaCy + HF + Gemini)
        │                                      │     └─► ONNX (100% local fine-tuned models)
        │                                      └─► AnalysisResult JSON
        │
        ◄──────── AnalysisResult JSON ─────────┘
```

The `AIProvider` ABC ([`backend/app/ai/base.py`](backend/app/ai/base.py)) keeps the model swap surface tiny: drop in a new class, set `AI_PROVIDER` env var (`gemini`, `hybrid`, `onnx`, `openshift`), done.

## Fine-tuned models

Four small DistilBERT classifiers are trained on Kaggle's free GPU and exported as INT8 ONNX (about 64 MB each) for CPU inference.

| Model file | Dataset | Labels | Notebook |
|---|---|---|---|
| `fake_news` | LIAR | pants-fire ... true (6) | [`training/train_news_bias_models_fixed.ipynb`](training/train_news_bias_models_fixed.ipynb) |
| `political_bias` | AllSides, else BABE | left ... right (5) or neutral / biased (2) | same notebook |
| `emotion_tone` | GoEmotions (regrouped) | calm / neutral / charged / inflammatory | [`training/train_emotion_sentiment_models.ipynb`](training/train_emotion_sentiment_models.ipynb) |
| `sentiment` | TweetEval | negative / neutral / positive | same notebook |

Put the exported files (`<name>.onnx`, `<name>_labels.json`, `<name>_tokenizer/`) in `backend/models/`. `emotion_tone` and `sentiment` are loaded by [`backend/app/ai/local_classifiers.py`](backend/app/ai/local_classifiers.py); if they are missing, `nlp_pipeline.py` falls back to the pretrained HuggingFace models. See [`training/README.md`](training/README.md) for the full steps.

Limits: these are small, text-only models. LIAR accuracy is only about 25-30% on 6 classes, the tone label is derived from GoEmotions rather than hand-labelled, and the models were trained on short social-media text, so they are rougher on long news articles. `backend/models/` is git-ignored, so deployed servers need the files provided separately.

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
- Multi-source side-by-side comparison view
