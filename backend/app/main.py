import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.db import db_healthcheck
from app.rate_limit import limiter
from app.routes.analyze import MIN_TEXT_CHARS, router as analyze_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="News Bias Analyzer API", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(analyze_router)


@app.get("/ping")
def ping():
    db_ok = False
    try:
        db_ok = db_healthcheck()
    except Exception:
        logging.exception("DB healthcheck failed")

    payload = {
        "status": "ok",
        "service": "news-bias-analyzer-backend",
        "db_ok": db_ok,
        "ai_provider": settings.ai_provider,
    }
    return payload


@app.get("/config")
def app_config():
    """Public, non-sensitive configuration consumed by the frontend."""
    return {
        "min_text_chars": MIN_TEXT_CHARS,
    }
