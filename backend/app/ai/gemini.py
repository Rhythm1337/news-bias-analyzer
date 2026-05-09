import logging

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import ValidationError

from app.ai.base import AIProvider, AnalysisResult, reconcile_highlights
from app.config import settings
from app.security.prompt_defense import build_prompt

log = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"
GENERATION_TIMEOUT_SECONDS = 30.0


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("The Gemini API key is not set on the server.")
        self._client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=int(GENERATION_TIMEOUT_SECONDS * 1000)),
        )

    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        system_instruction, user_prompt, sanitized = build_prompt(article_text, deep=deep)
        try:
            response = self._client.models.generate_content(
                model=MODEL_NAME,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=AnalysisResult,
                    temperature=0.2,
                    # Deep mode worst case is around 11k output tokens. Leave
                    # headroom so the response does not get clipped.
                    max_output_tokens=12000,
                ),
            )
        except genai_errors.ClientError as exc:
            code = getattr(exc, "code", None)
            if code == 429:
                raise RuntimeError(
                    "This service is being rate-limited. Please wait a "
                    "minute and try again."
                ) from exc
            if code == 400 and "location is not supported" in str(exc).lower():
                raise RuntimeError(
                    "Gemini does not support this server region. Please redeploy the "
                    "backend in a supported region (US works reliably)."
                ) from exc
            log.warning("Gemini ClientError: %s", exc)
            raise RuntimeError(f"Gemini rejected this request (error {code}). Please try again.") from exc
        except genai_errors.ServerError as exc:
            log.warning("Gemini ServerError: %s", exc)
            raise RuntimeError("The Gemini service is having problems right now. Please try again in a moment.") from exc

        # Capture the finish reason but DO NOT raise on it yet. If Gemini hit
        # MAX_TOKENS or SAFETY but still produced a parseable structured
        # response, we would rather keep the partial result (the post-validator
        # backfills missing pieces) than fail the whole request.
        candidates = getattr(response, "candidates", None) or []
        finish_name: str | None = None
        if candidates:
            finish_reason = getattr(candidates[0], "finish_reason", None)
            finish_name = getattr(finish_reason, "name", str(finish_reason)) if finish_reason else None

        parsed = getattr(response, "parsed", None)
        result: AnalysisResult | None = None
        if isinstance(parsed, AnalysisResult):
            result = parsed
        else:
            text = getattr(response, "text", None) or ""
            if text:
                try:
                    result = AnalysisResult.model_validate_json(text)
                except ValidationError as exc:
                    log.warning("Gemini response failed JSON validation: %s", exc)
                    raise RuntimeError(
                        "The AI returned invalid JSON. Please try again."
                    ) from exc

        if result is None:
            # No structured output AND no parseable text. Now we can surface
            # the finish-reason hint as the user-facing message.
            if finish_name and finish_name not in {"STOP", "FINISH_REASON_STOP"}:
                log.warning("Gemini returned non-STOP finish reason with no usable output: %s", finish_name)
                if "SAFETY" in finish_name:
                    raise RuntimeError("The AI safety filters blocked this content. Please try a different article.")
                if "MAX_TOKENS" in finish_name:
                    raise RuntimeError("The AI response was cut off because the article is too long. Please try a shorter article.")
            raise RuntimeError("The AI returned an empty response. Please try again.")

        # We have a usable result. Log non-STOP finishes as a warning so we
        # can monitor truncation but still serve the partial response.
        if finish_name and finish_name not in {"STOP", "FINISH_REASON_STOP"}:
            log.warning(
                "Gemini returned non-STOP finish reason (%s) but parsed output is usable; serving partial result.",
                finish_name,
            )

        if deep and result.highlights:
            result.highlights = reconcile_highlights(sanitized, result.highlights)
        elif not deep:
            # Drop highlights even if the model returned some.
            result.highlights = []
        return result, sanitized
