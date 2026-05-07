from functools import lru_cache

from app.ai.base import AIProvider, AnalysisResult
from app.config import settings


@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    name = settings.ai_provider.lower()
    if name == "gemini":
        from app.ai.gemini import GeminiProvider

        return GeminiProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")


__all__ = ["AIProvider", "AnalysisResult", "get_provider"]
