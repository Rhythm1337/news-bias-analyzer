import logging

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.ai.base import AIProvider, AnalysisResult
from app.config import settings
from app.security.prompt_defense import build_prompt

log = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"
GENERATION_TIMEOUT_SECONDS = 30.0


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        self._client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=int(GENERATION_TIMEOUT_SECONDS * 1000)),
        )

    def analyze(self, article_text: str) -> AnalysisResult:
        system_instruction, user_prompt = build_prompt(article_text)
        try:
            response = self._client.models.generate_content(
                model=MODEL_NAME,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=AnalysisResult,
                    temperature=0.2,
                    max_output_tokens=1500,
                ),
            )
        except genai_errors.ClientError as exc:
            code = getattr(exc, "code", None)
            if code == 429:
                raise RuntimeError(
                    "Gemini rate limit hit. Wait about a minute and try again "
                    "(free tier is 10 req/min, 250 req/day)."
                ) from exc
            if code == 400 and "location is not supported" in str(exc).lower():
                raise RuntimeError(
                    "Gemini does not support this server region. Redeploy the "
                    "backend in a supported region (US works reliably)."
                ) from exc
            log.warning("Gemini ClientError: %s", exc)
            raise RuntimeError(f"Gemini rejected the request ({code}).") from exc
        except genai_errors.ServerError as exc:
            log.warning("Gemini ServerError: %s", exc)
            raise RuntimeError("Gemini service is having issues. Try again.") from exc

        candidates = getattr(response, "candidates", None) or []
        if candidates:
            finish_reason = getattr(candidates[0], "finish_reason", None)
            finish_name = getattr(finish_reason, "name", str(finish_reason)) if finish_reason else None
            if finish_name and finish_name not in {"STOP", "FINISH_REASON_STOP"}:
                log.warning("Gemini returned non-STOP finish reason: %s", finish_name)
                if "SAFETY" in (finish_name or ""):
                    raise RuntimeError("Content blocked by AI safety filters.")
                if "MAX_TOKENS" in (finish_name or ""):
                    raise RuntimeError("AI response was truncated; try a shorter article.")

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, AnalysisResult):
            return parsed

        text = getattr(response, "text", None) or ""
        if not text:
            raise RuntimeError("AI returned an empty response.")
        return AnalysisResult.model_validate_json(text)
