from functools import lru_cache

from app.ai.base import AIProvider, AnalysisResult
from app.config import settings


@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    # Pre-validate configuration BEFORE constructing the provider. lru_cache
    # does not cache exceptions, so a constructor that raises gets re-run on
    # every request, which is both slow and noisy in logs. Raise ValueError
    # (not RuntimeError) so the route's broad `except Exception` swallows
    # and logs the message instead of echoing it via the RuntimeError
    # branch, which is reserved for user-safe provider errors.
    name = settings.ai_provider.lower()
    if name == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not set.")
        from app.ai.gemini import GeminiProvider

        return GeminiProvider()
    if name == "openshift":
        if not settings.openshift_ai_inference_url:
            raise ValueError("OPENSHIFT_AI_INFERENCE_URL is not set.")
        from app.ai.openshift_ai import OpenShiftAIProvider

        return OpenShiftAIProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")


__all__ = ["AIProvider", "AnalysisResult", "get_provider"]
