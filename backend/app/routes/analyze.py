import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError, model_validator

from app.ai import AnalysisResult, get_provider
from app.config import settings
from app.rate_limit import limiter
from app.scraping.extract import ScrapeError, fetch_and_extract

log = logging.getLogger(__name__)
router = APIRouter()

MIN_TEXT_CHARS = 200
# Must match prompt_defense.MAX_ARTICLE_CHARS so the route rejects oversized
# input up front instead of silently truncating it inside the prompt builder.
MAX_TEXT_CHARS = 20_000
# Deep mode (highlights) is far more output-token-hungry. Cap input lower.
MAX_DEEP_CHARS = 7_500


class AnalyzeRequest(BaseModel):
    url: str | None = None
    text: str | None = None
    deep: bool = False

    @model_validator(mode="after")
    def exactly_one(self) -> "AnalyzeRequest":
        url = (self.url or "").strip()
        text = self.text or ""
        if bool(url) == bool(text):
            raise ValueError("Please send either a URL or article text, not both.")
        self.url = url or None
        return self


class AnalyzeResponse(BaseModel):
    source_url: str | None = None
    title: str | None = None
    article_chars: int = Field(description="Length of the analyzed article text")
    article_text: str | None = Field(
        default=None,
        description="Echoed article body, populated only when deep mode is on.",
    )
    deep: bool = False
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
                detail=f"Article text must be at least {MIN_TEXT_CHARS} characters long. Please paste a longer article.",
            )
        if stripped_len > MAX_TEXT_CHARS:
            raise HTTPException(
                status_code=422,
                detail=f"Article text must be {MAX_TEXT_CHARS:,} characters or less. Please trim the text.",
            )

    if req.deep and len(article_text) > MAX_DEEP_CHARS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Deep analysis only works with articles up to {MAX_DEEP_CHARS:,} characters "
                f"(about 1,500 words). Your article is {len(article_text):,} characters. "
                "Please turn off deep mode or shorten the text."
            ),
        )

    try:
        provider = get_provider()
        analysis, sanitized = provider.analyze(article_text, deep=req.deep)
    except RuntimeError as exc:
        # Provider-raised, user-safe message (e.g. safety filter, truncation).
        log.warning("AI provider rejected request: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValidationError as exc:
        # The AI returned a structured response that failed Pydantic validation
        # (even after the post-validator's backfills). Surface a specific 502
        # so users know to retry, and log the details for debugging.
        log.warning("AI response failed validation: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="AI response failed validation. Please try again.",
        ) from exc
    except Exception:
        log.exception("AI provider failed unexpectedly")
        detail = "The AI service did not respond. Please try again in a moment." if not settings.debug else None
        raise HTTPException(status_code=502, detail=detail or "The AI service did not respond.")

    # When deep, echo the SANITIZED article back so frontend offsets line up
    # with what the model actually saw. The provider already produced this
    # string (build_prompt's third return value), so we reuse it instead of
    # running sanitize_article a second time.
    echoed = sanitized if req.deep else None

    # article_chars must describe the SAME string the frontend will offset
    # against. In deep mode that is `echoed` (the sanitized + truncated body
    # the model saw), not the raw extract; sanitize_article inside
    # build_prompt may have trimmed it past MAX_ARTICLE_CHARS. In shallow
    # mode the frontend has no body to offset against, so we report the raw
    # length for display purposes.
    article_chars = len(echoed) if echoed is not None else len(article_text)

    return AnalyzeResponse(
        source_url=req.url,
        title=title,
        article_chars=article_chars,
        article_text=echoed,
        deep=req.deep,
        analysis=analysis,
    )
