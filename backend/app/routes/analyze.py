import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, model_validator

from app.ai import AnalysisResult, get_provider
from app.config import settings
from app.rate_limit import limiter
from app.scraping.extract import ScrapeError, fetch_and_extract

log = logging.getLogger(__name__)
router = APIRouter()

MIN_TEXT_CHARS = 200
MAX_TEXT_CHARS = 50_000


class AnalyzeRequest(BaseModel):
    url: str | None = None
    text: str | None = None

    @model_validator(mode="after")
    def exactly_one(self) -> "AnalyzeRequest":
        url = (self.url or "").strip()
        text = self.text or ""
        if bool(url) == bool(text):
            raise ValueError("Provide exactly one of `url` or `text`.")
        self.url = url or None
        return self


class AnalyzeResponse(BaseModel):
    source_url: str | None = None
    title: str | None = None
    article_chars: int = Field(description="Length of the analyzed article text")
    analysis: AnalysisResult


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
def analyze(request: Request, req: AnalyzeRequest) -> AnalyzeResponse:
    title: str | None = None
    if req.url:
        try:
            article_text, title = fetch_and_extract(req.url)
        except ScrapeError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    else:
        article_text = req.text or ""
        stripped_len = len(article_text.strip())
        if stripped_len < MIN_TEXT_CHARS:
            raise HTTPException(
                status_code=422,
                detail=f"Article text must be at least {MIN_TEXT_CHARS} characters.",
            )
        if stripped_len > MAX_TEXT_CHARS:
            raise HTTPException(
                status_code=422,
                detail=f"Article text must be at most {MAX_TEXT_CHARS:,} characters.",
            )

    try:
        provider = get_provider()
        analysis = provider.analyze(article_text)
    except RuntimeError as exc:
        # Provider-raised, user-safe message (e.g. safety filter, truncation).
        log.warning("AI provider rejected request: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception:
        log.exception("AI provider failed unexpectedly")
        detail = "AI provider failed. Please try again." if not settings.debug else None
        raise HTTPException(status_code=502, detail=detail or "AI provider failed.")

    return AnalyzeResponse(
        source_url=req.url,
        title=title,
        article_chars=len(article_text),
        analysis=analysis,
    )
