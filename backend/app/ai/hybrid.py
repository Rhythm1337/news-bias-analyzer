"""Hybrid AI Provider: Combines local NLP with Gemini.

Uses local NLP (spaCy + HuggingFace transformers) for deterministic entity
extraction, sentiment, paragraph sentiment trajectory, emotional intensity,
and citation/numerical stats, while leveraging Gemini for complex reasoning,
political bias framing, summary, verdict, and highlight annotations.
"""

from __future__ import annotations

import logging
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import ValidationError

from app.ai.base import AIProvider, AnalysisResult, reconcile_highlights
from app.ai.nlp_pipeline import (
    analyze_emotion,
    analyze_sentiment,
    analyze_sentiment_series,
    compute_text_stats,
    extract_entities,
)
from app.config import settings
from app.security.prompt_defense import build_prompt

log = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"
GENERATION_TIMEOUT_SECONDS = 30.0


class HybridProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set on the server. HybridProvider requires Gemini for synthesis."
            )
        self._client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=int(GENERATION_TIMEOUT_SECONDS * 1000)),
        )

    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        system_instruction, user_prompt, sanitized = build_prompt(article_text, deep=deep)

        # ── 1. Run local NLP pipeline ───────────────────────────────────────
        local_entities = None
        local_sentiment = None
        local_series = None
        local_emotion = None
        text_stats = None

        try:
            local_entities = extract_entities(sanitized)
        except Exception as exc:
            log.warning("Local entity extraction failed; falling back to LLM entities: %s", exc)

        try:
            local_sentiment, _ = analyze_sentiment(sanitized)
            local_series = analyze_sentiment_series(sanitized)
        except Exception as exc:
            log.warning("Local sentiment analysis failed; falling back to LLM sentiment: %s", exc)

        try:
            local_emotion = analyze_emotion(sanitized)
        except Exception as exc:
            log.warning("Local emotion analysis failed; falling back to LLM emotion: %s", exc)

        try:
            text_stats = compute_text_stats(sanitized)
        except Exception as exc:
            log.warning("Local text stats computation failed: %s", exc)

        # ── 2. Run Gemini synthesis ─────────────────────────────────────────
        try:
            response = self._client.models.generate_content(
                model=MODEL_NAME,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=AnalysisResult,
                    temperature=0.2,
                    max_output_tokens=12000,
                ),
            )
        except genai_errors.ClientError as exc:
            code = getattr(exc, "code", None)
            if code == 429:
                raise RuntimeError("Service is rate-limited. Please wait a minute and try again.") from exc
            log.warning("Gemini ClientError in HybridProvider: %s", exc)
            raise RuntimeError(f"AI provider rejected request (error {code}). Please try again.") from exc
        except genai_errors.ServerError as exc:
            log.warning("Gemini ServerError in HybridProvider: %s", exc)
            raise RuntimeError("The AI service is experiencing issues right now. Please try again shortly.") from exc

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
                    raise RuntimeError("AI returned an invalid structured response. Please retry.") from exc

        if result is None:
            raise RuntimeError("AI returned an empty response.")

        # ── 3. Merge local NLP findings into AnalysisResult ─────────────────
        if local_entities:
            result.entities = local_entities

        if local_sentiment:
            result.sentiment = local_sentiment

        if local_series:
            result.sentiment_series = local_series

        if local_emotion:
            emo_label, emo_score = local_emotion
            result.emotional.label = emo_label
            result.emotional.score = emo_score

        if text_stats:
            for sub in result.sub_fact:
                if sub.key == "Citation density":
                    measured_val = min(1.0, round(text_stats["attribution_ratio"] * 2.5, 2))
                    sub.value = measured_val
                    sub.note = (
                        f"{int(text_stats['attribution_ratio'] * 100)}% of sentences cite sources or attribution "
                        f"({text_stats['quote_count']} quotes found)."
                    )
                elif sub.key == "Numerical accuracy":
                    num_density = text_stats["numeric_density"]
                    sub.value = min(1.0, round(num_density * 10.0, 2))
                    sub.note = f"Quantitative density: {num_density:.1%} of terms are numerical metrics."

        # ── 4. Reconcile highlights for deep mode ───────────────────────────
        if deep and result.highlights:
            result.highlights = reconcile_highlights(sanitized, result.highlights)
        elif not deep:
            result.highlights = []

        return result, sanitized
